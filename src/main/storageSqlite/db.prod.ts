import {join} from 'node:path';

import {APP_NAME} from '@lynx_common/consts';
import {getExePath, isPortable} from '@lynx_main/utils';
import type {Database as SqliteDatabase} from 'better-sqlite3';
import Database from 'better-sqlite3';
import {type BetterSQLite3Database, drizzle} from 'drizzle-orm/better-sqlite3';
import {app} from 'electron';
import fs from 'graceful-fs';

import * as schema from './schema';

export type ProdDatabaseInstance = {
  sqlite: SqliteDatabase;
  db: BetterSQLite3Database<typeof schema>;
  dbPath: string;
};

/**
 * Creates and initializes the production SQLite database connection.
 * Database file: LynxHub.db
 */
export function createProdDatabase(): ProdDatabaseInstance {
  const dbFileName = `${APP_NAME}.db`;
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

  const db = drizzle(sqlite, {schema});
  return {sqlite, db, dbPath};
}
