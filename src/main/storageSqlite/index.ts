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
  private static instance?: BaseSqliteStorage;

  public readonly sqlite!: SqliteDatabase;
  public readonly db!: BetterSQLite3Database<typeof schema>;
  public readonly dbPath!: string;

  public static readonly extensionStorages = new Map<string, any>();
  public static readonly keyToExtensionMap = new Map<string, string>();
  public static readonly moduleStorages = new Map<string, any>();
  public static readonly cardToModuleMap = new Map<string, string>();

  public static getInstance(): BaseSqliteStorage {
    if (!BaseSqliteStorage.instance) {
      BaseSqliteStorage.instance = new BaseSqliteStorage();
    }
    return BaseSqliteStorage.instance;
  }

  public write(): void {
    // SQLite operates with WAL mode; statements are committed immediately.
  }

  public readonly DEFAULT_DATA: AppStorageData = {
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
      userAgent: 'lynxhub',
      customUserAgent: getUserAgent('lynxhub'),
      favoriteAddress: [],
      historyAddress: [],
      favIcons: [],
      downloadLocation: '',
      downloadBehavior: 'default',
      clearedDownloads: [],
      bookmarksBarVisibility: 'always',
      bookmarkNewTabBehavior: 'browser',
      loadingSkeleton: true,
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
      enabled: false,
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
    if (BaseSqliteStorage.instance) {
      return BaseSqliteStorage.instance;
    }

    const connection = is.dev ? createDevDatabase() : createProdDatabase();
    this.sqlite = connection.sqlite;
    this.db = connection.db;
    this.dbPath = connection.dbPath;

    BaseSqliteStorage.instance = this;

    this.ensureTablesExist();
    this.checkAndPerformAutoMigration();
    this.initializeDefaults();
    this.migrateLegacyBrowserDataToRowTables();
    this.runStorageMigrations();
  }

  /**
   * Checks if lowdb migration has run. If not or if on older migration version,
   * repairs misclassified plugin tables and copies all lowdb data into SQLite.
   */
  private checkAndPerformAutoMigration(): void {
    try {
      const MIGRATION_VERSION = '3';
      const resMigrated = this.sqlite.prepare('SELECT value FROM meta_storage WHERE key = ?').get('lowdb_migrated') as
        {value: string} | undefined;
      const resVersion = this.sqlite
        .prepare('SELECT value FROM meta_storage WHERE key = ?')
        .get('lowdb_migration_version') as {value: string} | undefined;

      if (resMigrated?.value === 'true' && resVersion?.value === MIGRATION_VERSION) {
        return;
      }

      // Repair any misclassified or hyphenated plugin records in SQLite
      this.repairSqlitePluginTables();

      // 1. Run legacy lowdb migrations on existing lowdb files first (if present)
      try {
        new BaseStorage();
      } catch (err) {
        console.warn('[SQLite Storage] LowDB BaseStorage init warning:', err);
      }

      // 2. Transfer data from lowdb files to SQLite
      const targetManager = new SqliteStorageManager(this);
      migrateLowdbToSqlite(targetManager);

      // 3. Mark lowdb_migrated = 'true' and lowdb_migration_version = '3'
      this.sqlite
        .prepare('INSERT OR REPLACE INTO meta_storage (key, value) VALUES (?, ?)')
        .run('lowdb_migrated', 'true');
      this.sqlite
        .prepare('INSERT OR REPLACE INTO meta_storage (key, value) VALUES (?, ?)')
        .run('lowdb_migration_version', MIGRATION_VERSION);

      console.log('[SQLite Storage] Successfully completed automatic LowDB -> SQLite migration.');
    } catch (error) {
      console.error('[SQLite Storage] Error during automatic LowDB migration:', error);
    }
  }

  /**
   * Repairs existing SQLite tables by migrating any misclassified or hyphenated plugin records.
   */
  private repairSqlitePluginTables(): void {
    try {
      this.sqlite.transaction(() => {
        // 0. Remove invalid version-based plugin entries (e.g. 'v0.15.3') from extension_storage and module_storage
        this.sqlite
          .prepare(
            `DELETE FROM extension_storage
             WHERE extension_name GLOB 'v[0-9]*' OR extension_name LIKE 'v0.%' OR extension_name LIKE 'v1.%'`,
          )
          .run();
        this.sqlite
          .prepare(
            `DELETE FROM module_storage
             WHERE module_name GLOB 'v[0-9]*' OR module_name LIKE 'v0.%' OR module_name LIKE 'v1.%'`,
          )
          .run();

        // 1. Move any known extensions wrongly placed into module_storage over to extension_storage
        const knownExtensions = [
          'python_toolkit',
          'python-toolkit',
          'hardware_monitor',
          'hardware-monitor',
          'ai_news',
          'ai-news',
          'custom_actions',
          'custom-actions',
          'skills_toolkit',
          'skills-toolkit',
        ];
        const placeholders = knownExtensions.map(() => '?').join(',');
        const misclassified = this.sqlite
          .prepare(
            `SELECT module_name, key, value, updated_at FROM module_storage WHERE module_name IN (${placeholders})`,
          )
          .all(...knownExtensions) as {module_name: string; key: string; value: string; updated_at: string}[];

        for (const row of misclassified) {
          const normExt = row.module_name.toLowerCase().replace(/-/g, '_');
          this.sqlite
            .prepare(
              `INSERT INTO extension_storage (extension_name, key, value, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(extension_name, key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at`,
            )
            .run(normExt, row.key, row.value, row.updated_at);
        }

        if (misclassified.length > 0) {
          this.sqlite
            .prepare(`DELETE FROM module_storage WHERE module_name IN (${placeholders})`)
            .run(...knownExtensions);
        }

        // 2. Normalize hyphenated extension names in extension_storage
        const hyphenExts = this.sqlite
          .prepare(
            "SELECT extension_name, key, value, updated_at FROM extension_storage WHERE extension_name LIKE '%-%'",
          )
          .all() as {extension_name: string; key: string; value: string; updated_at: string}[];

        for (const row of hyphenExts) {
          const normExt = row.extension_name.toLowerCase().replace(/-/g, '_');
          this.sqlite
            .prepare(
              `INSERT INTO extension_storage (extension_name, key, value, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(extension_name, key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at`,
            )
            .run(normExt, row.key, row.value, row.updated_at);
          this.sqlite
            .prepare('DELETE FROM extension_storage WHERE extension_name = ? AND key = ?')
            .run(row.extension_name, row.key);
        }

        // 3. Migrate old lynxhub_module_offline_container in module_storage to local_ai_collection
        const oldModules = this.sqlite
          .prepare(
            "SELECT key, value, updated_at FROM module_storage WHERE module_name = 'lynxhub_module_offline_container'",
          )
          .all() as {key: string; value: string; updated_at: string}[];

        for (const row of oldModules) {
          this.sqlite
            .prepare(
              `INSERT INTO module_storage (module_name, key, value, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(module_name, key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at`,
            )
            .run('local_ai_collection', row.key, row.value, row.updated_at);
        }

        if (oldModules.length > 0) {
          this.sqlite
            .prepare("DELETE FROM module_storage WHERE module_name = 'lynxhub_module_offline_container'")
            .run();
        }
      })();
    } catch (err) {
      console.warn('[SQLite Storage] Plugin table repair warning:', err);
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

      CREATE TABLE IF NOT EXISTS browser_bookmarks (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        fav_icon TEXT,
        show_icon_only INTEGER DEFAULT 0,
        \`order\` INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS browser_fav_icons (
        url TEXT PRIMARY KEY,
        icon_data TEXT NOT NULL,
        title TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_browser_history_visited ON browser_history(visited_at DESC);
      CREATE INDEX IF NOT EXISTS idx_browser_favorites_added ON browser_favorites(added_at DESC);
      CREATE INDEX IF NOT EXISTS idx_browser_bookmarks_parent ON browser_bookmarks(parent_id, \`order\` ASC);

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
        updated_at TEXT NOT NULL,
        UNIQUE(extension_name, key)
      );

      CREATE TABLE IF NOT EXISTS module_storage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_name TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(module_name, key)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_extension_storage_key ON extension_storage(extension_name, key);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_module_storage_key ON module_storage(module_name, key);

      CREATE TABLE IF NOT EXISTS statics_storage (
        id TEXT PRIMARY KEY,
        active_version TEXT,
        broken_versions TEXT,
        last_checked_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS quick_web_settings (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_storage (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    try {
      this.sqlite.exec('ALTER TABLE browser_fav_icons ADD COLUMN title TEXT;');
    } catch {
      // Column already exists
    }

    try {
      this.sqlite.exec('ALTER TABLE browser_bookmarks ADD COLUMN show_icon_only INTEGER DEFAULT 0;');
    } catch {
      // Column already exists
    }
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
   * Migrates any legacy browser data (favIcons, historyAddress, favoriteAddress)
   * stored inside browser_settings.data into dedicated row tables.
   */
  public migrateLegacyBrowserDataToRowTables(): void {
    try {
      const rawBrowser = this.sqlite.prepare('SELECT data FROM browser_settings WHERE id = ?').get('main') as
        {data: string} | undefined;

      if (!rawBrowser?.data) return;

      const browserObj = JSON.parse(rawBrowser.data);
      let modified = false;
      const now = new Date().toISOString();

      if (Array.isArray(browserObj.favIcons) && browserObj.favIcons.length > 0) {
        const upsertFavIcon = this.sqlite.prepare(
          `INSERT INTO browser_fav_icons (url, icon_data, title, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(url) DO UPDATE SET
            icon_data = excluded.icon_data,
            title = COALESCE(excluded.title, browser_fav_icons.title),
            updated_at = excluded.updated_at`,
        );

        this.sqlite.transaction(() => {
          for (const item of browserObj.favIcons) {
            if (item && item.url && item.favIcon) {
              upsertFavIcon.run(item.url, item.favIcon, item.title ?? null, now);
            }
          }
        })();

        browserObj.favIcons = [];
        modified = true;
      }

      if (Array.isArray(browserObj.historyAddress) && browserObj.historyAddress.length > 0) {
        const insertHistory = this.sqlite.prepare(
          'INSERT INTO browser_history (url, title, encrypted_data, visited_at) VALUES (?, ?, ?, ?)',
        );

        this.sqlite.transaction(() => {
          for (const url of browserObj.historyAddress) {
            if (url) {
              insertHistory.run(url, null, null, now);
            }
          }
        })();

        browserObj.historyAddress = [];
        modified = true;
      }

      if (Array.isArray(browserObj.favoriteAddress) && browserObj.favoriteAddress.length > 0) {
        const insertFavorite = this.sqlite.prepare(
          'INSERT INTO browser_favorites (url, title, encrypted_data, added_at) VALUES (?, ?, ?, ?)',
        );

        this.sqlite.transaction(() => {
          for (const url of browserObj.favoriteAddress) {
            if (url) {
              insertFavorite.run(url, null, null, now);
            }
          }
        })();

        browserObj.favoriteAddress = [];
        modified = true;
      }

      // Auto-migrate legacy browser_favorites to browser_bookmarks
      const bookmarkCountRow = this.sqlite.prepare('SELECT COUNT(*) as count FROM browser_bookmarks').get() as
        {count: number} | undefined;
      if (!bookmarkCountRow || bookmarkCountRow.count === 0) {
        const favorites = this.sqlite
          .prepare('SELECT url, title, added_at FROM browser_favorites ORDER BY id ASC')
          .all() as {url: string; title: string | null; added_at: string}[];
        if (favorites.length > 0) {
          const insertBookmark = this.sqlite.prepare(
            'INSERT INTO browser_bookmarks (id, parent_id, type, title, url, fav_icon,' +
              ' `order`, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          );
          this.sqlite.transaction(() => {
            favorites.forEach((fav, index) => {
              const id = randomUUID();
              const url = fav.url;
              const title = fav.title || url;
              insertBookmark.run(id, 'bookmarks_bar', 'bookmark', title, url, null, index, fav.added_at || now, now);
            });
          })();
          console.log('[SQLite Storage] Migrated legacy favorites to browser_bookmarks.');
        }
      }

      if (modified) {
        this.sqlite
          .prepare('UPDATE browser_settings SET data = ?, updated_at = ? WHERE id = ?')
          .run(JSON.stringify(browserObj), now, 'main');
        console.log('[SQLite Storage] Successfully migrated legacy browser data to dedicated row tables.');
      }
    } catch (err) {
      console.warn('[SQLite Storage] Legacy browser data migration warning:', err);
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
    if (BaseSqliteStorage.instance === this) {
      BaseSqliteStorage.instance = undefined;
    }
  }
}

export * from './db.dev';
export * from './db.prod';
export * from './migrateFromLowdb';
export * from './migrations';
export * from './schema';
export * from './storageOperations';

export default BaseSqliteStorage;
