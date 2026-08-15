import {join} from 'node:path';

import {APP_NAME} from '@lynx_common/consts';
import {getExePath, isPortable} from '@lynx_main/utils';
import type {Database as SqliteDatabase} from 'better-sqlite3';
import Database from 'better-sqlite3';
import {type BetterSQLite3Database, drizzle} from 'drizzle-orm/better-sqlite3';
import {app} from 'electron';
import fs from 'graceful-fs';

import * as schema from './schema';

export type DatabaseInstance = {
  sqlite: SqliteDatabase;
  db: BetterSQLite3Database<typeof schema>;
  dbPath: string;
};

export type DevDatabaseInstance = DatabaseInstance;

/**
 * Creates and initializes the development SQLite database connection.
 * Database file: LynxHub-Dev.db
 */
export function createDevDatabase(): DatabaseInstance {
  const dbFileName = `${APP_NAME}-Dev.db`;
  let dbPath = join(app.getPath('userData'), dbFileName);

  if (isPortable()) {
    const dataFolderPath = join(getExePath(), `${APP_NAME}_Data`);
    if (!fs.existsSync(dataFolderPath)) {
      fs.mkdirSync(dataFolderPath, {recursive: true});
    }
    dbPath = join(dataFolderPath, dbFileName);
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('mmap_size = 268435456');
  sqlite.pragma('cache_size = -32000');
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, {schema});
  return {sqlite, db, dbPath};
}
