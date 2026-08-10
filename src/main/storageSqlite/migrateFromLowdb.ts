import {join} from 'node:path';

import {is} from '@electron-toolkit/utils';
import {APP_NAME} from '@lynx_common/consts';
import {getExePath, isPortable} from '@lynx_main/utils';
import {app} from 'electron';
import fs from 'graceful-fs';

import SqliteStorageManager from './storageOperations';

export type MigrationSummary = {
  mainMigrated: boolean;
  browserMigrated: boolean;
  extensionsMigratedCount: number;
  modulesMigratedCount: number;
  errors: string[];
};

/**
 * Reads lowdb JSON configuration files from disk and populates the SQLite database.
 * NOTE: This function is NOT executed automatically on startup, but is available to be called when needed.
 *
 * @param sqliteManager Optional custom SqliteStorageManager instance.
 * @param customDataDir Optional custom directory path to scan for lowdb config files.
 * @returns MigrationSummary object with details of migrated files.
 */
export async function migrateLowdbToSqlite(
  sqliteManager?: SqliteStorageManager,
  customDataDir?: string,
): Promise<MigrationSummary> {
  const manager = sqliteManager ?? new SqliteStorageManager();
  const summary: MigrationSummary = {
    mainMigrated: false,
    browserMigrated: false,
    extensionsMigratedCount: 0,
    modulesMigratedCount: 0,
    errors: [],
  };

  const isDevMode = is.dev;
  const dataDir =
    customDataDir ?? (isPortable() ? join(getExePath(), `${APP_NAME}_Data`) : join(app.getPath('userData')));

  if (!fs.existsSync(dataDir)) {
    summary.errors.push(`Data directory '${dataDir}' does not exist.`);
    return summary;
  }

  // 1. Migrate Main Config
  const mainFile = isDevMode ? `${APP_NAME}-Dev.config` : `${APP_NAME}.config`;
  const mainPath = join(dataDir, mainFile);
  if (fs.existsSync(mainPath)) {
    try {
      const rawContent = fs.readFileSync(mainPath, 'utf-8');
      const mainData = JSON.parse(rawContent);

      const knownKeys = [
        'app',
        'cards',
        'cardsConfig',
        'terminal',
        'browser',
        'notification',
        'plugin',
        'performance',
        'storage',
      ];

      for (const [key, val] of Object.entries(mainData)) {
        if (knownKeys.includes(key)) {
          manager.setData(key as any, val as any);
        } else {
          // Custom storage key
          manager.setCustomData(key, val);
        }
      }
      summary.mainMigrated = true;
      console.log(`[LowDB Migration] Successfully migrated main storage from '${mainFile}'.`);
    } catch (err: any) {
      summary.errors.push(`Error reading main LowDB file '${mainFile}': ${err?.message || err}`);
    }
  }

  // 2. Migrate Browser Config
  const browserFile = isDevMode ? `${APP_NAME}-Browser-Dev.config` : `${APP_NAME}-Browser.config`;
  const browserPath = join(dataDir, browserFile);
  if (fs.existsSync(browserPath)) {
    try {
      const rawContent = fs.readFileSync(browserPath, 'utf-8');
      const browserData = JSON.parse(rawContent);
      manager.setData('browser', browserData);
      summary.browserMigrated = true;
      console.log(`[LowDB Migration] Successfully migrated browser storage from '${browserFile}'.`);
    } catch (err: any) {
      summary.errors.push(`Error reading browser LowDB file '${browserFile}': ${err?.message || err}`);
    }
  }

  // 3. Migrate Extension & Module Config files
  try {
    const files = fs.readdirSync(dataDir);
    for (const file of files) {
      if (!file.endsWith('.config') && !file.endsWith('.json')) continue;
      if (file === mainFile || file === browserFile) continue;

      const fullPath = join(dataDir, file);
      const fileNameWithoutExt = file.replace(/\.(config|json)$/, '');

      // Check if file is extension or module config
      try {
        const rawContent = fs.readFileSync(fullPath, 'utf-8');
        const fileData = JSON.parse(rawContent);

        if (typeof fileData === 'object' && fileData !== null) {
          // Identify if it's an extension or module
          if (file.toLowerCase().includes('extension') || file.toLowerCase().includes('ext')) {
            const extName = fileNameWithoutExt.replace(/-Dev$/, '');
            for (const [k, v] of Object.entries(fileData)) {
              manager.setExtensionData(extName, k, v);
            }
            summary.extensionsMigratedCount++;
          } else {
            const modName = fileNameWithoutExt.replace(/-Dev$/, '');
            for (const [k, v] of Object.entries(fileData)) {
              manager.setModuleData(modName, k, v);
            }
            summary.modulesMigratedCount++;
          }
        }
      } catch (err: any) {
        summary.errors.push(`Error reading plugin LowDB file '${file}': ${err?.message || err}`);
      }
    }
  } catch (err: any) {
    summary.errors.push(`Error scanning directory for extension/module configs: ${err?.message || err}`);
  }

  console.log('[LowDB Migration] LowDB to SQLite migration complete.', summary);
  return summary;
}

export default migrateLowdbToSqlite;
