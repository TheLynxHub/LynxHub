import {createHash} from 'node:crypto';
import {chmodSync, createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';

/**
 * Helper to recursively make files and directories writable on Windows.
 */
function makeWritableRecursive(targetPath: string): void {
  try {
    if (!existsSync(targetPath)) return;
    const stat = statSync(targetPath);
    try {
      chmodSync(targetPath, 0o666);
    } catch {
      // Ignore permission errors on individual items
    }
    if (stat.isDirectory()) {
      const entries = readdirSync(targetPath, {withFileTypes: true});
      for (const entry of entries) {
        makeWritableRecursive(join(targetPath, entry.name));
      }
    }
  } catch {
    // Ignore error during recursive traversal
  }
}

import {LYNXHUB_WEBSITE} from '@lynx_common/consts';
import {SubscribeStages} from '@lynx_common/types';
import {
  PluginAddresses,
  PluginInstalledItem,
  PluginSyncItem,
  UnloadedPlugins,
  ValidatedPlugins,
} from '@lynx_common/types/plugins';
import {getUpdateType} from '@lynx_common/utils/plugins';
import {pluginsIpc} from '@lynx_main/ipc/plugins/plugins';
import classHolder from '@lynx_main/managers/classHolder';
import {getAppDirectory} from '@lynx_main/managers/dataFolder';
import {decompress} from '@lynxhub/7zip';
import {captureException} from '@sentry/electron/main';
import axios from 'axios';
import {constants, promises} from 'graceful-fs';

import {AUTH_LOGIN_KEY} from '../monitoring/auth';
import {getTokens} from '../monitoring/token';
import {pluginFolders} from './constants';
import ExtensionManager from './extensions';
import ModuleManager from './modules';
import {getTargetVersionByAppStage, isSyncRequired} from './utils';

/**
 * Parses numerical version array from tag (e.g. "v0.4.2" -> [0, 4, 2]).
 */
function parseSemver(v: string): number[] {
  const clean = v.replace(/^v/i, '');
  return clean.split('.').map(n => parseInt(n, 10) || 0);
}

/**
 * Compares two version strings (returns > 0 if v1 > v2).
 */
function compareSemver(v1: string, v2: string): number {
  const p1 = parseSemver(v1);
  const p2 = parseSemver(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 !== n2) return n1 - n2;
  }
  return 0;
}

/**
 * Manages the lifecycle of plugins (extensions and modules).
 * Handles 7z installation, 2-version management, updates, and synchronization.
 */
export class PluginManager {
  private addresses: PluginAddresses = [];
  private skipped: UnloadedPlugins[] = [];
  private installed: PluginInstalledItem[] = [];
  private syncAvailable: PluginSyncItem[] = [];

  private readonly pluginPath: string;
  private readonly moduleManager: ModuleManager;
  private readonly extensionManager: ExtensionManager;

  constructor(moduleManager: ModuleManager, extensionManager: ExtensionManager) {
    this.moduleManager = moduleManager;
    this.extensionManager = extensionManager;
    this.pluginPath = getAppDirectory('Plugins');
  }

  /**
   * Initializes the plugin system.
   */
  public async initPlugins(): Promise<void> {
    try {
      await this.loadPlugins();
    } catch (error) {
      console.error('Error initializing plugins:', error);
      captureException(error);
    }
  }

  /**
   * Scans a plugin folder, retains at most 2 highest version subfolders, and deletes older ones.
   */
  private pruneOldVersions(pluginId: string): void {
    const pluginDir = join(this.pluginPath, pluginId);
    if (!existsSync(pluginDir)) return;

    try {
      const entries = readdirSync(pluginDir, {withFileTypes: true});
      const versionFolders = entries
        .filter(e => e.isDirectory() && /^v\d+/i.test(e.name))
        .map(e => e.name)
        .sort((a, b) => compareSemver(a, b));

      if (versionFolders.length > 2) {
        const toRemove = versionFolders.slice(0, versionFolders.length - 2);
        for (const tag of toRemove) {
          console.log(`PluginManager: Pruning old version ${tag} for plugin ${pluginId}`);
          this.robustWipePluginDir(join(pluginDir, tag));
        }
      }
    } catch (err) {
      console.error(`PluginManager: Error pruning old versions for ${pluginId}:`, err);
    }
  }

  /**
   * Cleans up legacy non-7z files/directories leftover from Git sync in a plugin directory,
   * and automatically re-installs clean 7z package.
   */
  private async cleanupLegacyFiles(pluginId: string, urlMap: Record<string, string>): Promise<void> {
    const pluginDir = join(this.pluginPath, pluginId);
    if (!existsSync(pluginDir)) return;

    try {
      const entries = readdirSync(pluginDir, {withFileTypes: true});
      let hasLegacy = false;

      for (const entry of entries) {
        if (entry.name === '.tmp') continue;
        if (entry.isDirectory() && /^v\d+/i.test(entry.name)) continue;

        hasLegacy = true;
        break;
      }

      if (hasLegacy) {
        console.log(
          `PluginManager: Found legacy non-7z files in plugin folder ${pluginId}. Wiping for clean 7z installation...`,
        );
        this.robustWipePluginDir(pluginDir);

        const repoUrl = urlMap[pluginId];
        const targetVersion = await getTargetVersionByAppStage(pluginId);

        if (repoUrl && targetVersion) {
          console.log(`PluginManager: Re-installing plugin ${pluginId} at v${targetVersion} via 7z archive...`);
          const success = await this.downloadAndExtractRelease(pluginId, repoUrl, targetVersion);
          if (success) {
            const currentStorage = classHolder.storageManager?.getData('plugin') || {};
            const activeVersions = {...(currentStorage.activeVersions || {}), [pluginId]: targetVersion};
            await classHolder.storageManager?.setData('plugin', {...currentStorage, activeVersions});
            console.log(`PluginManager: Successfully migrated legacy plugin ${pluginId} to 7z v${targetVersion}`);
          }
        }
      }
    } catch (err) {
      console.error(`PluginManager: Error cleaning up legacy files for ${pluginId}:`, err);
    }
  }

  /**
   * Gets list of local version strings for a plugin sorted descending.
   */
  private getLocalVersions(pluginId: string): string[] {
    const pluginDir = join(this.pluginPath, pluginId);
    if (!existsSync(pluginDir)) return [];
    try {
      const entries = readdirSync(pluginDir, {withFileTypes: true});
      return entries
        .filter(e => e.isDirectory() && /^v\d+/i.test(e.name))
        .map(e => e.name.replace(/^v/i, ''))
        .sort((a, b) => compareSemver(b, a));
    } catch {
      return [];
    }
  }

  /**
   * Resolves the active version string for a plugin.
   */
  private resolveActiveVersion(pluginId: string): string | undefined {
    const pluginStorage = classHolder.storageManager?.getData('plugin');
    const activeMap = pluginStorage?.activeVersions || {};
    const brokenList = pluginStorage?.brokenVersions?.[pluginId] || [];

    const storedActive = activeMap[pluginId];
    if (storedActive && !brokenList.includes(storedActive)) {
      const storedFolder = join(this.pluginPath, pluginId, `v${storedActive}`);
      if (existsSync(storedFolder)) {
        return storedActive;
      }
    }

    const local = this.getLocalVersions(pluginId);
    for (const ver of local) {
      if (!brokenList.includes(ver)) {
        return ver;
      }
    }
    return local.length > 0 ? local[0] : undefined;
  }

  /**
   * Loads installed plugins from the disk.
   */
  private async loadPlugins(): Promise<void> {
    const {staticManager} = classHolder;
    try {
      try {
        await promises.access(this.pluginPath, constants.F_OK);
      } catch {
        await promises.mkdir(this.pluginPath, {recursive: true});
        return;
      }

      const files = readdirSync(this.pluginPath, {withFileTypes: true});
      const folders = files
        .filter(file => file.isDirectory() && !file.name.includes('_old_') && !file.name.startsWith('.'))
        .map(folder => folder.name);

      // Clean up any leftover _old_ temporary folders
      const oldFolders = files
        .filter(file => file.isDirectory() && file.name.includes('_old_'))
        .map(folder => folder.name);
      for (const oldFolder of oldFolders) {
        this.robustWipePluginDir(join(this.pluginPath, oldFolder));
      }

      const pluginsUrlPath = join('plugins', 'plugins_url.json');
      const urlMap = (await staticManager?.getDataAsJson<Record<string, string>>(pluginsUrlPath)) || {};

      // Perform legacy cleanup and version pruning on each plugin directory
      for (const folder of folders) {
        await this.cleanupLegacyFiles(folder, urlMap);
        this.pruneOldVersions(folder);
      }

      await this.setInstalledPlugins(folders);

      if (classHolder.cliArgs.unloadPlugins) {
        console.log('PluginManager: --unload-plugins active. Skipping plugin loading and execution.');
        return;
      }

      const validFolders = await this.validatePluginFolders(folders);

      this.addresses = validFolders.map(({folder, type}) => ({
        address: `lynxplugin://${folder}`,
        type,
      }));

      const moduleFolders: string[] = [];
      const extensionFolder: string[] = [];

      for (const validItem of validFolders) {
        const metadata = await staticManager?.getPluginMetadataById(validItem.folder);
        if (!metadata) continue;

        const activeDir = this.getDirById(validItem.folder);
        if (!activeDir) continue;

        if (metadata.type === 'module') {
          moduleFolders.push(activeDir);
        } else if (metadata.type === 'extension') {
          extensionFolder.push(activeDir);
        }
      }
      await this.extensionManager.importPlugins(extensionFolder);
      await this.moduleManager.importPlugins(moduleFolders);

      this.addresses = this.addresses.filter(addr => {
        const folder = addr.address.replace('lynxplugin://', '');
        return !this.skipped.some(skip => skip.id === folder);
      });
    } catch (error: any) {
      console.error(`Loading Plugin Error: `, error);
      captureException(error);
    }
  }

  /**
   * Identifies installed plugins and populates the installed list.
   * @param folders - List of plugin folders.
   */
  private async setInstalledPlugins(folders: string[]) {
    const {staticManager} = classHolder;
    const pluginsUrlPath = join('plugins', 'plugins_url.json');
    const urlMap = (await staticManager?.getDataAsJson<Record<string, string>>(pluginsUrlPath)) || {};

    for (const folder of folders) {
      try {
        const activeVersion = this.resolveActiveVersion(folder);
        const remoteUrl = urlMap[folder];

        if (!activeVersion || !remoteUrl) continue;

        this.installed.push({id: folder, url: remoteUrl, version: activeVersion});
      } catch (error) {
        console.error(`Error parsing ${folder}: ${error}`);
      }
    }
  }

  /**
   * Gets the list of plugin addresses.
   */
  public getAddresses(): PluginAddresses {
    return this.addresses;
  }

  /**
   * Gets the list of unloaded plugins.
   */
  public getUnloadedList(): UnloadedPlugins[] {
    return this.skipped;
  }

  /**
   * Adds a plugin to the list of unloaded/skipped plugins.
   */
  public addUnloadedPlugin(id: string, message: string): void {
    if (!this.skipped.some(item => item.id === id)) {
      this.skipped.push({id, message});
    }
  }

  /**
   * Gets the list of installed plugins.
   */
  public getInstalledList(): PluginInstalledItem[] {
    return this.installed;
  }

  /**
   * Gets the active directory path for a specific plugin ID (e.g. AppData/Plugins/custom_actions/v0.4.2).
   * @param id - The plugin ID.
   * @returns The directory path or undefined if not found.
   */
  public getDirById(id: string): string | undefined {
    const activeVer = this.resolveActiveVersion(id);
    if (!activeVer) return undefined;

    const targetPath = join(this.pluginPath, id, `v${activeVer}`);
    if (existsSync(targetPath)) {
      return targetPath;
    }
    return undefined;
  }

  /**
   * Safely deletes a plugin directory.
   */
  private robustWipePluginDir(dir: string): void {
    if (!existsSync(dir)) return;
    makeWritableRecursive(dir);
    try {
      rmSync(dir, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
    } catch (error) {
      console.warn(`PluginManager: Initial deletion of directory ${dir} failed (possibly locked files):`, error);
      const tempDirName = `${dir}_old_${Date.now()}`;
      try {
        renameSync(dir, tempDirName);
        console.log(`PluginManager: Successfully renamed locked directory ${dir} to ${tempDirName}`);
        makeWritableRecursive(tempDirName);
        try {
          rmSync(tempDirName, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
        } catch {
          console.warn(
            `PluginManager: Could not delete renamed directory ${tempDirName} immediately, left for OS cleanup.`,
          );
        }
      } catch (renameError) {
        console.error(`PluginManager: Failed to rename directory ${dir} as fallback:`, renameError);
        throw error;
      }
    }
  }

  /**
   * Downloads .7z release package for a plugin version and extracts it into v<version> folder.
   */
  private async downloadAndExtractRelease(pluginId: string, repoUrl: string, version: string): Promise<boolean> {
    const cleanRepoUrl = repoUrl.replace(/\/$/, '');
    const cleanVer = version.replace(/^v/i, '');
    const tag = `v${cleanVer}`;
    const downloadUrl = `${cleanRepoUrl}/releases/download/${tag}/${cleanVer}.7z`;

    const pluginDir = join(this.pluginPath, pluginId);
    const tmpDir = join(pluginDir, '.tmp');
    const tmpArchive = join(tmpDir, `${cleanVer}.7z`);
    const tmpExtractDir = join(tmpDir, `v${cleanVer}`);
    const finalDir = join(pluginDir, `v${cleanVer}`);

    try {
      this.robustWipePluginDir(tmpDir);
      mkdirSync(tmpExtractDir, {recursive: true});

      console.log(`PluginManager: Downloading ${downloadUrl}...`);
      const response = await axios({
        method: 'get',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 60000,
      });

      await new Promise<void>((resolve, reject) => {
        const writer = createWriteStream(tmpArchive);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`PluginManager: Extracting plugin archive to ${tmpExtractDir}...`);
      await decompress(tmpArchive, tmpExtractDir);

      if (existsSync(finalDir)) {
        this.robustWipePluginDir(finalDir);
      }
      renameSync(tmpExtractDir, finalDir);
      this.robustWipePluginDir(tmpDir);

      // Save active version in storage
      const pluginStorage = classHolder.storageManager?.getData('plugin') || {migrated: true, disabledCards: []};
      const activeVersions = {...(pluginStorage.activeVersions || {}), [pluginId]: cleanVer};
      classHolder.storageManager?.updateData('plugin', {activeVersions});

      this.pruneOldVersions(pluginId);
      console.log(`PluginManager: Successfully installed/updated plugin ${pluginId} to version ${cleanVer}`);
      return true;
    } catch (error) {
      console.error(`PluginManager: Error downloading/extracting plugin ${pluginId} version ${cleanVer}:`, error);
      this.robustWipePluginDir(tmpDir);
      return false;
    }
  }

  /**
   * Installs a plugin from a URL.
   * @param url - The repository URL.
   * @param targetVersion - Optional version string.
   * @returns True if installation succeeded, false otherwise.
   */
  public async install(url: string, targetVersion?: string): Promise<boolean> {
    const {staticManager} = classHolder;
    const id = await staticManager?.getPluginIdByRepositoryUrl(url);
    if (!id) return false;

    const versionToInstall = targetVersion || (await getTargetVersionByAppStage(id));
    if (!versionToInstall) return false;

    try {
      const success = await this.downloadAndExtractRelease(id, url, versionToInstall);
      if (!success) return false;

      this.installed = this.installed.filter(p => p.id !== id);
      this.installed.push({id, url, version: versionToInstall});

      void trackDownload(id);
      return true;
    } catch (e) {
      console.warn(`Failed to install plugin: ${url}`, e);
      return false;
    }
  }

  /**
   * Uninstalls a plugin by ID.
   * @param id - The plugin ID.
   * @returns True if uninstallation succeeded, false otherwise.
   */
  public async uninstall(id: string): Promise<boolean> {
    const pluginDir = join(this.pluginPath, id);
    try {
      this.robustWipePluginDir(pluginDir);
      this.syncList_remove(id);
      this.installed = this.installed.filter(plugin => plugin.id !== id);

      const pluginStorage = classHolder.storageManager?.getData('plugin');
      if (pluginStorage?.activeVersions) {
        const activeVersions = {...pluginStorage.activeVersions};
        delete activeVersions[id];
        classHolder.storageManager?.updateData('plugin', {activeVersions});
      }

      return true;
    } catch (e) {
      console.warn(`Failed to uninstall ${id}: `, e);
      return false;
    }
  }

  /**
   * Checks if a specific plugin requires synchronization.
   * @param id - The plugin ID.
   * @param stage - The subscription stage.
   * @returns True if sync is required (and added to list), false otherwise.
   */
  private async checkSinglePluginSync(id: string, stage: SubscribeStages): Promise<boolean> {
    try {
      const activeVer = this.resolveActiveVersion(id);
      if (!activeVer) return false;

      const targetItem = await isSyncRequired(id, activeVer, stage);
      if (!targetItem) {
        this.syncList_remove(id);
        return false;
      }

      this.addToSyncList(targetItem);
      return true;
    } catch (e) {
      console.warn(`Failed to check for updates for plugin ${id}: `, e);
      return false;
    }
  }

  /**
   * Checks for synchronization updates for all installed plugins.
   * @param stage - The subscription stage.
   */
  public async checkForSync(stage: SubscribeStages): Promise<void> {
    try {
      for (const plugin of this.installed) {
        await this.checkSinglePluginSync(plugin.id, stage);
      }
    } catch (error) {
      console.error('Error checking for all updates:', error);
    }
  }

  /**
   * Syncs a plugin to a specific version string.
   * @param id - The plugin ID.
   * @param version - The target version string.
   * @returns True if successful, false otherwise.
   */
  public async syncItem(id: string, version: string): Promise<boolean> {
    const installedItem = this.installed.find(p => p.id === id);
    const {staticManager} = classHolder;
    const pluginsUrlPath = join('plugins', 'plugins_url.json');
    const urlMap = (await staticManager?.getDataAsJson<Record<string, string>>(pluginsUrlPath)) || {};
    const url = installedItem?.url || urlMap[id];

    if (!url) return false;

    try {
      const cleanVer = version.replace(/^v/i, '');
      const localPath = join(this.pluginPath, id, `v${cleanVer}`);

      if (existsSync(localPath)) {
        const pluginStorage = classHolder.storageManager?.getData('plugin') || {migrated: true, disabledCards: []};
        const activeVersions = {...(pluginStorage.activeVersions || {}), [id]: cleanVer};
        classHolder.storageManager?.updateData('plugin', {activeVersions});
      } else {
        const success = await this.downloadAndExtractRelease(id, url, cleanVer);
        if (!success) return false;
      }

      this.installed = this.installed.filter(p => p.id !== id);
      this.installed.push({id, url, version: cleanVer});

      this.syncList_remove(id);
      return true;
    } catch (e) {
      console.error(`Failed to sync item ${id} to version ${version}:`, e);
      return false;
    }
  }

  /**
   * Updates a sync item with a new version.
   * @param id - The plugin ID.
   * @param version - The target version.
   */
  public async updateSyncItem(id: string, version: string) {
    const {staticManager} = classHolder;
    const versioning = await staticManager?.getPluginVersioningById(id);
    if (!versioning) return;

    const currentVersion = this.resolveActiveVersion(id);
    if (!currentVersion) return;

    const type = getUpdateType(versioning.versions, currentVersion, version);
    if (!type) return;

    if (currentVersion === version) {
      this.syncList_remove(id);
      return;
    }

    const target: PluginSyncItem = {id, version, type};
    this.addToSyncList(target);
  }

  /**
   * Syncs multiple items.
   * @param items - List of items to sync.
   * @returns List of synced IDs.
   */
  public async syncAll(items: {id: string; version: string; commit?: string}[]): Promise<string[]> {
    const synced: string[] = [];

    try {
      for (const item of items) {
        const {id, version, commit} = item;
        const targetVersion = version || commit || '';
        if (!targetVersion) continue;

        const success = await this.syncItem(id, targetVersion);
        if (success) synced.push(id);
      }
      return synced;
    } catch (e) {
      console.warn(`Failed to update plugins: ${e}`);
    }

    return [];
  }

  private syncList_noticeRenderer() {
    pluginsIpc.send.onSyncAvailable(this.syncAvailable);
  }

  private syncList_remove(id: string) {
    this.syncAvailable = this.syncAvailable.filter(update => update.id !== id);
    this.syncList_noticeRenderer();
  }

  private addToSyncList(item: PluginSyncItem) {
    let exist: boolean = false;

    this.syncAvailable = this.syncAvailable.map(syncItem => {
      if (syncItem.id === item.id) {
        exist = true;
        return item;
      }
      return syncItem;
    });

    if (!exist) this.syncAvailable.push(item);

    this.syncList_noticeRenderer();
  }

  /**
   * Validates plugin folders to ensure they have the required structure.
   * @param folderPaths - List of folder names.
   * @returns List of validated plugins.
   */
  private async validatePluginFolders(folderPaths: string[]): Promise<ValidatedPlugins> {
    const {staticManager} = classHolder;
    const validatedFolders: ValidatedPlugins = [];

    for (const folder of folderPaths) {
      if (folder.startsWith('.')) {
        this.skipped.push({
          id: folder,
          message: "Unloaded because folder starts with '.'.",
        });
      } else {
        const dir = this.getDirById(folder);
        if (!dir) {
          this.skipped.push({
            id: folder,
            message: 'Unloaded because active version directory was not found.',
          });
          continue;
        }

        const scriptsFolder = join(dir, 'scripts');
        const metadata = await staticManager?.getPluginMetadataById(folder);

        if (!metadata) {
          this.skipped.push({
            id: folder,
            message: 'Unloaded because metadata could not be retrieved.',
          });
          continue;
        }

        const {type} = metadata;

        const targetMainPath = type === 'module' ? pluginFolders.module.mainScript : pluginFolders.extension.mainScript;
        const targetRendererPath =
          type === 'module' ? pluginFolders.module.rendererScript : pluginFolders.extension.rendererScript;

        try {
          await promises.access(scriptsFolder, constants.F_OK);

          await Promise.all([
            promises.access(join(dir, targetMainPath), constants.F_OK),
            promises.access(join(dir, targetRendererPath), constants.F_OK),
          ]);

          validatedFolders.push({type, folder});
        } catch (err) {
          this.skipped.push({
            id: folder,
            message: 'Unloaded due to incompatible structure.',
          });
        }
      }
    }

    return validatedFolders;
  }

  /**
   * Migrates old plugin installations to the new structure.
   */
  public async migrate() {
    const {staticManager} = classHolder;
    const targetModuleDir = join(dirname(this.pluginPath), pluginFolders.module.oldFolder);
    const targetExtensionDir = join(dirname(this.pluginPath), pluginFolders.extension.oldFolder);

    const oldInstallations: string[] = [];

    const scanOldFolder = async (folder: string) => {
      try {
        const entries = await promises.readdir(folder, {withFileTypes: true});
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pluginsUrlPath = join('plugins', 'plugins_url.json');
            const urlMap = (await staticManager?.getDataAsJson<Record<string, string>>(pluginsUrlPath)) || {};
            if (urlMap[entry.name]) {
              oldInstallations.push(urlMap[entry.name]);
            }
          }
        }
        await promises.rm(folder, {recursive: true, force: true});
      } catch (e) {
        // Ignore if folder doesn't exist
      }
    };

    await scanOldFolder(targetModuleDir);
    await scanOldFolder(targetExtensionDir);

    for (const url of oldInstallations) {
      const id = await staticManager?.getPluginIdByRepositoryUrl(url);
      if (!id) continue;

      const targetVer = await getTargetVersionByAppStage(id);
      if (targetVer) {
        await this.install(url, targetVer);
      }
    }
  }
}

/**
 * Solves the Proof of Work challenge.
 */
function solveChallengeNode(challenge: string, difficulty: number): string {
  const prefix = '0'.repeat(difficulty);
  let nonce = 0;
  while (true) {
    const hash = createHash('sha256').update(`${challenge}${nonce}`).digest('hex');
    if (hash.startsWith(prefix)) {
      return nonce.toString();
    }
    nonce++;
  }
}

/**
 * Sends a plugin download count increment tracking request.
 */
async function trackDownload(pluginId: string): Promise<void> {
  try {
    const token = await getTokens(AUTH_LOGIN_KEY);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const url = `${LYNXHUB_WEBSITE}/api/plugins/download`;
      const response = await axios.post(url, {pluginId}, {headers, timeout: 5000});
      if (response.status === 200) {
        return;
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        const challengeUrl = `${LYNXHUB_WEBSITE}/api/plugins/download/challenge`;
        const challengeRes = await axios.get(challengeUrl, {timeout: 5000});
        const {challenge, difficulty} = challengeRes.data;

        const nonce = solveChallengeNode(challenge, difficulty);

        const verifyUrl = `${LYNXHUB_WEBSITE}/api/plugins/download`;
        await axios.post(
          verifyUrl,
          {pluginId, challenge, nonce},
          {headers: {'Content-Type': 'application/json'}, timeout: 5000},
        );
      } else {
        console.warn(`Failed tracking plugin download: ${err.message}`);
      }
    }
  } catch (error: any) {
    console.warn(`Failed tracking plugin download: ${error.message}`);
  }
}
