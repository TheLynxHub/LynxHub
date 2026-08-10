import AppStorageData, {
  AppConfigStorage,
  BrowserStorage,
  CardsConfigStorage,
  CardsStorage,
  NotificationStorage,
  PerformanceStorage,
  PluginStorage,
  TerminalStorage,
} from '@lynx_common/types/storage';
import type {Database as SqliteDatabase} from 'better-sqlite3';
import {eq} from 'drizzle-orm';
import type {BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';

import BaseSqliteStorage from './index';
import * as schema from './schema';

/**
 * Storage manager class providing high-level operations over SQLite & Drizzle ORM.
 * Mirrors the API surface of the LowDB StorageManager.
 */
export class SqliteStorageManager {
  private readonly baseStorage: BaseSqliteStorage;

  constructor(baseStorage?: BaseSqliteStorage) {
    this.baseStorage = baseStorage ?? new BaseSqliteStorage();
  }

  public get db(): BetterSQLite3Database<typeof schema> {
    return this.baseStorage.db;
  }

  public get sqlite(): SqliteDatabase {
    return this.baseStorage.sqlite;
  }

  /**
   * Retrieves high-level domain section data from storage by key.
   */
  public getData<K extends keyof AppStorageData>(key: K): AppStorageData[K] {
    switch (key) {
      case 'app': {
        const res = this.db.select().from(schema.appSettings).where(eq(schema.appSettings.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.app) as AppStorageData[K];
      }
      case 'cards': {
        const res = this.db.select().from(schema.cardsSettings).where(eq(schema.cardsSettings.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.cards) as AppStorageData[K];
      }
      case 'cardsConfig': {
        const res = this.db.select().from(schema.cardsConfig).where(eq(schema.cardsConfig.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.cardsConfig) as AppStorageData[K];
      }
      case 'terminal': {
        const res = this.db.select().from(schema.terminalSettings).where(eq(schema.terminalSettings.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.terminal) as AppStorageData[K];
      }
      case 'browser': {
        const res = this.db.select().from(schema.browserSettings).where(eq(schema.browserSettings.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.browser) as AppStorageData[K];
      }
      case 'notification': {
        const res = this.db
          .select()
          .from(schema.notificationSettings)
          .where(eq(schema.notificationSettings.id, 'main'))
          .get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.notification) as AppStorageData[K];
      }
      case 'plugin': {
        const res = this.db.select().from(schema.pluginSettings).where(eq(schema.pluginSettings.id, 'main')).get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.plugin) as AppStorageData[K];
      }
      case 'performance': {
        const res = this.db
          .select()
          .from(schema.performanceSettings)
          .where(eq(schema.performanceSettings.id, 'main'))
          .get();
        return (res ? res.data : this.baseStorage.DEFAULT_DATA.performance) as AppStorageData[K];
      }
      case 'storage': {
        const res = this.db.select().from(schema.metaStorage).where(eq(schema.metaStorage.key, 'version')).get();
        return {version: res ? Number(res.value) : 1.1} as AppStorageData[K];
      }
      default:
        return this.getCustomData(key as string);
    }
  }

  /**
   * Sets high-level domain section data in storage by key.
   */
  public setData<K extends keyof AppStorageData>(key: K, data: AppStorageData[K]): void {
    const now = new Date().toISOString();
    switch (key) {
      case 'app':
        this.db
          .insert(schema.appSettings)
          .values({id: 'main', data: data as AppConfigStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.appSettings.id,
            set: {data: data as AppConfigStorage, updatedAt: now},
          })
          .run();
        break;
      case 'cards':
        this.db
          .insert(schema.cardsSettings)
          .values({id: 'main', data: data as CardsStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.cardsSettings.id,
            set: {data: data as CardsStorage, updatedAt: now},
          })
          .run();
        break;
      case 'cardsConfig':
        this.db
          .insert(schema.cardsConfig)
          .values({id: 'main', data: data as CardsConfigStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.cardsConfig.id,
            set: {data: data as CardsConfigStorage, updatedAt: now},
          })
          .run();
        break;
      case 'terminal':
        this.db
          .insert(schema.terminalSettings)
          .values({id: 'main', data: data as TerminalStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.terminalSettings.id,
            set: {data: data as TerminalStorage, updatedAt: now},
          })
          .run();
        break;
      case 'browser':
        this.db
          .insert(schema.browserSettings)
          .values({id: 'main', data: data as BrowserStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.browserSettings.id,
            set: {data: data as BrowserStorage, updatedAt: now},
          })
          .run();
        break;
      case 'notification':
        this.db
          .insert(schema.notificationSettings)
          .values({id: 'main', data: data as NotificationStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.notificationSettings.id,
            set: {data: data as NotificationStorage, updatedAt: now},
          })
          .run();
        break;
      case 'plugin':
        this.db
          .insert(schema.pluginSettings)
          .values({id: 'main', data: data as PluginStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.pluginSettings.id,
            set: {data: data as PluginStorage, updatedAt: now},
          })
          .run();
        break;
      case 'performance':
        this.db
          .insert(schema.performanceSettings)
          .values({id: 'main', data: data as PerformanceStorage, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.performanceSettings.id,
            set: {data: data as PerformanceStorage, updatedAt: now},
          })
          .run();
        break;
      default:
        this.setCustomData(key as string, data);
        break;
    }
  }

  /**
   * Custom data getter & setter.
   */
  public getCustomData(key: string): any {
    const res = this.db.select().from(schema.customStorage).where(eq(schema.customStorage.key, key)).get();
    return res ? res.value : undefined;
  }

  public setCustomData(key: string, value: any): void {
    const now = new Date().toISOString();
    this.db
      .insert(schema.customStorage)
      .values({key, value, updatedAt: now})
      .onConflictDoUpdate({
        target: schema.customStorage.key,
        set: {value, updatedAt: now},
      })
      .run();
  }

  /**
   * Extension storage getter & setter.
   */
  public getExtensionData(extensionName: string, key: string): any {
    const res = this.sqlite
      .prepare('SELECT value FROM extension_storage WHERE extension_name = ? AND key = ?')
      .get(extensionName, key) as {value: string} | undefined;
    return res ? JSON.parse(res.value) : undefined;
  }

  public setExtensionData(extensionName: string, key: string, value: any): void {
    const now = new Date().toISOString();
    const existing = this.sqlite
      .prepare('SELECT id FROM extension_storage WHERE extension_name = ? AND key = ?')
      .get(extensionName, key) as {id: number} | undefined;

    if (existing) {
      this.sqlite
        .prepare('UPDATE extension_storage SET value = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(value), now, existing.id);
    } else {
      this.sqlite
        .prepare('INSERT INTO extension_storage (extension_name, key, value, updated_at) VALUES (?, ?, ?, ?)')
        .run(extensionName, key, JSON.stringify(value), now);
    }
  }

  /**
   * Module storage getter & setter.
   */
  public getModuleData(moduleName: string, key: string): any {
    const res = this.sqlite
      .prepare('SELECT value FROM module_storage WHERE module_name = ? AND key = ?')
      .get(moduleName, key) as {value: string} | undefined;
    return res ? JSON.parse(res.value) : undefined;
  }

  public setModuleData(moduleName: string, key: string, value: any): void {
    const now = new Date().toISOString();
    const existing = this.sqlite
      .prepare('SELECT id FROM module_storage WHERE module_name = ? AND key = ?')
      .get(moduleName, key) as {id: number} | undefined;

    if (existing) {
      this.sqlite
        .prepare('UPDATE module_storage SET value = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(value), now, existing.id);
    } else {
      this.sqlite
        .prepare('INSERT INTO module_storage (module_name, key, value, updated_at) VALUES (?, ?, ?, ?)')
        .run(moduleName, key, JSON.stringify(value), now);
    }
  }

  /**
   * Retrieves all main application storage data as a single JSON object.
   */
  public getAllData(): AppStorageData {
    return {
      storage: this.getData('storage'),
      cards: this.getData('cards'),
      cardsConfig: this.getData('cardsConfig'),
      app: this.getData('app'),
      terminal: this.getData('terminal'),
      browser: this.getData('browser'),
      notification: this.getData('notification'),
      plugin: this.getData('plugin'),
      performance: this.getData('performance'),
    };
  }

  public close(): void {
    this.baseStorage.close();
  }
}

export default SqliteStorageManager;
