import {randomUUID} from 'node:crypto';

import {LYNXHUB_WEBSITE} from '@lynx_common/consts';
import {storageUtilsChannels} from '@lynx_common/consts/ipcChannels/storage';
import {ChosenArgumentsData, ConfirmMenuTypes} from '@lynx_common/types';
import {BookmarkFolder, BookmarkNode, CreateBookmarkInput, UpdateBookmarkInput} from '@lynx_common/types/bookmarks';
import {
  BrowserHistoryData,
  CustomRunBehaviorData,
  FavIcons,
  HomeCategory,
  PreCommands,
  PreOpen,
  PreOpenData,
  RecentlyOperation,
  StorageOperation,
} from '@lynx_common/types/ipc';
import {ChosenArgument} from '@lynx_common/types/plugins/modules';
import AppStorageData, {
  AppConfigStorage,
  BrowserStorage,
  CardsConfigStorage,
  CardsStorage,
  InstalledCard,
  InstalledCards,
  NotificationStorage,
  PerformanceStorage,
  PluginStorage,
  TerminalStorage,
} from '@lynx_common/types/storage';
import {compareUrls, isValidURL, terminalLineEnding} from '@lynx_common/utils';
import {sendToMain} from '@lynx_main/ipc/sender';
import classHolder from '@lynx_main/managers/classHolder';
import {
  decryptString,
  decryptStrings,
  encryptString,
  encryptStrings,
  getAbsolutePath,
  getExePath,
  getRelativePath,
  isPortable,
} from '@lynx_main/utils';
import AddBreadcrumb_Main from '@lynx_main/utils/breadcrumbs';
import axios from 'axios';
import type {Database as SqliteDatabase, Statement} from 'better-sqlite3';
import {eq} from 'drizzle-orm';
import type {BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';
import {uniqBy} from 'lodash-es';

import {AUTH_LOGIN_KEY} from '../monitoring/auth';
import {getTokens} from '../monitoring/token';
import BaseSqliteStorage from './index';
import * as schema from './schema';

/**
 * Storage manager providing full-featured CRUD operations over SQLite & Drizzle ORM.
 * Replaces the LowDB StorageManager with complete API compatibility.
 */
export class SqliteStorageManager {
  private readonly baseStorage: BaseSqliteStorage;
  private decryptedBrowserData!: BrowserHistoryData;

  private getExtensionStmt?: Statement;
  private setExtensionStmt?: Statement;
  private getModuleStmt?: Statement;
  private setModuleStmt?: Statement;
  private getMetaStmt?: Statement;
  private setMetaStmt?: Statement;

  private getFavIconsStmt?: Statement;
  private upsertFavIconStmt?: Statement;
  private updateFavIconTitleStmt?: Statement;
  private deleteFavIconStmt?: Statement;
  private clearFavIconsStmt?: Statement;
  private trimFavIconsStmt?: Statement;

  private getHistoryStmt?: Statement;
  private insertHistoryStmt?: Statement;
  private deleteHistoryUrlStmt?: Statement;
  private clearHistoryStmt?: Statement;
  private trimHistoryStmt?: Statement;

  private getFavoritesStmt?: Statement;
  private insertFavoriteStmt?: Statement;
  private deleteFavoriteUrlStmt?: Statement;
  private clearFavoritesStmt?: Statement;
  private trimFavoritesStmt?: Statement;

  constructor(baseStorage?: BaseSqliteStorage) {
    this.baseStorage = baseStorage ?? BaseSqliteStorage.getInstance();
  }

  public get db(): BetterSQLite3Database<typeof schema> {
    return this.baseStorage.db;
  }

  public get sqlite(): SqliteDatabase {
    return this.baseStorage.sqlite;
  }

  public get DEFAULT_DATA(): AppStorageData {
    return this.baseStorage.DEFAULT_DATA;
  }

  private get getExtensionStatement(): Statement {
    if (!this.getExtensionStmt) {
      this.getExtensionStmt = this.sqlite.prepare(
        'SELECT value FROM extension_storage WHERE extension_name = ? AND key = ?',
      );
    }
    return this.getExtensionStmt;
  }

  private get setExtensionStatement(): Statement {
    if (!this.setExtensionStmt) {
      this.setExtensionStmt = this.sqlite.prepare(
        `INSERT INTO extension_storage (extension_name, key, value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(extension_name, key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at`,
      );
    }
    return this.setExtensionStmt;
  }

  private get getModuleStatement(): Statement {
    if (!this.getModuleStmt) {
      this.getModuleStmt = this.sqlite.prepare('SELECT value FROM module_storage WHERE module_name = ? AND key = ?');
    }
    return this.getModuleStmt;
  }

  private get setModuleStatement(): Statement {
    if (!this.setModuleStmt) {
      this.setModuleStmt = this.sqlite.prepare(
        `INSERT INTO module_storage (module_name, key, value, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(module_name, key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at`,
      );
    }
    return this.setModuleStmt;
  }

  private get getMetaStatement(): Statement {
    if (!this.getMetaStmt) {
      this.getMetaStmt = this.sqlite.prepare('SELECT value FROM meta_storage WHERE key = ?');
    }
    return this.getMetaStmt;
  }

  private get setMetaStatement(): Statement {
    if (!this.setMetaStmt) {
      this.setMetaStmt = this.sqlite.prepare(
        `INSERT INTO meta_storage (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value`,
      );
    }
    return this.setMetaStmt;
  }

  private get getFavIconsStatement(): Statement {
    if (!this.getFavIconsStmt) {
      this.getFavIconsStmt = this.sqlite.prepare(
        'SELECT url, icon_data, title, updated_at FROM browser_fav_icons ORDER BY updated_at DESC LIMIT ?',
      );
    }
    return this.getFavIconsStmt;
  }

  private get upsertFavIconStatement(): Statement {
    if (!this.upsertFavIconStmt) {
      this.upsertFavIconStmt = this.sqlite.prepare(
        `INSERT INTO browser_fav_icons (url, icon_data, title, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(url) DO UPDATE SET
          icon_data = excluded.icon_data,
          title = COALESCE(excluded.title, browser_fav_icons.title),
          updated_at = excluded.updated_at`,
      );
    }
    return this.upsertFavIconStmt;
  }

  private get updateFavIconTitleStatement(): Statement {
    if (!this.updateFavIconTitleStmt) {
      this.updateFavIconTitleStmt = this.sqlite.prepare(
        'UPDATE browser_fav_icons SET title = ?, updated_at = ? WHERE url = ?',
      );
    }
    return this.updateFavIconTitleStmt;
  }

  private get deleteFavIconStatement(): Statement {
    if (!this.deleteFavIconStmt) {
      this.deleteFavIconStmt = this.sqlite.prepare('DELETE FROM browser_fav_icons WHERE url = ?');
    }
    return this.deleteFavIconStmt;
  }

  private get clearFavIconsStatement(): Statement {
    if (!this.clearFavIconsStmt) {
      this.clearFavIconsStmt = this.sqlite.prepare('DELETE FROM browser_fav_icons');
    }
    return this.clearFavIconsStmt;
  }

  private get trimFavIconsStatement(): Statement {
    if (!this.trimFavIconsStmt) {
      this.trimFavIconsStmt = this.sqlite.prepare(
        `DELETE FROM browser_fav_icons WHERE url NOT IN (
          SELECT url FROM browser_fav_icons ORDER BY updated_at DESC LIMIT ?
        )`,
      );
    }
    return this.trimFavIconsStmt;
  }

  private get getHistoryStatement(): Statement {
    if (!this.getHistoryStmt) {
      this.getHistoryStmt = this.sqlite.prepare(
        'SELECT id, url, title, encrypted_data, visited_at FROM browser_history ORDER BY id DESC LIMIT ?',
      );
    }
    return this.getHistoryStmt;
  }

  private get insertHistoryStatement(): Statement {
    if (!this.insertHistoryStmt) {
      this.insertHistoryStmt = this.sqlite.prepare(
        'INSERT INTO browser_history (url, title, encrypted_data, visited_at) VALUES (?, ?, ?, ?)',
      );
    }
    return this.insertHistoryStmt;
  }

  private get deleteHistoryUrlStatement(): Statement {
    if (!this.deleteHistoryUrlStmt) {
      this.deleteHistoryUrlStmt = this.sqlite.prepare('DELETE FROM browser_history WHERE url = ?');
    }
    return this.deleteHistoryUrlStmt;
  }

  private get clearHistoryStatement(): Statement {
    if (!this.clearHistoryStmt) {
      this.clearHistoryStmt = this.sqlite.prepare('DELETE FROM browser_history');
    }
    return this.clearHistoryStmt;
  }

  private get trimHistoryStatement(): Statement {
    if (!this.trimHistoryStmt) {
      this.trimHistoryStmt = this.sqlite.prepare(
        'DELETE FROM browser_history WHERE id NOT IN (SELECT id FROM browser_history ORDER BY id DESC LIMIT ?)',
      );
    }
    return this.trimHistoryStmt;
  }

  private get getFavoritesStatement(): Statement {
    if (!this.getFavoritesStmt) {
      this.getFavoritesStmt = this.sqlite.prepare(
        'SELECT id, url, title, encrypted_data, added_at FROM browser_favorites ORDER BY id DESC LIMIT ?',
      );
    }
    return this.getFavoritesStmt;
  }

  private get insertFavoriteStatement(): Statement {
    if (!this.insertFavoriteStmt) {
      this.insertFavoriteStmt = this.sqlite.prepare(
        'INSERT INTO browser_favorites (url, title, encrypted_data, added_at) VALUES (?, ?, ?, ?)',
      );
    }
    return this.insertFavoriteStmt;
  }

  private get deleteFavoriteUrlStatement(): Statement {
    if (!this.deleteFavoriteUrlStmt) {
      this.deleteFavoriteUrlStmt = this.sqlite.prepare('DELETE FROM browser_favorites WHERE url = ?');
    }
    return this.deleteFavoriteUrlStmt;
  }

  private get clearFavoritesStatement(): Statement {
    if (!this.clearFavoritesStmt) {
      this.clearFavoritesStmt = this.sqlite.prepare('DELETE FROM browser_favorites');
    }
    return this.clearFavoritesStmt;
  }

  private get trimFavoritesStatement(): Statement {
    if (!this.trimFavoritesStmt) {
      this.trimFavoritesStmt = this.sqlite.prepare(
        'DELETE FROM browser_favorites WHERE id NOT IN (SELECT id FROM browser_favorites ORDER BY id DESC LIMIT ?)',
      );
    }
    return this.trimFavoritesStmt;
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
        const res = this.getMetaStatement.get('version') as {value: string} | undefined;
        return {version: res ? Number(res.value) : this.baseStorage.DEFAULT_DATA.storage.version} as AppStorageData[K];
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
      case 'browser': {
        const browserData = {...(data as BrowserStorage)};
        const hasHistory = Array.isArray(browserData.historyAddress) && browserData.historyAddress.length > 0;
        const hasFavorites = Array.isArray(browserData.favoriteAddress) && browserData.favoriteAddress.length > 0;
        const hasFavIcons = Array.isArray(browserData.favIcons) && browserData.favIcons.length > 0;

        if (hasHistory || hasFavorites || hasFavIcons) {
          const nowIso = new Date().toISOString();
          if (hasHistory) {
            this.clearHistoryStatement.run();
            const insertStmt = this.insertHistoryStatement;
            const tx = this.sqlite.transaction((urls: string[]) => {
              for (let i = urls.length - 1; i >= 0; i--) {
                insertStmt.run(urls[i], null, null, nowIso);
              }
            });
            tx(browserData.historyAddress);
          }
          if (hasFavorites) {
            this.clearFavoritesStatement.run();
            const insertStmt = this.insertFavoriteStatement;
            const tx = this.sqlite.transaction((urls: string[]) => {
              for (let i = urls.length - 1; i >= 0; i--) {
                insertStmt.run(urls[i], null, null, nowIso);
              }
            });
            tx(browserData.favoriteAddress);
          }
          if (hasFavIcons) {
            this.clearFavIconsStatement.run();
            const upsertStmt = this.upsertFavIconStatement;
            const tx = this.sqlite.transaction((items: FavIcons[]) => {
              for (const item of items) {
                upsertStmt.run(item.url, item.favIcon, item.title ?? null, nowIso);
              }
            });
            tx(browserData.favIcons);
          }
          browserData.historyAddress = [];
          browserData.favoriteAddress = [];
          browserData.favIcons = [];
        }

        this.db
          .insert(schema.browserSettings)
          .values({id: 'main', data: browserData, updatedAt: now})
          .onConflictDoUpdate({
            target: schema.browserSettings.id,
            set: {data: browserData, updatedAt: now},
          })
          .run();
        this.decryptBrowserData();
        break;
      }
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
      case 'storage': {
        const versionVal = typeof data === 'object' && data && 'version' in data ? (data as any).version : data;
        this.setMetaStatement.run('version', String(versionVal));
        break;
      }
      default:
        this.setCustomData(key as string, data);
        break;
    }
  }

  /**
   * Partially updates data for a specific storage section.
   */
  public updateData<K extends keyof AppStorageData>(key: K, updateData: Partial<AppStorageData[K]>): void {
    const currentData = this.getData(key);

    let newData: AppStorageData[K];
    if (typeof currentData === 'object' && currentData !== null && !Array.isArray(currentData)) {
      newData = {...currentData, ...updateData};
    } else {
      newData = updateData as AppStorageData[K];
    }

    this.setData(key, newData);
  }

  public write(): void {
    // SQLite auto-commits statements in WAL mode
  }

  public sanitizeStoragePayload(data: any): any {
    return data;
  }

  public getModuleStorage(moduleName: string): any {
    return {
      get: (key: string) => this.getModuleData(moduleName, key),
      set: (key: string, val: any) => this.setModuleData(moduleName, key, val),
    };
  }

  public getModuleNameForKey(id: string): string | undefined {
    const normId = id.toLowerCase();
    for (const [cardId, moduleName] of BaseSqliteStorage.cardToModuleMap.entries()) {
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
    }
    return undefined;
  }

  /**
   * Custom data getter & setter.
   */
  public getCustomData(id: string): any {
    if (id.includes('::')) {
      const parts = id.split('::');
      const moduleName = parts[0];
      const key = parts[1];
      const val = this.getModuleData(moduleName, key);
      if (val !== undefined) return val;

      const mappedModule = this.getModuleNameForKey(moduleName);
      if (mappedModule && mappedModule !== moduleName) {
        const valMapped = this.getModuleData(mappedModule, key);
        if (valMapped !== undefined) return valMapped;
      }

      for (const [cardId, modName] of BaseSqliteStorage.cardToModuleMap.entries()) {
        if (modName === moduleName) {
          const valCard = this.getModuleData(cardId, key);
          if (valCard !== undefined) return valCard;
        }
      }
    }
    const res = this.db.select().from(schema.customStorage).where(eq(schema.customStorage.key, id)).get();
    return res ? res.value : undefined;
  }

  public setCustomData(id: string, value: any): void {
    if (id.includes('::')) {
      const parts = id.split('::');
      const moduleName = parts[0];
      const key = parts[1];
      this.setModuleData(moduleName, key, value);
      return;
    }
    const now = new Date().toISOString();
    this.db
      .insert(schema.customStorage)
      .values({key: id, value, updatedAt: now})
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
    const res = this.getExtensionStatement.get(extensionName, key) as {value: string} | undefined;
    return res ? JSON.parse(res.value) : undefined;
  }

  public setExtensionData(extensionName: string, key: string, value: any): void {
    const now = new Date().toISOString();
    this.setExtensionStatement.run(extensionName, key, JSON.stringify(value), now);
  }

  /**
   * Module storage getter & setter.
   */
  public getModuleData(moduleName: string, key: string): any {
    const res = this.getModuleStatement.get(moduleName, key) as {value: string} | undefined;
    return res ? JSON.parse(res.value) : undefined;
  }

  public setModuleData(moduleName: string, key: string, value: any): void {
    const now = new Date().toISOString();
    this.setModuleStatement.run(moduleName, key, JSON.stringify(value), now);
  }

  /**
   * Meta storage getter & setter.
   */
  public getMetaData(key: string): string | undefined {
    const res = this.getMetaStatement.get(key) as {value: string} | undefined;
    return res?.value;
  }

  public setMetaData(key: string, value: string): void {
    this.setMetaStatement.run(key, value);
  }

  /**
   * Retrieves all main application storage data as a single JSON object.
   */
  public getAll(): AppStorageData {
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

  public getAllData(): AppStorageData {
    return this.getAll();
  }

  public clearStorage(): void {
    this.setData('cards', this.baseStorage.DEFAULT_DATA.cards);
    this.setData('cardsConfig', this.baseStorage.DEFAULT_DATA.cardsConfig);
    this.setData('app', this.baseStorage.DEFAULT_DATA.app);
    this.setData('terminal', this.baseStorage.DEFAULT_DATA.terminal);
    this.setData('browser', this.baseStorage.DEFAULT_DATA.browser);
    this.setData('notification', this.baseStorage.DEFAULT_DATA.notification);
    this.setData('plugin', this.baseStorage.DEFAULT_DATA.plugin);
    this.setData('performance', this.baseStorage.DEFAULT_DATA.performance);
    this.clearHistoryStatement.run();
    this.clearFavoritesStatement.run();
    this.clearFavIconsStatement.run();
    this.sqlite.exec('DELETE FROM custom_storage;');
  }

  public completeDeferredMigrations(): void {
    // Re-decrypt browser data if needed
    this.decryptBrowserData();
  }

  // --- Browser Encryption & Helpers ---

  public decryptBrowserData(): void {
    const rawData = this.getData('browser');
    const recentAddress = rawData.recentAddress || [];

    const limits = rawData.historyLimits ?? {
      recentAddress: 100,
      historyAddress: 1000,
      favoriteAddress: 500,
      favIcons: 100,
    };

    let trimmedRecent = recentAddress;
    if (trimmedRecent.length > limits.recentAddress) {
      trimmedRecent = trimmedRecent.slice(0, limits.recentAddress);
      this.updateData('browser', {recentAddress: trimmedRecent});
    }

    const historyRows = this.getHistoryStatement.all(limits.historyAddress) as {url: string}[];
    const favoriteRows = this.getFavoritesStatement.all(limits.favoriteAddress) as {url: string}[];
    const favIconRows = this.getFavIconsStatement.all(limits.favIcons) as {
      url: string;
      icon_data: string;
      title: string | null;
    }[];

    this.decryptedBrowserData = {
      recentAddress: decryptStrings(trimmedRecent),
      favoriteAddress: favoriteRows.map(r => decryptString(r.url)),
      historyAddress: historyRows.map(r => decryptString(r.url)),
      favIcons: favIconRows.map(item => ({
        url: decryptString(item.url),
        favIcon: decryptString(item.icon_data),
        title: item.title ? decryptString(item.title) : undefined,
      })),
    };
  }

  public getBrowserDataSecurely(): BrowserHistoryData {
    if (!this.decryptedBrowserData) {
      this.decryptBrowserData();
    }
    return this.decryptedBrowserData;
  }

  public getFavIcons(): FavIcons[] {
    return this.getBrowserDataSecurely().favIcons;
  }

  public getBrowserHistory(): string[] {
    return this.getBrowserDataSecurely().historyAddress;
  }

  public updateBrowserDataSecurely(data: Partial<BrowserHistoryData>): void {
    const current = this.getBrowserDataSecurely();

    if (data.recentAddress !== undefined) {
      current.recentAddress = data.recentAddress;
      const encryptedRecent = encryptStrings(data.recentAddress);
      this.updateData('browser', {recentAddress: encryptedRecent});
    }

    if (data.favoriteAddress !== undefined) {
      current.favoriteAddress = data.favoriteAddress;
      this.clearFavoritesStatement.run();
      if (data.favoriteAddress.length > 0) {
        const now = new Date().toISOString();
        const insertStmt = this.insertFavoriteStatement;
        const tx = this.sqlite.transaction((urls: string[]) => {
          for (let i = urls.length - 1; i >= 0; i--) {
            insertStmt.run(encryptString(urls[i]), null, null, now);
          }
        });
        tx(data.favoriteAddress);
      }
    }

    if (data.historyAddress !== undefined) {
      current.historyAddress = data.historyAddress;
      this.clearHistoryStatement.run();
      if (data.historyAddress.length > 0) {
        const now = new Date().toISOString();
        const insertStmt = this.insertHistoryStatement;
        const tx = this.sqlite.transaction((urls: string[]) => {
          for (let i = urls.length - 1; i >= 0; i--) {
            insertStmt.run(encryptString(urls[i]), null, null, now);
          }
        });
        tx(data.historyAddress);
      }
    }

    if (data.favIcons !== undefined) {
      current.favIcons = data.favIcons;
      this.clearFavIconsStatement.run();
      if (data.favIcons.length > 0) {
        const now = new Date().toISOString();
        const upsertStmt = this.upsertFavIconStatement;
        const tx = this.sqlite.transaction((items: FavIcons[]) => {
          for (const item of items) {
            upsertStmt.run(
              encryptString(item.url),
              encryptString(item.favIcon),
              item.title ? encryptString(item.title) : null,
              now,
            );
          }
        });
        tx(data.favIcons);
      }
    }
  }

  private async findUrlIndex(addressArray: string[], url: string): Promise<number> {
    for (let i = 0; i < addressArray.length; i++) {
      if (!isValidURL([addressArray[i], url])) continue;
      if (await compareUrls(addressArray[i], url)) {
        return i;
      }
    }
    return -1;
  }

  public async addBrowserRecent(recentEntry: string): Promise<void> {
    const addressArray = this.getBrowserDataSecurely().recentAddress;
    const existingUrlIndex = await this.findUrlIndex(addressArray, recentEntry);

    const updatedArray =
      existingUrlIndex !== -1
        ? [recentEntry, ...addressArray.slice(0, existingUrlIndex), ...addressArray.slice(existingUrlIndex + 1)]
        : [recentEntry, ...addressArray];

    const {historyLimits} = this.getData('browser');
    const limit = historyLimits?.recentAddress ?? 100;
    const trimmed = updatedArray.length > limit ? updatedArray.slice(0, limit) : updatedArray;

    this.decryptedBrowserData.recentAddress = trimmed;
    this.updateData('browser', {recentAddress: encryptStrings(trimmed)});
  }

  public removeBrowserRecent(url: string): void {
    const addressArray = this.getBrowserDataSecurely().recentAddress;
    const updated = addressArray.filter(address => address !== url);
    this.decryptedBrowserData.recentAddress = updated;
    this.updateData('browser', {recentAddress: encryptStrings(updated)});
  }

  public async addBrowserFavorite(favoriteEntry: string): Promise<void> {
    const favoriteAddress = this.getBrowserDataSecurely().favoriteAddress;
    const existingIndex = await this.findUrlIndex(favoriteAddress, favoriteEntry);

    if (existingIndex !== -1) {
      favoriteAddress.splice(existingIndex, 1);
    }
    favoriteAddress.unshift(favoriteEntry);

    const {historyLimits} = this.getData('browser');
    const limit = historyLimits?.favoriteAddress ?? 500;
    if (favoriteAddress.length > limit) {
      favoriteAddress.length = limit;
    }

    const encUrl = encryptString(favoriteEntry);
    const now = new Date().toISOString();
    this.insertFavoriteStatement.run(encUrl, null, null, now);
    this.trimFavoritesStatement.run(limit);
  }

  public removeBrowserFavorite(url: string): void {
    const favoriteAddress = this.getBrowserDataSecurely().favoriteAddress;
    const filtered = favoriteAddress.filter(u => u !== url);
    this.decryptedBrowserData.favoriteAddress = filtered;

    const encUrl = encryptString(url);
    this.deleteFavoriteUrlStatement.run(encUrl);
  }

  public async addBrowserHistory(historyEntry: string): Promise<void> {
    const historyAddress = this.getBrowserDataSecurely().historyAddress;
    const existingIndex = await this.findUrlIndex(historyAddress, historyEntry);

    if (existingIndex !== -1) {
      historyAddress.splice(existingIndex, 1);
    }
    historyAddress.unshift(historyEntry);

    const {historyLimits} = this.getData('browser');
    const limit = historyLimits?.historyAddress ?? 1000;
    if (historyAddress.length > limit) {
      historyAddress.length = limit;
    }

    const encUrl = encryptString(historyEntry);
    const now = new Date().toISOString();
    this.insertHistoryStatement.run(encUrl, null, null, now);
    this.trimHistoryStatement.run(limit);
  }

  public removeBrowserHistory(url: string): void {
    const historyAddress = this.getBrowserDataSecurely().historyAddress;
    const filtered = historyAddress.filter(u => u !== url);
    this.decryptedBrowserData.historyAddress = filtered;

    const encUrl = encryptString(url);
    this.deleteHistoryUrlStatement.run(encUrl);
  }

  public async addBrowserFavIcon(url: string, icon: string, title?: string): Promise<void> {
    const favIcons = this.getBrowserDataSecurely().favIcons;
    let foundIndex = -1;

    for (let i = 0; i < favIcons.length; i++) {
      if (!isValidURL([favIcons[i].url, url])) continue;
      if (await compareUrls(favIcons[i].url, url)) {
        foundIndex = i;
        break;
      }
    }

    const encUrl = encryptString(url);
    const encIcon = encryptString(icon);
    const encTitle = title ? encryptString(title) : null;
    const now = new Date().toISOString();

    if (foundIndex !== -1) {
      favIcons[foundIndex].favIcon = icon;
      if (title) favIcons[foundIndex].title = title;
      const targetEncUrl = encryptString(favIcons[foundIndex].url);
      this.upsertFavIconStatement.run(targetEncUrl, encIcon, encTitle, now);
    } else {
      favIcons.push({url, favIcon: icon, title});
      this.upsertFavIconStatement.run(encUrl, encIcon, encTitle, now);
    }

    const maxFavIcons = this.getData('browser').historyLimits?.favIcons ?? 100;
    if (favIcons.length > maxFavIcons) {
      favIcons.splice(0, favIcons.length - maxFavIcons);
      this.trimFavIconsStatement.run(maxFavIcons);
    }
  }

  public async updateBrowserFavIconTitle(url: string, title: string): Promise<void> {
    const favIcons = this.getBrowserDataSecurely().favIcons;

    for (const favIcon of favIcons) {
      if (!isValidURL([favIcon.url, url])) continue;
      if (await compareUrls(favIcon.url, url)) {
        favIcon.title = title;
        const encUrl = encryptString(favIcon.url);
        const encTitle = encryptString(title);
        const now = new Date().toISOString();
        this.updateFavIconTitleStatement.run(encTitle, now, encUrl);
        break;
      }
    }
  }

  public removeBrowserFavIcon(url: string): void {
    const favIcons = this.getBrowserDataSecurely().favIcons;
    this.decryptedBrowserData.favIcons = favIcons.filter(item => item.url !== url);

    const encUrl = encryptString(url);
    this.deleteFavIconStatement.run(encUrl);
  }

  // --- Cards & Configurations Helpers ---

  private addToCardStringArray(
    arrayKey: 'autoUpdateCards' | 'autoUpdateExtensions' | 'pinnedCards',
    cardId: string,
    channel: string,
  ): void {
    const currentArray = this.getData('cards')[arrayKey];
    if (currentArray.includes(cardId)) return;

    const updatedArray = [...currentArray, cardId];

    this.updateData('cards', {[arrayKey]: updatedArray});
    sendToMain(channel, updatedArray);
  }

  private removeFromCardStringArray(
    arrayKey: 'autoUpdateCards' | 'autoUpdateExtensions' | 'pinnedCards',
    cardId: string,
    channel: string,
  ): void {
    const currentArray = this.getData('cards')[arrayKey];
    const updatedArray = currentArray.filter(id => id !== cardId);

    this.updateData('cards', {[arrayKey]: updatedArray});
    sendToMain(channel, updatedArray);
  }

  public addInstalledCard(card: InstalledCard): void {
    classHolder.waitForClass('cardsValidator').then(cardsValidator => {
      const storedCards = this.getData('cards').installedCards;
      const cardExists = storedCards.some(c => c.id === card.id);

      if (!cardExists) {
        if (card.dir && isPortable()) {
          card.dir = getRelativePath(getExePath(), card.dir);
        }
        const installedCards: InstalledCards = [...storedCards, card];
        this.updateData('cards', {installedCards});
        sendToMain(storageUtilsChannels.onInstalledCards, uniqBy(installedCards, 'id'));
        cardsValidator.changedCards();
      }
    });
  }

  public removeInstalledCard(id: string): void {
    classHolder.waitForClass('cardsValidator').then(cardsValidator => {
      const storedCards = this.getData('cards').installedCards;
      const installedCards = storedCards.filter(card => card.id !== id);
      this.updateData('cards', {installedCards});
      sendToMain(storageUtilsChannels.onInstalledCards, installedCards);
      cardsValidator.changedCards();
    });
  }

  public removeInstalledCardByPath(dir: string): void {
    const installedCards = this.getData('cards').installedCards.filter(
      card => getAbsolutePath(getExePath(), card.dir || '') !== getAbsolutePath(getExePath(), dir),
    );
    this.updateData('cards', {installedCards});
    sendToMain(storageUtilsChannels.onInstalledCards, installedCards);
  }

  public addAutoUpdateCard(cardId: string): void {
    this.addToCardStringArray('autoUpdateCards', cardId, storageUtilsChannels.onAutoUpdateCards);
  }

  public removeAutoUpdateCard(cardId: string): void {
    this.removeFromCardStringArray('autoUpdateCards', cardId, storageUtilsChannels.onAutoUpdateCards);
  }

  public addAutoUpdateExtensions(cardId: string): void {
    this.addToCardStringArray('autoUpdateExtensions', cardId, storageUtilsChannels.onAutoUpdateExtensions);
  }

  public removeAutoUpdateExtensions(cardId: string): void {
    this.removeFromCardStringArray('autoUpdateExtensions', cardId, storageUtilsChannels.onAutoUpdateExtensions);
  }

  public addPinnedCard(cardId: string): void {
    this.addToCardStringArray('pinnedCards', cardId, storageUtilsChannels.onPinnedCardsChange);
  }

  public removePinnedCard(cardId: string): void {
    this.removeFromCardStringArray('pinnedCards', cardId, storageUtilsChannels.onPinnedCardsChange);
  }

  private handleGenericStorageOperation<T>(
    opt: StorageOperation | RecentlyOperation,
    handlers: {
      add?: () => void;
      remove?: () => void;
      get?: () => T;
      set?: () => void;
      update?: () => void;
    },
  ): T | undefined {
    switch (opt) {
      case 'add':
        handlers.add?.();
        break;
      case 'remove':
        handlers.remove?.();
        break;
      case 'get':
        return handlers.get?.();
      case 'set':
        handlers.set?.();
        break;
      case 'update':
        handlers.update?.();
        break;
    }
    return undefined;
  }

  public pinnedCardsOpt(opt: StorageOperation, id: string, pinnedCards?: string[]): string[] {
    return (
      this.handleGenericStorageOperation<string[]>(opt, {
        add: () => this.addPinnedCard(id),
        remove: () => this.removePinnedCard(id),
        get: () => this.getData('cards').pinnedCards,
        set: () => {
          this.updateData('cards', {pinnedCards});
          sendToMain(storageUtilsChannels.onPinnedCardsChange, pinnedCards || []);
        },
      }) || []
    );
  }

  public updateRecentlyUsedCards(id: string): void {
    const newArray = this.getData('cards').recentlyUsedCards.filter(cardId => cardId !== id);
    newArray.unshift(id);
    const result = newArray.slice(0, 5);
    this.updateData('cards', {recentlyUsedCards: result});
    sendToMain(storageUtilsChannels.onRecentlyUsedCardsChange, result);
  }

  public recentlyUsedCardsOpt(opt: RecentlyOperation, id: string): string[] {
    return (
      this.handleGenericStorageOperation<string[]>(opt, {
        update: () => this.updateRecentlyUsedCards(id),
        get: () => this.getData('cards').recentlyUsedCards,
      }) || []
    );
  }

  public setHomeCategory(data: string[]): void {
    this.updateData('app', {homeCategory: data});
    sendToMain(storageUtilsChannels.onHomeCategory, data);
  }

  public handleHomeCategoryOperation(opt: StorageOperation, data: string[]): HomeCategory {
    return (
      this.handleGenericStorageOperation<HomeCategory>(opt, {
        set: () => this.setHomeCategory(data),
        get: () => this.getData('app').homeCategory,
      }) || []
    );
  }

  private findOrCreateCardConfig<T extends {cardId: string; data: any}>(
    configArray: T[],
    cardId: string,
    createDefault: () => T,
  ): {index: number; item: T} {
    const index = configArray.findIndex(item => item.cardId === cardId);
    if (index !== -1) {
      return {index, item: configArray[index]};
    }
    const newItem = createDefault();
    configArray.push(newItem);
    return {index: configArray.length - 1, item: newItem};
  }

  private getPreCommands(id: string): string[] {
    return this.getData('cardsConfig').preCommands.find(preCommand => preCommand.cardId === id)?.data || [];
  }

  private getCustomRun(id: string): string[] {
    return this.getData('cardsConfig').customRun.find(customRun => customRun.cardId === id)?.data || [];
  }

  private getPreOpen(id: string): PreOpenData {
    return this.getData('cardsConfig').preOpen.find(preOpen => preOpen.cardId === id)?.data || [];
  }

  private getArgs(cardId: string) {
    return this.getData('cardsConfig').args.find(arg => arg.cardId === cardId);
  }

  private setArgs(cardId: string, args: ChosenArgumentsData) {
    const currentArgs = this.getData('cardsConfig').args;
    const existingArgIndex = currentArgs.findIndex(arg => arg.cardId === cardId);

    if (existingArgIndex !== -1) {
      currentArgs[existingArgIndex] = {cardId, ...args};
    } else {
      currentArgs.push({cardId, ...args});
    }

    AddBreadcrumb_Main(
      `Card Arguments Configured: cardId:${cardId}, activePreset:${args.activePreset}, ` +
        `args:${JSON.stringify(args.data)}`,
    );
    this.updateData('cardsConfig', {args: currentArgs});
  }

  public getPreOpenById(cardId: string) {
    return this.getData('cardsConfig').preOpen.find(preOpen => preOpen.cardId === cardId);
  }

  public getPreCommandById(cardId: string) {
    return this.getData('cardsConfig').preCommands.find(preOpen => preOpen.cardId === cardId);
  }

  public getCustomRunById(cardId: string) {
    return this.getData('cardsConfig').customRun.find(preOpen => preOpen.cardId === cardId);
  }

  public async getCardArgumentsById(cardId: string): Promise<ChosenArgumentsData> {
    const moduleManager = await classHolder.waitForClass('moduleManager');
    const args = this.getArgs(cardId);
    if (args) return args;

    const getResult = (argData?: ChosenArgument[]) => {
      return {
        activePreset: 'Default',
        data: [{preset: 'Default', arguments: argData || []}],
      };
    };

    const moduleMethods = moduleManager.getMethodsById(cardId);
    if (!moduleMethods) return getResult();
    const argReader = moduleMethods().readArgs;
    if (!argReader) return getResult();

    const returnArgs = await argReader();
    const result = getResult(returnArgs);
    this.setArgs(cardId, result);

    return result;
  }

  public async setCardArguments(cardId: string, args: ChosenArgumentsData): Promise<void> {
    const moduleManager = await classHolder.waitForClass('moduleManager');
    this.setArgs(cardId, args);

    const result = args.data.find(arg => arg.preset === args.activePreset)?.arguments || [];
    const moduleMethods = moduleManager.getMethodsById(cardId);
    if (!moduleMethods) return;
    const argSaver = moduleMethods().saveArgs;
    if (!argSaver) return;

    await argSaver(result);
  }

  private handleCardCommandOperation(
    configKey: 'preCommands' | 'customRun',
    operation: 'add' | 'set' | 'remove',
    cardId: string,
    commandData: string | string[] | number,
    ipcChannel?: (data: {commands: string[]; id: string}) => void,
  ): void {
    const configArray = this.getData('cardsConfig')[configKey];
    AddBreadcrumb_Main(
      `Card Config Command Operation: key:${configKey}, operation:${operation}, ` +
        `cardId:${cardId}, payload:${JSON.stringify(commandData)}`,
    );

    switch (operation) {
      case 'add': {
        const {item} = this.findOrCreateCardConfig(configArray, cardId, () => ({cardId, data: []}));
        item.data.push(commandData as string);
        ipcChannel?.({commands: item.data, id: cardId});
        this.updateData('cardsConfig', {[configKey]: configArray});
        break;
      }

      case 'set': {
        const {item} = this.findOrCreateCardConfig(configArray, cardId, () => ({cardId, data: []}));
        item.data = commandData as string[];
        this.updateData('cardsConfig', {[configKey]: configArray});
        break;
      }

      case 'remove': {
        const indexFound = configArray.findIndex(item => item.cardId === cardId);
        if (indexFound !== -1) {
          configArray[indexFound].data.splice(commandData as number, 1);
          ipcChannel?.({commands: configArray[indexFound].data, id: cardId});
          this.updateData('cardsConfig', {[configKey]: configArray});
        }
        break;
      }
    }
  }

  public addPreCommand(cardId: string, command: string): void {
    this.handleCardCommandOperation('preCommands', 'add', cardId, command, commands =>
      sendToMain(storageUtilsChannels.onPreCommands, commands),
    );
  }

  public setPreCommand(cardId: string, commands: string[]): void {
    this.handleCardCommandOperation('preCommands', 'set', cardId, commands);
  }

  public removePreCommand(cardId: string, index: number): void {
    this.handleCardCommandOperation('preCommands', 'remove', cardId, index, commands =>
      sendToMain(storageUtilsChannels.onPreCommands, commands),
    );
  }

  public handlePreCommandOperation(opt: StorageOperation, data: PreCommands): string[] {
    let result: string[] = [];

    switch (opt) {
      case 'add':
        if (typeof data.command === 'string') this.addPreCommand(data.id, data.command);
        break;
      case 'remove':
        if (typeof data.command === 'number') this.removePreCommand(data.id, data.command);
        break;
      case 'get':
        result = this.getPreCommands(data.id);
        break;
      case 'set':
        if (Array.isArray(data.command)) this.setPreCommand(data.id, data.command);
        break;
    }
    return result;
  }

  public addCustomRun(cardId: string, command: string): void {
    this.handleCardCommandOperation('customRun', 'add', cardId, command, commands =>
      sendToMain(storageUtilsChannels.onCustomRun, commands),
    );
  }

  public setCustomRun(cardId: string, commands: string[]): void {
    this.handleCardCommandOperation('customRun', 'set', cardId, commands);
  }

  public removeCustomRun(cardId: string, index: number): void {
    this.handleCardCommandOperation('customRun', 'remove', cardId, index, commands =>
      sendToMain(storageUtilsChannels.onCustomRun, commands),
    );
  }

  public handleCustomRunOperation(opt: StorageOperation, data: PreCommands): string[] {
    let result: string[] = [];

    switch (opt) {
      case 'add':
        if (typeof data.command === 'string') this.addCustomRun(data.id, data.command);
        break;
      case 'remove':
        if (typeof data.command === 'number') this.removeCustomRun(data.id, data.command);
        break;
      case 'get':
        result = this.getCustomRun(data.id);
        break;
      case 'set':
        if (Array.isArray(data.command)) this.setCustomRun(data.id, data.command);
        break;
    }
    return result;
  }

  public addPreOpen(cardId: string, open: {type: 'folder' | 'file'; path: string}): void {
    const preOpen = this.getData('cardsConfig').preOpen;
    const existingCustomRunIndex = preOpen.findIndex(custom => custom.cardId === cardId);

    let targetOpen = open;
    if (targetOpen.path && isPortable()) {
      targetOpen = {type: targetOpen.type, path: getRelativePath(getExePath(), open.path)};
    }

    AddBreadcrumb_Main(`Card Pre-Open Added: cardId:${cardId}, type:${targetOpen.type}, ` + `path:${targetOpen.path}`);

    if (existingCustomRunIndex !== -1) {
      preOpen[existingCustomRunIndex].data.push(targetOpen);
    } else {
      preOpen.push({cardId, data: [targetOpen]});
    }
    this.updateData('cardsConfig', {preOpen});
  }

  public removePreOpen(cardId: string, index: number): void {
    const preOpen = this.getData('cardsConfig').preOpen;
    const existCommand = preOpen.findIndex(command => command.cardId === cardId);

    if (existCommand !== -1) {
      const removedItem = preOpen[existCommand].data[index];
      AddBreadcrumb_Main(`Card Pre-Open Removed: cardId:${cardId}, item:${JSON.stringify(removedItem)}`);
      preOpen[existCommand].data.splice(index, 1);
    }
    this.updateData('cardsConfig', {preOpen});
  }

  public handlePreOpenOperation(opt: StorageOperation, data: PreOpen): PreOpenData {
    let result: PreOpenData = [];

    switch (opt) {
      case 'add':
        if (typeof data.open === 'object' && data.open) this.addPreOpen(data.id, data.open);
        break;
      case 'remove':
        if (typeof data.open === 'number') this.removePreOpen(data.id, data.open);
        break;
      case 'get':
        result = this.getPreOpen(data.id);
        break;
    }
    return result;
  }

  public updateCustomRunBehavior(data: Partial<CustomRunBehaviorData>): void {
    if (!data.cardID) return;

    AddBreadcrumb_Main(`Card Run Behavior Updated: cardId:${data.cardID}, payload:${JSON.stringify(data)}`);
    let customRunBehavior = this.getData('cardsConfig').customRunBehavior;
    const existCustom = customRunBehavior.findIndex(command => command.cardID === data.cardID);

    if (existCustom !== -1) {
      customRunBehavior[existCustom] = {...customRunBehavior[existCustom], ...data};
    } else {
      customRunBehavior = [
        ...customRunBehavior,
        {
          ...{
            cardID: data.cardID,
            browser: 'appBrowser',
            terminal: 'runScript',
            urlCatch: {
              type: 'module',
              moduleDelay: 0,
              delay: 5,
              customUrl: undefined,
              findLine: undefined,
            },
          },
          ...data,
        },
      ];
    }
    this.updateData('cardsConfig', {customRunBehavior});
  }

  public updateLastSize(): void {
    classHolder.waitForClass('appManager').then(appManager => {
      const isMaximized = appManager.getMainWindow()?.isMaximized() || false;
      const bounds = appManager.getMainWindow()?.getBounds();
      const prevBounds = this.getData('app').lastSize?.bounds;

      this.updateData('app', {
        lastSize: {
          maximized: isMaximized,
          bounds: isMaximized ? prevBounds : bounds,
        },
      });
    });
  }

  public setShowConfirm(type: ConfirmMenuTypes, enable: boolean): void {
    const prevState = this.getData('app');
    (prevState as any)[type] = enable;
    sendToMain(storageUtilsChannels.onConfirmChange, type, enable);
    this.setData('app', prevState);
  }

  public addReadNotif(id: string): void {
    const prevReadNotifs = this.getData('notification').readNotifs;
    if (prevReadNotifs.includes(id)) return;

    this.updateData('notification', {readNotifs: [...prevReadNotifs, id]});

    getTokens(AUTH_LOGIN_KEY)
      .then(async token => {
        if (token) {
          try {
            await axios.post(
              `${LYNXHUB_WEBSITE}/api/notifications/dismiss`,
              {notificationId: id},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                timeout: 5000,
              },
            );
          } catch (error) {
            console.error(
              'Failed to sync notification dismissal to website:',
              axios.isAxiosError(error) ? error.message : error,
            );
          }
        }
      })
      .catch(err => {
        console.error('Error retrieving login token for notification dismissal sync:', err);
      });
  }

  public setCardTerminalPreCommands(id: string, commands: string[]): void {
    const commandLines = commands.map(command => `${command}${terminalLineEnding}`);
    let cardTerminalPreCommands = this.getData('cards').cardTerminalPreCommands;
    const findIndex = cardTerminalPreCommands.findIndex(command => command.id === id);

    if (findIndex !== -1) {
      cardTerminalPreCommands[findIndex] = {id, commands: commandLines};
    } else {
      cardTerminalPreCommands = [...cardTerminalPreCommands, {id, commands: commandLines}];
    }
    this.updateData('cards', {cardTerminalPreCommands});
  }

  public unassignCard(id: string, clearConfigs: boolean): void {
    const cards = this.getData('cards');
    const cardsConfig = this.getData('cardsConfig');

    this.removeInstalledCard(id);

    if (clearConfigs) {
      cards.autoUpdateCards = cards.autoUpdateCards.filter(card => card !== id);
      cards.autoUpdateExtensions = cards.autoUpdateExtensions.filter(card => card !== id);
      cards.pinnedCards = cards.pinnedCards.filter(card => card !== id);
      cards.recentlyUsedCards = cards.recentlyUsedCards.filter(card => card !== id);

      cardsConfig.customRun = cardsConfig.customRun.filter(card => card.cardId !== id);
      cardsConfig.preOpen = cardsConfig.preOpen.filter(card => card.cardId !== id);
      cardsConfig.preCommands = cardsConfig.preCommands.filter(card => card.cardId !== id);
      cardsConfig.customRunBehavior = cardsConfig.customRunBehavior.filter(card => card.cardID !== id);
      cardsConfig.args = cardsConfig.args.filter(card => card.cardId !== id);
    }
  }

  public getStaticsData(): {activeVersion?: string; brokenVersions?: string[]; lastCheckedAt?: string} {
    const res = this.db.select().from(schema.staticsStorage).where(eq(schema.staticsStorage.id, 'main')).get();
    if (!res) {
      return {};
    }
    return {
      activeVersion: res.activeVersion ?? undefined,
      brokenVersions: (res.brokenVersions as string[]) ?? [],
      lastCheckedAt: res.lastCheckedAt ?? undefined,
    };
  }

  public updateStaticsData(
    data: Partial<{activeVersion?: string; brokenVersions?: string[]; lastCheckedAt?: string}>,
  ): void {
    const current = this.getStaticsData();
    const updated = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.db
      .insert(schema.staticsStorage)
      .values({
        id: 'main',
        activeVersion: updated.activeVersion,
        brokenVersions: updated.brokenVersions ?? [],
        lastCheckedAt: updated.lastCheckedAt,
        updatedAt: updated.updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.staticsStorage.id,
        set: {
          activeVersion: updated.activeVersion,
          brokenVersions: updated.brokenVersions ?? [],
          lastCheckedAt: updated.lastCheckedAt,
          updatedAt: updated.updatedAt,
        },
      })
      .run();
  }

  // ===================== Bookmarks Operations =====================

  public getAllBookmarks(): BookmarkNode[] {
    const rows = this.sqlite
      .prepare(
        'SELECT id, parent_id, type, title, url, fav_icon, `order`, created_at, updated_at' +
          ' FROM browser_bookmarks ORDER BY parent_id ASC, `order` ASC, id ASC',
      )
      .all() as {
      id: string;
      parent_id: string | null;
      type: 'bookmark' | 'folder';
      title: string;
      url: string | null;
      fav_icon: string | null;
      order: number;
      created_at: string;
      updated_at: string;
    }[];

    return rows.map(r => ({
      id: r.id,
      parentId: r.parent_id,
      type: r.type,
      title: r.title,
      url: r.url ?? undefined,
      favIcon: r.fav_icon ?? undefined,
      order: r.order,
      createdAt: new Date(r.created_at).getTime(),
      updatedAt: new Date(r.updated_at).getTime(),
    }));
  }

  public getBookmarksTree(): BookmarkFolder {
    const all = this.getAllBookmarks();
    const map = new Map<string, BookmarkFolder>();

    const root: BookmarkFolder = {
      id: 'bookmarks_bar',
      type: 'folder',
      title: 'Bookmarks Bar',
      parentId: null,
      order: 0,
      createdAt: 0,
      updatedAt: 0,
      children: [],
    };
    map.set('bookmarks_bar', root);

    // First create folder entries in map
    for (const item of all) {
      if (item.type === 'folder') {
        map.set(item.id, {...item, type: 'folder', children: []});
      }
    }

    // Attach items to their parent folders
    for (const item of all) {
      const parentId = item.parentId || 'bookmarks_bar';
      const parent = map.get(parentId) || root;
      if (item.type === 'folder') {
        const folder = map.get(item.id);
        if (folder && folder !== parent) {
          parent.children.push(folder);
        }
      } else {
        parent.children.push(item);
      }
    }

    return root;
  }

  public addBookmark(input: CreateBookmarkInput): BookmarkNode {
    const parentId = input.parentId ?? 'bookmarks_bar';
    const now = new Date().toISOString();
    const id = randomUUID();

    const maxOrderRow = this.sqlite
      .prepare(
        'SELECT MAX(`order`) as maxOrder FROM browser_bookmarks' +
          ' WHERE parent_id = ? OR (parent_id IS NULL AND ? IS NULL)',
      )
      .get(parentId, parentId) as {maxOrder: number | null} | undefined;
    const order = (maxOrderRow?.maxOrder ?? -1) + 1;

    this.sqlite
      .prepare(
        'INSERT INTO browser_bookmarks (id, parent_id, type, title, url, fav_icon, `order`, created_at, updated_at)' +
          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, parentId, input.type, input.title, input.url ?? null, input.favIcon ?? null, order, now, now);

    return {
      id,
      parentId,
      type: input.type,
      title: input.title,
      url: input.url,
      favIcon: input.favIcon,
      order,
      createdAt: new Date(now).getTime(),
      updatedAt: new Date(now).getTime(),
    };
  }

  public updateBookmark(id: string, updates: UpdateBookmarkInput): BookmarkNode | null {
    const existing = this.sqlite.prepare('SELECT * FROM browser_bookmarks WHERE id = ?').get(id) as
      | {
          id: string;
          parent_id: string | null;
          type: 'bookmark' | 'folder';
          title: string;
          url: string | null;
          fav_icon: string | null;
          order: number;
          created_at: string;
          updated_at: string;
        }
      | undefined;

    if (!existing) return null;

    const now = new Date().toISOString();
    const parentId = updates.parentId !== undefined ? updates.parentId : existing.parent_id;
    const title = updates.title !== undefined ? updates.title : existing.title;
    const url = updates.url !== undefined ? updates.url : existing.url;
    const favIcon = updates.favIcon !== undefined ? updates.favIcon : existing.fav_icon;
    const order = updates.order !== undefined ? updates.order : existing.order;

    this.sqlite
      .prepare(
        'UPDATE browser_bookmarks SET parent_id = ?, title = ?, url = ?,' +
          ' fav_icon = ?, `order` = ?, updated_at = ? WHERE id = ?',
      )
      .run(parentId, title, url, favIcon, order, now, id);

    return {
      id,
      parentId,
      type: existing.type,
      title,
      url: url ?? undefined,
      favIcon: favIcon ?? undefined,
      order,
      createdAt: new Date(existing.created_at).getTime(),
      updatedAt: new Date(now).getTime(),
    };
  }

  public removeBookmark(id: string): void {
    const toDelete = new Set<string>([id]);
    const findChildren = (parentIds: string[]) => {
      if (parentIds.length === 0) return;
      const placeholders = parentIds.map(() => '?').join(',');
      const rows = this.sqlite
        .prepare(`SELECT id, type FROM browser_bookmarks WHERE parent_id IN (${placeholders})`)
        .all(...parentIds) as {id: string; type: string}[];

      const nextFolderIds: string[] = [];
      for (const row of rows) {
        toDelete.add(row.id);
        if (row.type === 'folder') {
          nextFolderIds.push(row.id);
        }
      }
      if (nextFolderIds.length > 0) {
        findChildren(nextFolderIds);
      }
    };

    findChildren([id]);

    const allIds = Array.from(toDelete);
    const placeholders = allIds.map(() => '?').join(',');
    this.sqlite.prepare(`DELETE FROM browser_bookmarks WHERE id IN (${placeholders})`).run(...allIds);
  }

  public reorderBookmarks(items: {id: string; order: number; parentId: string | null}[]): void {
    const now = new Date().toISOString();
    const stmt = this.sqlite.prepare(
      'UPDATE browser_bookmarks SET `order` = ?, parent_id = ?, updated_at = ? WHERE id = ?',
    );
    this.sqlite.transaction(() => {
      for (const item of items) {
        stmt.run(item.order, item.parentId, now, item.id);
      }
    })();
  }

  public close(): void {
    this.baseStorage.close();
  }
}

export default SqliteStorageManager;
