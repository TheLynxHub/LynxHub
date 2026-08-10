import {randomUUID} from 'node:crypto';

import {is} from '@electron-toolkit/utils';
import {Get_Default_Hotkeys} from '@lynx_common/consts/hotkeys';
import AppStorageData from '@lynx_common/types/storage';
import {getUserAgent} from '@lynx_main/utils';
import type {Database as SqliteDatabase} from 'better-sqlite3';
import type {BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';

import {createDevDatabase} from './db.dev';
import {createProdDatabase} from './db.prod';
import * as schema from './schema';

/**
 * Base SQLite Storage class handling database initialization, table setup,
 * and high-level CRUD operations using Drizzle ORM and better-sqlite3.
 */
export class BaseSqliteStorage {
  public readonly sqlite: SqliteDatabase;
  public readonly db: BetterSQLite3Database<typeof schema>;
  public readonly dbPath: string;

  public readonly DEFAULT_DATA: AppStorageData = {
    storage: {version: 1.1},
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
      openLastSize: false,
      homeCategory: ['All', 'Pin'],
      darkMode: 'dark',
      taskbarStatus: 'taskbar-tray',
      tooltipStatus: 'essential',
      systemStartup: false,
      startMinimized: false,
      startMaximized: false,
      startupLastActivePage: false,
      dynamicAppTitle: true,
      openLinkExternal: false,
      lastPage: '/homePage',
      hotkeys: Get_Default_Hotkeys(),
      initialized: false,
      inited: false,
      appDataDir: '',
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
      floatChatAlwaysOnTop: true,
      floatChatShowTaskbar: false,
      floatChatRememberSize: false,
      floatChatRememberPosition: false,
      floatChatLastSize: undefined,
      floatChatLastPosition: undefined,
      disableFloatChat: false,
      floatChatKeepInBackground: true,
      chatBridgeMaxWidth: 'default',
      bridgeDefaultView: 'custom',
      floatDefaultView: 'custom',
      chatSidebarCollapsed: false,
      chatSidebarWidth: 240,
      floatChatSidebarCollapsed: false,
      floatChatSidebarWidth: 200,
      pinnedThreads: [],
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
    },
    browser: {
      recentAddress: [],
      userAgent: 'chrome',
      customUserAgent: getUserAgent('chrome'),
      favoriteAddress: [],
      historyAddress: [],
      favIcons: [],
      downloadLocation: '',
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
    plugin: {migrated: true, disabledCards: [], bgChatEnabledCards: []},
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
  };

  constructor() {
    const connection = is.dev ? createDevDatabase() : createProdDatabase();
    this.sqlite = connection.sqlite;
    this.db = connection.db;
    this.dbPath = connection.dbPath;

    this.ensureTablesExist();
    this.initializeDefaults();
  }

  /**
   * Executes DDL to create tables if they do not already exist.
   */
  private ensureTablesExist(): void {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS meta_storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cards_config (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS terminal_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        encrypted_data TEXT,
        visited_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT,
        encrypted_data TEXT,
        added_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_fav_icons (
        url TEXT PRIMARY KEY,
        icon_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notification_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plugin_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS performance_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS custom_storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS extension_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        extension_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS module_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Initializes default domain records if tables are empty.
   */
  private initializeDefaults(): void {
    const now = new Date().toISOString();

    // App settings
    const existingApp = this.sqlite.prepare('SELECT id FROM app_settings WHERE id = ?').get('main');
    if (!existingApp) {
      const appData = {...this.DEFAULT_DATA.app};
      if (!appData.anonymousId) {
        appData.anonymousId = randomUUID();
      }
      this.sqlite
        .prepare('INSERT INTO app_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(appData), now);
    }

    // Cards settings
    const existingCards = this.sqlite.prepare('SELECT id FROM cards_settings WHERE id = ?').get('main');
    if (!existingCards) {
      this.sqlite
        .prepare('INSERT INTO cards_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.cards), now);
    }

    // Cards config
    const existingCardsConfig = this.sqlite.prepare('SELECT id FROM cards_config WHERE id = ?').get('main');
    if (!existingCardsConfig) {
      this.sqlite
        .prepare('INSERT INTO cards_config (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.cardsConfig), now);
    }

    // Terminal settings
    const existingTerminal = this.sqlite.prepare('SELECT id FROM terminal_settings WHERE id = ?').get('main');
    if (!existingTerminal) {
      this.sqlite
        .prepare('INSERT INTO terminal_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.terminal), now);
    }

    // Browser settings
    const existingBrowser = this.sqlite.prepare('SELECT id FROM browser_settings WHERE id = ?').get('main');
    if (!existingBrowser) {
      this.sqlite
        .prepare('INSERT INTO browser_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.browser), now);
    }

    // Notification settings
    const existingNotification = this.sqlite.prepare('SELECT id FROM notification_settings WHERE id = ?').get('main');
    if (!existingNotification) {
      this.sqlite
        .prepare('INSERT INTO notification_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.notification), now);
    }

    // Plugin settings
    const existingPlugin = this.sqlite.prepare('SELECT id FROM plugin_settings WHERE id = ?').get('main');
    if (!existingPlugin) {
      this.sqlite
        .prepare('INSERT INTO plugin_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.plugin), now);
    }

    // Performance settings
    const existingPerf = this.sqlite.prepare('SELECT id FROM performance_settings WHERE id = ?').get('main');
    if (!existingPerf) {
      this.sqlite
        .prepare('INSERT INTO performance_settings (id, data, updated_at) VALUES (?, ?, ?)')
        .run('main', JSON.stringify(this.DEFAULT_DATA.performance), now);
    }
  }

  public close(): void {
    this.sqlite.close();
  }
}

export * from './db.dev';
export * from './db.prod';
export * from './migrateFromLowdb';
export * from './schema';
export * from './storageOperations';

export default BaseSqliteStorage;
