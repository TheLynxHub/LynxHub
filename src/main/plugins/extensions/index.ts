import path from 'node:path';

import {isDev} from '@lynx_common/utils';
import ElectronAppManager from '@lynx_main/mainWindow';
import classHolder from '@lynx_main/managers/classHolder';
import StorageManager from '@lynx_main/storageSqlite/storageOperations';
import {captureException} from '@sentry/electron/main';
import {app} from 'electron';
import fs from 'graceful-fs';

import ModuleManager from '../modules';
import ExtensionApi from './api';
import {mainIpcApi} from './ipcApi';
import {ElectronMenuItem, ExtensionImport_Main} from './types';
import ExtensionUtils from './utils';

/**
 * Manages the lifecycle and loading of extensions (plugins).
 * Handles importing, initialization, and communication with extensions.
 */
export default class ExtensionManager {
  private readonly extensionUtils: ExtensionUtils;
  private readonly extensionApi: ExtensionApi;

  private storageManager?: StorageManager;
  private appManager?: ElectronAppManager;
  private moduleManager?: ModuleManager;

  constructor() {
    this.extensionUtils = new ExtensionUtils('default');
    this.extensionApi = new ExtensionApi();
  }

  /**
   * Helper to resolve the extension name from its package.json, falling back to folder name.
   */
  private async getExtensionName(rootPath: string): Promise<string> {
    try {
      const pkgPath = path.join(rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const data = await fs.promises.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(data);
        if (pkg.name) return pkg.name;
      }
    } catch (e) {
      console.error('Failed to read extension name from package.json', e);
    }
    return path.basename(rootPath);
  }

  private getDevFolderPath(folderName: string): string {
    const appPath = app.getAppPath();
    let dir = path.resolve(appPath, folderName);
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.resolve(appPath, '..', folderName);
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.resolve(appPath, '../..', folderName);
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    return path.resolve(appPath, '../', folderName);
  }

  /**
   * Imports the development extension if in dev mode.
   * Scans the specific local path for the extension entry point.
   */
  private async importDevExtension(): Promise<void> {
    try {
      const initial: ExtensionImport_Main = await import(
        // @ts-ignore
        /* @vite-ignore */ '../../../../extension/src/main/lynxExtension.ts'
      );
      const devExtensionRoot = this.getDevFolderPath('extension');
      const name = await this.getExtensionName(devExtensionRoot);
      const extensionUtils = new ExtensionUtils(name);

      if (this.storageManager) extensionUtils.setStorageManager(this.storageManager);
      if (this.appManager) extensionUtils.setAppManager(this.appManager);
      if (this.moduleManager) extensionUtils.setModuleManager(this.moduleManager);

      await initial.initialExtension(this.extensionApi.getApi(), extensionUtils, mainIpcApi);
    } catch (e: any) {
      console.log('No dev extension found or failed to load, skipping...', e);
      if (e?.code !== 'MODULE_NOT_FOUND' && e?.code !== 'ERR_MODULE_NOT_FOUND') {
        classHolder.pluginManager?.addUnloadedPlugin('dev-extension', `Dev extension load error: ${e?.message || e}`);
      }
    }
  }

  /**
   * Imports a production extension from the given path.
   * @param extensionPath - The root path of the extension.
   */
  private async importProductionExtension(extensionPath: string): Promise<void> {
    try {
      const fullExtensionPath = path.join(extensionPath, 'scripts', 'main', 'mainEntry.cjs');
      const extensionUrl = `file://${fullExtensionPath}`;
      const initial: ExtensionImport_Main = await import(extensionUrl);

      const name = await this.getExtensionName(extensionPath);
      const extensionUtils = new ExtensionUtils(name);

      if (this.storageManager) extensionUtils.setStorageManager(this.storageManager);
      if (this.appManager) extensionUtils.setAppManager(this.appManager);
      if (this.moduleManager) extensionUtils.setModuleManager(this.moduleManager);

      await initial.initialExtension(this.extensionApi.getApi(), extensionUtils, mainIpcApi);
    } catch (e: any) {
      console.error(`Failed to load extension from ${extensionPath}:`, e);
      captureException(e);
      const folder = path.basename(extensionPath);
      classHolder.pluginManager?.addUnloadedPlugin(folder, `Main load error: ${e?.message || e}`);
    }
  }

  /**
   * Imports and initializes all plugins/extensions.
   * @param extensionFolders - List of folder paths to load extensions from.
   */
  public async importPlugins(extensionFolders: string[]): Promise<void> {
    if (isDev()) {
      await this.importDevExtension();
    } else {
      await Promise.all(extensionFolders.map(folder => this.importProductionExtension(folder)));
    }
  }

  /**
   * Sets the StorageManager instance for extensions to use.
   * @param manager - The StorageManager instance.
   */
  public setStorageManager(manager: StorageManager): void {
    this.storageManager = manager;
    this.extensionUtils.setStorageManager(manager);
  }

  /**
   * Sets the ElectronAppManager instance for extensions to use.
   * @param manager - The ElectronAppManager instance.
   */
  public setAppManager(manager: ElectronAppManager): void {
    this.appManager = manager;
    this.extensionUtils.setAppManager(manager);
  }

  /**
   * Sets the ModuleManager instance for extensions to use.
   * @param manager - The ModuleManager instance.
   */
  public setModuleManager(manager: ModuleManager): void {
    this.moduleManager = manager;
    this.extensionUtils.setModuleManager(manager);
  }

  /**
   * Triggers the `listenForChannels` lifecycle event for all extensions.
   */
  public listenForChannels(): void {
    this.extensionApi.listenForChannels();
  }

  /**
   * Triggers the `onAppReady` lifecycle event for all extensions.
   */
  public async onAppReady(): Promise<void> {
    await this.extensionApi.onAppReady();
  }

  /**
   * Triggers the `onReadyToShow` lifecycle event for all extensions.
   */
  public onReadyToShow(): void {
    this.extensionApi.onReadyToShow();
  }

  /**
   * Retrieves and merges tray items from all extensions.
   * @param staticItems - The initial list of tray items.
   * @returns The combined list of tray items.
   */
  public getTrayItems(staticItems: ElectronMenuItem[]): ElectronMenuItem[] {
    return this.extensionApi.getTrayItems(staticItems);
  }
}
