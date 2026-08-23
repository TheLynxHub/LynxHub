import {integer, sqliteTable, text, uniqueIndex} from 'drizzle-orm/sqlite-core';

/**
 * Metadata table storing version and app-level metadata.
 */
export const metaStorage = sqliteTable('meta_storage', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/**
 * General application configuration settings table.
 */
export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Cards (modules) installation and organization settings table.
 */
export const cardsSettings = sqliteTable('cards_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Cards execution and pre-command configuration table.
 */
export const cardsConfig = sqliteTable('cards_config', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Terminal emulator settings table.
 */
export const terminalSettings = sqliteTable('terminal_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Browser settings, user agents, download paths, and limits.
 */
export const browserSettings = sqliteTable('browser_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Browser navigation history entries.
 */
export const browserHistory = sqliteTable('browser_history', {
  id: integer('id').primaryKey({autoIncrement: true}),
  url: text('url').notNull(),
  title: text('title'),
  encryptedData: text('encrypted_data'),
  visitedAt: text('visited_at').notNull(),
});

/**
 * Browser bookmarked / favorite address entries.
 */
export const browserFavorites = sqliteTable('browser_favorites', {
  id: integer('id').primaryKey({autoIncrement: true}),
  url: text('url').notNull(),
  title: text('title'),
  encryptedData: text('encrypted_data'),
  addedAt: text('added_at').notNull(),
});

/**
 * Browser bookmarks and bookmark folders table.
 */
export const browserBookmarks = sqliteTable('browser_bookmarks', {
  id: text('id').primaryKey(),
  parentId: text('parent_id'),
  type: text('type').notNull(),
  title: text('title').notNull(),
  url: text('url'),
  favIcon: text('fav_icon'),
  showIconOnly: integer('show_icon_only', {mode: 'boolean'}).default(false),
  order: integer('order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Browser favicons cache table.
 */
export const browserFavIcons = sqliteTable('browser_fav_icons', {
  url: text('url').primaryKey(),
  iconData: text('icon_data').notNull(),
  title: text('title'),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Notification preferences and read status table.
 */
export const notificationSettings = sqliteTable('notification_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Plugin state (disabled cards, bg chat enabled cards) table.
 */
export const pluginSettings = sqliteTable('plugin_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Performance and hardware acceleration settings table.
 */
export const performanceSettings = sqliteTable('performance_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Key-value storage table for custom main application data.
 */
export const customStorage = sqliteTable('custom_storage', {
  key: text('key').primaryKey(),
  value: text('value', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Storage table for extensions (separated by extension_name and key).
 */
export const extensionStorage = sqliteTable(
  'extension_storage',
  {
    id: integer('id').primaryKey({autoIncrement: true}),
    extensionName: text('extension_name').notNull(),
    key: text('key').notNull(),
    value: text('value', {mode: 'json'}).notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [uniqueIndex('idx_extension_storage_key').on(table.extensionName, table.key)],
);

/**
 * Storage table for modules (separated by module_name and key).
 */
export const moduleStorage = sqliteTable(
  'module_storage',
  {
    id: integer('id').primaryKey({autoIncrement: true}),
    moduleName: text('module_name').notNull(),
    key: text('key').notNull(),
    value: text('value', {mode: 'json'}).notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  table => [uniqueIndex('idx_module_storage_key').on(table.moduleName, table.key)],
);

/**
 * Statics version metadata table storing active version, broken versions, and check timestamps.
 */
export const staticsStorage = sqliteTable('statics_storage', {
  id: text('id').primaryKey(),
  activeVersion: text('active_version'),
  brokenVersions: text('broken_versions', {mode: 'json'}),
  lastCheckedAt: text('last_checked_at'),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Quick Web floating window configuration and items table.
 */
export const quickWebSettings = sqliteTable('quick_web_settings', {
  id: text('id').primaryKey(),
  data: text('data', {mode: 'json'}).notNull(),
  updatedAt: text('updated_at').notNull(),
});
