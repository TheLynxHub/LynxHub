import {randomUUID} from 'node:crypto';

import {is} from '@electron-toolkit/utils';
import {Get_Default_Hotkeys} from '@lynx_common/consts/hotkeys';
import AppStorageData from '@lynx_common/types/storage';
import BaseStorage from '@lynx_main/storage/index';
import {getUserAgent} from '@lynx_main/utils';
import type {Database as SqliteDatabase} from 'better-sqlite3';
import type {BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';

import {createDevDatabase} from './db.dev';
import {createProdDatabase} from './db.prod';
import {migrateLowdbToSqlite} from './migrateFromLowdb';
import {SqliteStorageMigrationManager} from './migrations';
import * as schema from './schema';
import {SqliteStorageManager} from './storageOperations';

/**
 * Base SQLite Storage class handling database initialization, table setup,
 * and high-level CRUD operations using Drizzle ORM and better-sqlite3.
 */
export class BaseSqliteStorage {
  public readonly sqlite: SqliteDatabase;
  public readonly db: BetterSQLite3Database<typeof schema>;
  public readonly dbPath: string;

  public static readonly extensionStorages = new Map<string, any>();
  public static readonly keyToExtensionMap = new Map<string, string>();
  public static readonly moduleStorages = new Map<string, any>();
  public static readonly cardToModuleMap = new Map<string, string>();

  public write(): void {
    // SQLite operates with WAL mode; statements are committed immediately.
  }

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
  };

  constructor() {
    const connection = is.dev ? createDevDatabase() : createProdDatabase();
    this.sqlite = connection.sqlite;
    this.db = connection.db;
    this.dbPath = connection.dbPath;

    this.ensureTablesExist();
    this.checkAndPerformAutoMigration();
    this.initializeDefaults();
    this.runStorageMigrations();
  }

  /**
   * Checks if lowdb migration has run. If not, runs legacy lowdb migrations first,
   * then copies all lowdb data into SQLite tables.
   */
  private checkAndPerformAutoMigration(): void {
    try {
      const res = this.sqlite.prepare('SELECT value FROM meta_storage WHERE key = ?').get('lowdb_migrated') as
        {value: string} | undefined;

      if (res?.value === 'true') {
        return;
      }

      // 1. Run legacy lowdb migrations on existing lowdb files first (if present)
      try {
        new BaseStorage();
      } catch (err) {
        console.warn('[SQLite Storage] LowDB BaseStorage init warning:', err);
      }

      // 2. Transfer data from lowdb files to SQLite
      const targetManager = new SqliteStorageManager(this);
      migrateLowdbToSqlite(targetManager);

      // 3. Mark lowdb_migrated = 'true'
      this.sqlite
        .prepare('INSERT OR REPLACE INTO meta_storage (key, value) VALUES (?, ?)')
        .run('lowdb_migrated', 'true');

      console.log('[SQLite Storage] Successfully completed automatic LowDB -> SQLite migration.');
    } catch (error) {
      console.error('[SQLite Storage] Error during automatic LowDB migration:', error);
    }
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

      CREATE TABLE IF NOT EXISTS statics_storage (
        id TEXT PRIMARY KEY,
        active_version TEXT,
        broken_versions TEXT,
        last_checked_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Initializes default domain records if tables are empty.
   */
  private initializeDefaults(): void {
    const now = new Date().toISOString();

    // Storage version
    const existingVersion = this.sqlite.prepare('SELECT value FROM meta_storage WHERE key = ?').get('version');
    if (!existingVersion) {
      this.sqlite
        .prepare('INSERT INTO meta_storage (key, value) VALUES (?, ?)')
        .run('version', String(this.DEFAULT_DATA.storage.version));
    }

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

  /**
   * Executes pending SQLite storage migrations.
   */
  public runStorageMigrations(): void {
    const manager = new SqliteStorageManager(this);
    const migrationManager = new SqliteStorageMigrationManager(manager);
    migrationManager.runStorageMigrations(this.DEFAULT_DATA.storage.version);
  }

  public close(): void {
    this.sqlite.close();
  }
}

export * from './db.dev';
export * from './db.prod';
export * from './migrateFromLowdb';
export * from './migrations';
export * from './schema';
export * from './storageOperations';

export default BaseSqliteStorage;
