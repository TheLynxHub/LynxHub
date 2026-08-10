import {createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync} from 'node:fs';
import {join} from 'node:path';

import {APP_BUILD_NUMBER, LYNXHUB_WEBSITE, STATICS_URL} from '@lynx_common/consts';
import {
  AppUpdateData,
  AppUpdateInsiderData,
  NotificationData,
  PatreonSupporter,
  SubscribeStages,
} from '@lynx_common/types';
import {PluginMetadata, PluginVersioning} from '@lynx_common/types/plugins';
import {toMs} from '@lynx_common/utils';
import {decompress} from '@lynxhub/7zip';
import axios from 'axios';

import {AUTH_LOGIN_KEY} from '../monitoring/auth';
import {getTokens} from '../monitoring/token';
import classHolder from './classHolder';
import {getAppDirectory} from './dataFolder';

type PluginAvailableItem = {metadata: PluginMetadata; versioning: PluginVersioning; url: string};

/**
 * Parses numerical version from tag (e.g. "v120" -> 120, "v2" -> 2).
 */
function parseVersionNumber(tag: string): number {
  const num = parseInt(tag.replace(/^v/i, ''), 10);
  return isNaN(num) ? -1 : num;
}

/**
 * Manages static assets and configuration files downloaded from GitHub Releases.
 * Handles 7z extraction, version subfolders (v1, v2, ...), startup pruning, and automatic fallbacks.
 */
export default class StaticsManager {
  private readonly dir: string;
  private requirementsCheckPromise: Promise<void> | null = null;
  private pullIntervalId: NodeJS.Timeout | null = null;
  private cachedNotifications: NotificationData[] | undefined = undefined;
  private lastNotificationFetchTime = 0;
  private lastPullTime = 0;
  private activeVersionCache: string | undefined = undefined;
  private brokenVersions: Set<string> = new Set<string>();

  constructor() {
    this.dir = getAppDirectory('Statics');
  }

  /**
   * Returns true if statics are available (at least one valid extracted version exists)
   */
  public isAvailable(): boolean {
    return this.getActiveVersion() !== undefined;
  }

  /**
   * Checks requirements on app startup:
   * 1. Loads database state for statics.
   * 2. Prunes statics folder, keeping only the 2 latest versions.
   * 3. Selects active version.
   * 4. Downloads latest release if online and missing/outdated.
   */
  public async checkRequirements(): Promise<void> {
    if (this.requirementsCheckPromise) {
      return this.requirementsCheckPromise;
    }

    this.requirementsCheckPromise = (async () => {
      // Create root statics directory if missing
      if (!existsSync(this.dir)) {
        mkdirSync(this.dir, {recursive: true});
      }

      // Load DB state
      const dbData = classHolder.storageManager?.getStaticsData();
      if (dbData?.brokenVersions) {
        this.brokenVersions = new Set(dbData.brokenVersions);
      }

      // Clean up legacy git-cloned files/directories at the root level
      this.cleanupLegacyFiles();

      // Prune old versions on startup (keep only 2 latest)
      this.pruneOldVersions();

      // Resolve active version on disk
      this.activeVersionCache = this.resolveActiveVersion();

      if (classHolder.isOnline) {
        try {
          await this.pull();
          if (!this.pullIntervalId) {
            this.pullIntervalId = setInterval(() => this.pull(), toMs(10, 'minutes'));
          }
        } catch (error) {
          console.warn('StaticsManager: Error during initial pull:', error);
        }
      } else if (!this.activeVersionCache) {
        console.warn('StaticsManager: Offline and no extracted statics version available.');
      }
    })();

    return this.requirementsCheckPromise;
  }

  /**
   * Scans the Statics folder, retains the 2 highest version folders, and deletes all older ones.
   */
  private pruneOldVersions(): void {
    if (!existsSync(this.dir)) return;

    try {
      const entries = readdirSync(this.dir, {withFileTypes: true});
      const versionFolders = entries
        .filter(e => e.isDirectory() && /^v\d+$/i.test(e.name))
        .map(e => e.name)
        .sort((a, b) => parseVersionNumber(a) - parseVersionNumber(b));

      if (versionFolders.length > 2) {
        const toRemove = versionFolders.slice(0, versionFolders.length - 2);
        for (const tag of toRemove) {
          console.log(`StaticsManager: Pruning old statics version ${tag}`);
          this.robustWipe(join(this.dir, tag));
        }
      }
    } catch (err) {
      console.error('StaticsManager: Error pruning old versions:', err);
    }
  }

  /**
   * Cleans up legacy files and directories leftover from git sync (e.g. .git, .github, plugins, .gitignore, root json files).
   */
  private cleanupLegacyFiles(): void {
    if (!existsSync(this.dir)) return;

    try {
      const entries = readdirSync(this.dir, {withFileTypes: true});
      for (const entry of entries) {
        if ((entry.isDirectory() && /^v\d+$/i.test(entry.name)) || entry.name === '.tmp') {
          continue;
        }

        const legacyPath = join(this.dir, entry.name);
        console.log(`StaticsManager: Cleaning up legacy statics item: ${entry.name}`);
        this.robustWipe(legacyPath);
      }
    } catch (err) {
      console.error('StaticsManager: Error cleaning up legacy files:', err);
    }
  }

  /**
   * Scans local statics directory and returns valid extracted version tags sorted descending.
   */
  private getLocalVersions(): string[] {
    if (!existsSync(this.dir)) return [];
    try {
      const entries = readdirSync(this.dir, {withFileTypes: true});
      return entries
        .filter(e => e.isDirectory() && /^v\d+$/i.test(e.name))
        .map(e => e.name)
        .sort((a, b) => parseVersionNumber(b) - parseVersionNumber(a));
    } catch {
      return [];
    }
  }

  /**
   * Resolves the highest non-broken local version.
   */
  private resolveActiveVersion(): string | undefined {
    const versions = this.getLocalVersions();
    for (const tag of versions) {
      if (!this.brokenVersions.has(tag)) {
        return tag;
      }
    }
    return versions.length > 0 ? versions[0] : undefined;
  }

  private getActiveVersion(): string | undefined {
    if (this.activeVersionCache && !this.brokenVersions.has(this.activeVersionCache)) {
      return this.activeVersionCache;
    }
    this.activeVersionCache = this.resolveActiveVersion();
    return this.activeVersionCache;
  }

  /**
   * Returns absolute directory path for the current active statics version.
   */
  private getActiveVersionDir(): string | undefined {
    const version = this.getActiveVersion();
    return version ? join(this.dir, version) : undefined;
  }

  /**
   * Checks GitHub Releases for latest release version tag and downloads asset if newer.
   */
  public async pull(): Promise<void> {
    if (!classHolder.isOnline) return;

    const now = Date.now();
    if (now - this.lastPullTime < toMs(5, 'minutes')) {
      return;
    }
    this.lastPullTime = now;

    try {
      const latestTag = await this.fetchLatestReleaseTag();
      if (!latestTag) {
        console.warn('StaticsManager: Could not resolve latest release tag from GitHub.');
        return;
      }

      const activeTag = this.getActiveVersion();
      const currentVerNum = activeTag ? parseVersionNumber(activeTag) : -1;
      const latestVerNum = parseVersionNumber(latestTag);

      // Save last checked timestamp to DB
      classHolder.storageManager?.updateStaticsData({lastCheckedAt: new Date().toISOString()});

      if (latestVerNum > currentVerNum || !activeTag || !existsSync(join(this.dir, latestTag))) {
        console.log(`StaticsManager: New statics release found (${latestTag}). Downloading...`);
        await this.downloadAndExtractRelease(latestTag);
      }
    } catch (error) {
      console.error('StaticsManager: Failed to pull statics release:', error);
    }
  }

  /**
   * Fetches latest release version tag from GitHub Releases.
   */
  private async fetchLatestReleaseTag(): Promise<string | undefined> {
    // 1. Try redirect on releases/latest page
    try {
      const res = await axios.get(`${STATICS_URL}/releases/latest`, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
        timeout: 10000,
      });
      const location = (res.headers['location'] || res.headers['Location']) as string | undefined;
      if (location) {
        const match = location.match(/\/releases\/tag\/(v\d+)/i);
        if (match) return match[1];
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.headers) {
        const location = (error.response.headers['location'] || error.response.headers['Location']) as
          string | undefined;
        if (location) {
          const match = location.match(/\/releases\/tag\/(v\d+)/i);
          if (match) return match[1];
        }
      }
    }

    // 2. Try redirect on releases/latest/download/statics.7z
    try {
      const res = await axios.head(`${STATICS_URL}/releases/latest/download/statics.7z`, {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400,
        timeout: 10000,
      });
      const location = (res.headers['location'] || res.headers['Location']) as string | undefined;
      if (location) {
        const match = location.match(/\/download\/(v\d+)\//i);
        if (match) return match[1];
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.headers) {
        const location = (error.response.headers['location'] || error.response.headers['Location']) as
          string | undefined;
        if (location) {
          const match = location.match(/\/download\/(v\d+)\//i);
          if (match) return match[1];
        }
      }
    }

    return undefined;
  }

  /**
   * Downloads statics.7z for a given tag into .tmp, extracts it, and moves to target version folder.
   */
  private async downloadAndExtractRelease(tag: string): Promise<void> {
    const downloadUrl = `${STATICS_URL}/releases/download/${tag}/statics.7z`;
    const tmpDir = join(this.dir, '.tmp');
    const tmpArchive = join(tmpDir, 'statics.7z');
    const tmpExtractDir = join(tmpDir, tag);
    const finalDir = join(this.dir, tag);

    try {
      // Prepare clean temp dir
      this.robustWipe(tmpDir);
      mkdirSync(tmpExtractDir, {recursive: true});

      console.log(`StaticsManager: Downloading ${downloadUrl}...`);
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

      console.log(`StaticsManager: Extracting statics archive to ${tmpExtractDir}...`);
      await decompress(tmpArchive, tmpExtractDir);

      // Move extracted folder to final location
      if (existsSync(finalDir)) {
        this.robustWipe(finalDir);
      }
      renameSync(tmpExtractDir, finalDir);
      this.robustWipe(tmpDir);

      // Update active version
      this.activeVersionCache = tag;
      this.brokenVersions.delete(tag);

      // Persist in DB
      classHolder.storageManager?.updateStaticsData({
        activeVersion: tag,
        brokenVersions: Array.from(this.brokenVersions),
      });

      // Run pruning to retain top 2 versions
      this.pruneOldVersions();

      console.log(`StaticsManager: Successfully updated statics to ${tag}`);
    } catch (error) {
      console.error(`StaticsManager: Error downloading/extracting release ${tag}:`, error);
      this.robustWipe(tmpDir);
      throw error;
    }
  }

  public async getReleases(): Promise<AppUpdateData | undefined> {
    return this.getDataAsJson<AppUpdateData>('releases.json');
  }

  public async getInsider(): Promise<AppUpdateInsiderData | undefined> {
    return this.getDataAsJson<AppUpdateInsiderData>('insider.json');
  }

  public async getNotification(): Promise<NotificationData[] | undefined> {
    const now = Date.now();
    if (this.cachedNotifications && now - this.lastNotificationFetchTime < toMs(5, 'minutes')) {
      return this.cachedNotifications;
    }

    try {
      const token = await getTokens(AUTH_LOGIN_KEY);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await axios.get(`${LYNXHUB_WEBSITE}/api/notifications`, {
        headers,
        timeout: 10000,
      });
      if (response.data && response.data.success) {
        this.cachedNotifications = response.data.notifications;
        this.lastNotificationFetchTime = now;
        return this.cachedNotifications;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch notifications from website:', axios.isAxiosError(error) ? error.message : error);
      if (this.cachedNotifications) {
        return this.cachedNotifications;
      }
      return [];
    }
  }

  public async getPatrons(): Promise<PatreonSupporter[]> {
    try {
      const response = await axios.get(`${LYNXHUB_WEBSITE}/api/patrons`, {
        timeout: 10000,
      });
      if (response.data && response.data.success) {
        return response.data.patrons;
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch patrons from website:', axios.isAxiosError(error) ? error.message : error);
      return [];
    }
  }

  public async getPluginMetadataById(pluginId: string): Promise<PluginMetadata | undefined> {
    const metadataPath = join('plugins', pluginId, 'metadata.json');
    return this.getDataAsJson<PluginMetadata>(metadataPath);
  }

  public async getPluginVersioningById(pluginId: string): Promise<PluginVersioning | undefined> {
    const versioningPath = join('plugins', pluginId, 'versioning.json');
    return this.getDataAsJson<PluginVersioning>(versioningPath);
  }

  public async getPluginIdByRepositoryUrl(repositoryUrl: string): Promise<string | undefined> {
    const targetPath = join('plugins', 'plugins_url.json');
    const urlMap = await this.getDataAsJson<Record<string, string>>(targetPath);
    if (!urlMap) return undefined;

    const entry = Object.entries(urlMap).find(([_id, url]) => url === repositoryUrl);

    return entry ? entry[0] : undefined;
  }

  public async getCurrentAppState(): Promise<SubscribeStages> {
    const releases = await this.getReleases();
    const insider = await this.getInsider();

    if (!releases || !insider) return 'public';

    if (APP_BUILD_NUMBER === releases.currentBuild) {
      return 'public';
    } else if (APP_BUILD_NUMBER === releases.earlyAccess.build) {
      return 'early_access';
    } else if (APP_BUILD_NUMBER === insider.currentBuild) {
      return 'insider';
    }

    return 'public';
  }

  public async getPluginsList(): Promise<PluginAvailableItem[]> {
    if (!this.isAvailable()) return [];

    const pluginsUrlPath = join('plugins', 'plugins_url.json');
    const urlMap = await this.getDataAsJson<Record<string, string>>(pluginsUrlPath);
    if (!urlMap) return [];

    const activeDir = this.getActiveVersionDir();
    if (!activeDir) return [];

    const pluginsPath = join(activeDir, 'plugins');
    if (!existsSync(pluginsPath)) {
      return [];
    }

    const pluginIds = readdirSync(pluginsPath, {withFileTypes: true})
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    const pluginPromises = pluginIds.map(async (id): Promise<PluginAvailableItem | null> => {
      const [metadata, versioning] = await Promise.all([
        this.getPluginMetadataById(id),
        this.getPluginVersioningById(id),
      ]);

      if (!metadata || !versioning) return null;

      return {metadata, versioning, url: urlMap[id] || ''};
    });

    const results = await Promise.all(pluginPromises);
    return results.filter((item): item is PluginAvailableItem => item !== null);
  }

  public stop(): void {
    if (this.pullIntervalId) {
      clearInterval(this.pullIntervalId);
      this.pullIntervalId = null;
    }
  }

  /**
   * Safely wipes a directory recursively.
   */
  private robustWipe(targetPath: string): void {
    try {
      if (!existsSync(targetPath)) return;
      rmSync(targetPath, {recursive: true, force: true});
    } catch (error) {
      console.warn(`StaticsManager: Initial deletion of ${targetPath} failed:`, error);
      const tempDirName = `${targetPath}_old_${Date.now()}`;
      try {
        renameSync(targetPath, tempDirName);
        try {
          rmSync(tempDirName, {recursive: true, force: true});
        } catch {
          console.warn(`StaticsManager: Could not delete ${tempDirName} immediately.`);
        }
      } catch (renameError) {
        console.error(`StaticsManager: Failed to rename directory ${targetPath} as fallback:`, renameError);
      }
    }
  }

  /**
   * Helper to read and parse a JSON file from the active statics version.
   * On failure, marks the failing version as broken and falls back to previous available versions.
   */
  private async getDataAsJson<T>(fileName: string): Promise<T | undefined> {
    if (this.requirementsCheckPromise) {
      await this.requirementsCheckPromise;
    }

    const availableVersions = this.getLocalVersions().filter(tag => !this.brokenVersions.has(tag));

    for (const tag of availableVersions) {
      const filePath = join(this.dir, tag, fileName);

      if (!existsSync(filePath)) {
        continue;
      }

      try {
        const fileContent = readFileSync(filePath, 'utf8');
        return JSON.parse(fileContent) as T;
      } catch (error) {
        console.warn(`StaticsManager: Failed to read/parse ${fileName} in statics version ${tag}:`, error);
        // Mark version as broken
        this.brokenVersions.add(tag);
        classHolder.storageManager?.updateStaticsData({
          brokenVersions: Array.from(this.brokenVersions),
        });
        // Continue loop to try next highest valid version
      }
    }

    // If all local versions failed or none exist, attempt emergency download if online
    if (classHolder.isOnline) {
      try {
        const latestTag = await this.fetchLatestReleaseTag();
        if (latestTag && !this.brokenVersions.has(latestTag)) {
          const isLatestExtracted = existsSync(join(this.dir, latestTag));
          if (!isLatestExtracted) {
            await this.downloadAndExtractRelease(latestTag);
            const newPath = join(this.dir, latestTag, fileName);
            if (existsSync(newPath)) {
              const content = readFileSync(newPath, 'utf8');
              return JSON.parse(content) as T;
            }
          }
        }
      } catch (emergencyError) {
        console.error('StaticsManager: Emergency download failed:', emergencyError);
      }
    }

    return undefined;
  }
}
