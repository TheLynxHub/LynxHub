import {randomUUID} from 'node:crypto';
import {join} from 'node:path';

import {is} from '@electron-toolkit/utils';
import {APP_NAME} from '@lynx_common/consts';
import {Get_Default_Hotkeys} from '@lynx_common/consts/hotkeys';
import AppStorageData, {BrowserStorage} from '@lynx_common/types/storage';
import {applicationIpc} from '@lynx_main/ipc/application';
import {changeWindowState} from '@lynx_main/ipc/methods/windowUtils';
import classHolder from '@lynx_main/managers/classHolder';
import {getAbsolutePath, getExePath, getUserAgent, isPortable} from '@lynx_main/utils';
import {app} from 'electron';
import fs from 'graceful-fs';
import {cloneDeep} from 'lodash-es';
import {LowSync} from 'lowdb';
import {JSONFileSyncPreset} from 'lowdb/node';

import {StorageMigrationManager} from './migrations';

/**
 * Base storage class handling low-level storage operations, migrations, and data persistence.
 * Uses `lowdb` for JSON file storage.
 */
class BaseStorage {
  private readonly storage: LowSync<AppStorageData>;
  private readonly browserStorage: LowSync<BrowserStorage>;
  private readonly migrationManager: StorageMigrationManager;

  private readonly DEFAULT_DATA: AppStorageData = {
    storage: {version: 1.3},
    cards: {
      installedCards: [],
      autoUpdateCards: [],
      pinnedCards: [],
      recentlyUsedCards: [],
      autoUpdateExtensions: [],
      zoomFactor: 1,
      duplicated: [],
      checkUpdateInterval: 30,
      cardTerminalPreCommands: [],
    },
    cardsConfig: {
      preCommands: [],
      customRun: [],
      preOpen: [],
      args: [],
      customRunBehavior: [],
      customArgs: {
        global: [],
        perCard: [],
      },
    },
    app: {
      closeConfirm: true,
      closeTabConfirm: true,
      terminateAIConfirm: true,
      exitSignalConfirm: false,
      forceReloadConfirm: true,
      openLastSize: false,
      homeCategory: ['All', 'Pin'],
      darkMode: 'dark',
      taskbarStatus: 'taskbar-tray',
      tooltipStatus: 'essential',
      systemStartup: false,
      startMinimized: false,
      startMaximized: false,
      startupLastActivePage: false,
      lastPage: '/homePage',
      sessionRestore: {
        startupBehavior: 'home',
        restoreOnCrash: 'ask',
        restoreBrowserTabs: true,
        restoreTerminalTabs: true,
        restoreAiCardTabs: true,
        restoreStaticPages: true,
        restorePinnedTabsOnly: false,
        maxClosedTabsHistory: 25,
      },
      dynamicAppTitle: true,
      openLinkExternal: false,
      hotkeys: Get_Default_Hotkeys(),
      initialized: false,
      inited: false,
      appDataDir: isPortable() ? `./${APP_NAME}_Data` : join(app.getPath('documents'), APP_NAME),
      lastSize: undefined,
      hardwareAcceleration: true,
      disableLoadingAnimations: false,
      collectErrors: true,
      addBreadcrumbs: true,
      sentryDsn: '',
      anonymousId: '',
      activeDays: [],
      totalUsageTime: 0,
      hasSeenUpgradePromo: false,
      hasSeenStarPromo: false,
      hasStarredRepo: false,
      lastPromoShownActiveDaysCount: undefined,
      imageCacheIntervalDays: 30,
      imageCacheMaxSize: 536870912,
    },
    terminal: {
      outputColor: false,
      useConpty: 'auto',
      scrollBack: 1000,
      fontSize: 14,
      cursorStyle: 'bar',
      cursorInactiveStyle: 'none',
      blinkCursor: true,
      resizeDelay: 77,
      fontLoadTimeout: 3000,
      closeTabOnExit: true,
      enableLigatures: true,
      cdHistory: [],
      quickCommands: [],
      sendYWithExit: false,
      openLinkNewTab: false,
      autoExitSignalBeforeKill: false,
    },
    browser: {
      recentAddress: [],
      userAgent: 'lynxhub',
      customUserAgent: getUserAgent('lynxhub'),
      favoriteAddress: [],
      historyAddress: [],
      favIcons: [],
      bookmarksBarVisibility: 'always',
      bookmarkNewTabBehavior: 'browser',
      loadingSkeleton: true,
      downloadLocation: join(app.getPath('downloads'), APP_NAME),
      downloadBehavior: 'default',
      clearedDownloads: [],
      volumeSettings: {
        globalMuted: false,
        tabVolumes: {},
      },
      historyLimits: {
        recentAddress: 100,
        historyAddress: 1000,
        favoriteAddress: 500,
        favIcons: 100,
      },
    },
    notification: {
      readNotifs: [],
    },
    plugin: {migrated: true, disabledCards: []},
    performance: {
      forceColorProfile: 'default',
      highDpiSupport: false,
      autoplayPolicy: 'default',
      enableAcceleratedVideoDecode: true,
      jsMaxOldSpaceSize: 4096,
      ignoreGpuBlocklist: false,
      diskCacheSize: 0,
      enableWebAssemblySimd: true,
      forceHighPerformanceGpu: false,
      disableGpuVsync: false,
      disableFrameRateLimit: false,
      enableGpuRasterization: true,
      enableZeroCopy: true,
      enableParallelDownloading: false,
      enableSkiaGraphite: false,
    },
    quickWeb: {
      enabled: true,
      items: [],
      activeItemId: undefined,
      globalHotkey: {
        name: 'quickWeb',
        key: 'w',
        alt: true,
        control: false,
        shift: false,
        meta: false,
      },
      globalHotkeyEnabled: true,
      keepAliveOnClose: true,
      hideOnBlur: false,
      alwaysOnTop: false,
      sessionType: 'default',
      windowBounds: undefined,
    },
  };

  constructor() {
    // Determine storage file names based on environment
    const storageFile = is.dev ? `${APP_NAME}-Dev.config` : `${APP_NAME}.config`;
    const browserStorageFile = is.dev ? `${APP_NAME}-Browser-Dev.config` : `${APP_NAME}-Browser.config`;
    let storagePath = join(app.getPath('userData'), storageFile);
    let browserStoragePath = join(app.getPath('userData'), browserStorageFile);

    // Handle portable mode: store data next to executable
    if (isPortable()) {
      storagePath = join(getExePath(), `${APP_NAME}_Data`, storageFile);
      browserStoragePath = join(getExePath(), `${APP_NAME}_Data`, browserStorageFile);
      const dataFolderPath = join(getExePath(), `${APP_NAME}_Data`);

      // Ensure data folder exists
      if (!fs.existsSync(dataFolderPath)) {
        try {
          fs.mkdirSync(dataFolderPath, {recursive: true});
          console.log(`Created data folder: ${dataFolderPath}`);
        } catch (error) {
          console.error(`Error creating data folder: ${dataFolderPath}`, error);
          throw error;
        }
      } else {
        console.log(`Data folder already exists: ${dataFolderPath}`);
      }
    }

    // Initialize main storage without writing browser key on default creation
    const mainDefaultData = cloneDeep(this.DEFAULT_DATA);
    delete (mainDefaultData as any).browser;

    this.storage = JSONFileSyncPreset<AppStorageData>(storagePath, mainDefaultData);
    this.storage.read();

    // Initialize browser storage
    this.browserStorage = JSONFileSyncPreset<BrowserStorage>(browserStoragePath, this.DEFAULT_DATA.browser);
    this.browserStorage.read();

    // Migrate existing browser data from main configuration file to browser configuration file
    if (this.storage.data && 'browser' in this.storage.data && (this.storage.data as any).browser) {
      console.log('Migrating browser data to separate configuration file...');
      this.browserStorage.data = {
        ...this.browserStorage.data,
        ...(this.storage.data as any).browser,
      };
      this.writeBrowser();
      delete (this.storage.data as any).browser;
      this.storage.write();
      console.log('Browser data migrated and removed from main config file.');
    }

    // Define interceptor on this.storage.data to virtualize the 'browser' key
    let currentData = this.storage.data;
    const defineBrowserProperty = (obj: any) => {
      if (obj && !Object.prototype.hasOwnProperty.call(obj, 'browser')) {
        Object.defineProperty(obj, 'browser', {
          get: () => this.browserStorage.data,
          set: value => {
            this.browserStorage.data = value;
            this.writeBrowser();
          },
          configurable: true,
          enumerable: false,
        });
      }
    };

    defineBrowserProperty(currentData);

    Object.defineProperty(this.storage, 'data', {
      get: () => currentData,
      set: value => {
        currentData = value;
        defineBrowserProperty(currentData);
      },
      configurable: true,
      enumerable: true,
    });

    this.migrationManager = new StorageMigrationManager(this.storage, this.DEFAULT_DATA, () => this.write());
    this.migrationManager.runStorageMigrations(this.DEFAULT_DATA.storage.version);

    // Initialize anonymousId if empty
    if (!this.storage.data.app.anonymousId) {
      this.storage.data.app.anonymousId = randomUUID();
      this.write();
    }
  }

  /**
   * Performs deferred migrations that require the app to be fully ready.
   * Example: Encryption which depends on safeStorage availability.
   */
  public completeDeferredMigrations(): void {
    this.migrationManager.completeDeferredMigrations();
  }

  /**
   * Retrieves data from storage by key.
   * @param key - The key of the data to retrieve
   */
  public getData<K extends keyof AppStorageData>(key: K): AppStorageData[K] {
    return this.storage.data[key];
  }

  public static readonly extensionStorages = new Map<string, any>();
  public static readonly keyToExtensionMap = new Map<string, string>();
  public static readonly moduleStorages = new Map<string, any>();
  public static readonly cardToModuleMap = new Map<string, string>();

  private getModuleStorage(moduleName: string): any {
    let db = BaseStorage.moduleStorages.get(moduleName);
    if (!db) {
      const isDevMode = is.dev;
      const moduleStorageFile = isDevMode ? `${moduleName}-Dev.config` : `${moduleName}.config`;
      const moduleStoragePath = isPortable()
        ? join(getExePath(), `${APP_NAME}_Data`, moduleStorageFile)
        : join(app.getPath('userData'), moduleStorageFile);

      db = JSONFileSyncPreset<Record<string, any>>(moduleStoragePath, {});
      db.read();
      BaseStorage.moduleStorages.set(moduleName, db);
    }
    return db;
  }

  private getModuleNameForKey(id: string): string | undefined {
    const normId = id.toLowerCase();
    for (const [cardId, moduleName] of BaseStorage.cardToModuleMap.entries()) {
      const normCardId = cardId.toLowerCase();
      const baseCardId = normCardId.replace(/_(tg|sd|ag|id)$/, '');

      if (
        normId === normCardId ||
        normId === baseCardId ||
        normId.startsWith(`${normCardId}_`) ||
        normId.startsWith(`${normCardId}-`) ||
        normId.startsWith(`${baseCardId}_`) ||
        normId.startsWith(`${baseCardId}-`) ||
        normId.endsWith(`_${normCardId}`) ||
        normId.endsWith(`-${normCardId}`) ||
        normId.endsWith(`_${baseCardId}`) ||
        normId.endsWith(`-${baseCardId}`)
      ) {
        return moduleName;
      }

      if (baseCardId.length >= 3) {
        const parts = normId.split(/[-_]/);
        const lastPart = parts[parts.length - 1];
        const firstPart = parts[0];
        if (
          (lastPart && lastPart.length >= 3 && (baseCardId.startsWith(lastPart) || lastPart.startsWith(baseCardId))) ||
          (firstPart && firstPart.length >= 3 && (baseCardId.startsWith(firstPart) || firstPart.startsWith(baseCardId)))
        ) {
          return moduleName;
        }
      }
    }
    return undefined;
  }

  /**
   * Retrieves custom data by ID.
   * @param id - The ID of the custom data
   */
  public getCustomData(id: string): any {
    if (id.includes('::')) {
      const parts = id.split('::');
      let moduleName = parts[0];
      const actualId = parts[1];
      const mappedModuleName = BaseStorage.cardToModuleMap.get(moduleName);
      if (mappedModuleName) {
        moduleName = mappedModuleName;
      }
      const db = this.getModuleStorage(moduleName);
      if (db.data[actualId] === undefined) {
        // Migrate from main storage
        const mainData = this.storage.data[actualId];
        if (mainData !== undefined) {
          console.log(
            `Migrating module data for key '${actualId}' of module ` + `'${moduleName}' to dedicated config file...`,
          );
          db.data[actualId] = mainData;
          db.write();
          delete this.storage.data[actualId];
          this.write();
        }
      }
      return db.data[actualId];
    }

    const foundModuleName = this.getModuleNameForKey(id);
    if (foundModuleName) {
      const db = this.getModuleStorage(foundModuleName);
      if (db.data[id] === undefined) {
        // Migrate from main storage
        const mainData = this.storage.data[id];
        if (mainData !== undefined) {
          console.log(
            `Migrating module data for key '${id}' of module ` + `'${foundModuleName}' to dedicated config file...`,
          );
          db.data[id] = mainData;
          db.write();
          delete this.storage.data[id];
          this.write();
        }
      }
      return db.data[id];
    }

    const extensionName = BaseStorage.keyToExtensionMap.get(id);
    if (extensionName) {
      const extStorage = BaseStorage.extensionStorages.get(extensionName);
      if (extStorage) {
        return extStorage.data[id];
      }
    }
    for (const [extName, extStorage] of BaseStorage.extensionStorages.entries()) {
      if (extStorage.data && id in extStorage.data) {
        BaseStorage.keyToExtensionMap.set(id, extName);
        return extStorage.data[id];
      }
    }
    for (const modStorage of BaseStorage.moduleStorages.values()) {
      if (modStorage.data && id in modStorage.data) {
        return modStorage.data[id];
      }
    }
    return this.storage.data[id];
  }

  /**
   * Sets custom data by ID and persists to disk.
   * @param id - The ID of the custom data
   * @param data - The data to store
   */
  public setCustomData(id: string, data: any): void {
    if (id.includes('::')) {
      const parts = id.split('::');
      let moduleName = parts[0];
      const actualId = parts[1];
      const mappedModuleName = BaseStorage.cardToModuleMap.get(moduleName);
      if (mappedModuleName) {
        moduleName = mappedModuleName;
      }
      const db = this.getModuleStorage(moduleName);

      // Clean from main storage if exists
      if (this.storage.data && actualId in this.storage.data) {
        delete this.storage.data[actualId];
        this.write();
      }

      db.data[actualId] = data;
      db.write();
      return;
    }

    const foundModuleName = this.getModuleNameForKey(id);
    if (foundModuleName) {
      const db = this.getModuleStorage(foundModuleName);
      // Clean from main storage if exists
      if (this.storage.data && id in this.storage.data) {
        delete this.storage.data[id];
        this.write();
      }
      db.data[id] = data;
      db.write();
      return;
    }

    const extensionName = BaseStorage.keyToExtensionMap.get(id);
    if (extensionName) {
      const extStorage = BaseStorage.extensionStorages.get(extensionName);
      if (extStorage) {
        extStorage.data[id] = data;
        extStorage.write();
        return;
      }
    }
    for (const [extName, extStorage] of BaseStorage.extensionStorages.entries()) {
      if (extStorage.data && id in extStorage.data) {
        BaseStorage.keyToExtensionMap.set(id, extName);
        extStorage.data[id] = data;
        extStorage.write();
        return;
      }
    }
    for (const modStorage of BaseStorage.moduleStorages.values()) {
      if (modStorage.data && id in modStorage.data) {
        if (this.storage.data && id in this.storage.data) {
          delete this.storage.data[id];
          this.write();
        }
        modStorage.data[id] = data;
        modStorage.write();
        return;
      }
    }
    this.storage.data[id] = data;
    this.write();
  }

  /**
   * Returns a deep clone of all storage data.
   * Converts relative paths to absolute paths in portable mode.
   */
  public getAll(): AppStorageData {
    const data = this.storage.data;
    const result = cloneDeep(data);
    result.browser = cloneDeep(this.browserStorage.data);

    // Convert relative paths to absolute paths in portable mode
    if (isPortable()) {
      result.cards.installedCards = result.cards.installedCards.map(card => {
        return {id: card.id, dir: getAbsolutePath(getExePath(), card.dir || '')};
      });
    }

    return result;
  }

  /**
   * Helper to recursively sanitize sensitive keys and truncate long strings before logging storage updates.
   */
  private sanitizeStoragePayload(payload: any): any {
    if (payload === null || payload === undefined) return payload;
    if (typeof payload !== 'object') {
      if (typeof payload === 'string' && payload.length > 200) {
        return `${payload.slice(0, 50)}... [TRUNCATED ${payload.length} chars]`;
      }
      return payload;
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.sanitizeStoragePayload(item));
    }

    const sanitized = {...payload};
    const sensitiveKeys = [
      'dsn',
      'password',
      'token',
      'key',
      'secret',
      'auth',
      'address',
      'url',
      'path',
      'dir',
      'location',
      'name',
      'user',
      'email',
      'avatar',
      'anonymousid',
      'sentrydsn',
      'appdatadir',
    ];

    for (const k of Object.keys(sanitized)) {
      const lowerKey = k.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[k] = '[REDACTED]';
      } else if (lowerKey.includes('favicon') || lowerKey.includes('icon')) {
        sanitized[k] = '[ICON DATA REDACTED]';
      } else if (typeof sanitized[k] === 'object') {
        sanitized[k] = this.sanitizeStoragePayload(sanitized[k]);
      } else if (typeof sanitized[k] === 'string' && sanitized[k].length > 200) {
        sanitized[k] = `${sanitized[k].slice(0, 50)}... [TRUNCATED ${sanitized[k].length} chars]`;
      }
    }
    return sanitized;
  }

  /**
   * Updates data for a specific key and persists to disk.
   * @param key - The key of the data to update
   * @param updateData - The partial data to merge
   */
  public updateData<K extends keyof AppStorageData>(key: K, updateData: Partial<AppStorageData[K]>): void {
    this.storage.data[key] = {...this.storage.data[key], ...updateData};
    this.write();
  }

  /**
   * Clears all storage data and restarts the app.
   * On Linux portable mode, closes window instead of restarting.
   */
  public clearStorage(): void {
    const {appManager} = classHolder;
    this.storage.data = {...this.DEFAULT_DATA};
    if (this.storage.data) {
      Object.defineProperty(this.storage.data, 'browser', {
        get: () => this.browserStorage.data,
        set: value => {
          this.browserStorage.data = value;
          this.writeBrowser();
        },
        configurable: true,
        enumerable: false,
      });
    }
    this.browserStorage.data = cloneDeep(this.DEFAULT_DATA.browser);
    this.write();
    this.writeBrowser();
    if (isPortable() === 'linux') {
      changeWindowState('close');
    } else {
      appManager?.restart();
    }
  }

  /**
   * Writes storage data to disk and adds breadcrumb for tracking.
   * Handles Out of Memory errors gracefully.
   */
  public write(): void {
    try {
      this.storage.write();
    } catch (e) {
      console.error('Storage write failed:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      // Check for OOM-related errors
      if (errorMessage.includes('memory') || errorMessage.includes('heap') || errorMessage.includes('allocation')) {
        applicationIpc.send.showToast('Failed to save configs: Out of memory. Try restarting the app.', 'danger');
      } else {
        applicationIpc.send.showToast(`Failed to save app configs: ${errorMessage}`, 'danger');
      }
    }
  }

  /**
   * Writes browser storage data to disk.
   */
  public writeBrowser(): void {
    try {
      this.browserStorage.write();
    } catch (e) {
      console.error('Browser storage write failed:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      applicationIpc.send.showToast(`Failed to save browser configs: ${errorMessage}`, 'danger');
    }
  }
}

export default BaseStorage;
