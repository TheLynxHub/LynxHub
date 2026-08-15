import {join} from 'node:path';

import {is} from '@electron-toolkit/utils';
import {APP_NAME} from '@lynx_common/consts';
import {getAppDataPath} from '@lynx_main/managers/dataFolder';
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

const KNOWN_EXTENSIONS = new Set(['hardware_monitor', 'python_toolkit', 'ai_news', 'custom_actions', 'skills_toolkit']);

const KNOWN_MODULES = new Set(['local_ai_collection']);

/**
 * Resolves whether a plugin is an extension or a module.
 * Checks known plugin IDs, local statics metadata on disk, and naming patterns.
 */
function getPluginType(pluginId: string): 'extension' | 'module' {
  const normId = pluginId.toLowerCase();

  if (KNOWN_EXTENSIONS.has(normId)) return 'extension';
  if (KNOWN_MODULES.has(normId)) return 'module';

  try {
    const appDataPath = getAppDataPath();
    const staticsDir = join(appDataPath, 'Statics');
    if (fs.existsSync(staticsDir)) {
      const versions = fs.readdirSync(staticsDir);
      for (const ver of versions) {
        const metaPath = join(staticsDir, ver, 'plugins', pluginId, 'metadata.json');
        if (fs.existsSync(metaPath)) {
          const raw = fs.readFileSync(metaPath, 'utf-8');
          const meta = JSON.parse(raw);
          if (meta.type === 'extension' || meta.type === 'module') {
            return meta.type;
          }
        }
      }
    }
  } catch {
    // Ignore error attempting to read statics metadata
  }

  if (
    normId.startsWith('extension-') ||
    normId.startsWith('extensions-') ||
    normId.endsWith('-extension') ||
    normId.endsWith('-extensions') ||
    normId.includes('extension')
  ) {
    return 'extension';
  }

  return 'module';
}

/**
 * Helper to unpack LowDB nested wrapper format ({ data: { ... } }) if present.
 */
function unpackLowdbData(rawObj: any): any {
  if (
    rawObj &&
    typeof rawObj === 'object' &&
    !Array.isArray(rawObj) &&
    'data' in rawObj &&
    Object.keys(rawObj).length === 1 &&
    typeof rawObj.data === 'object' &&
    rawObj.data !== null &&
    !Array.isArray(rawObj.data)
  ) {
    return rawObj.data;
  }
  return rawObj;
}

/**
 * Reads lowdb JSON configuration files from disk and populates the SQLite database synchronously.
 *
 * @param sqliteManager Optional custom SqliteStorageManager instance.
 * @param customDataDir Optional custom directory path to scan for lowdb config files.
 * @returns MigrationSummary object with details of migrated files.
 */
export function migrateLowdbToSqlite(sqliteManager?: SqliteStorageManager, customDataDir?: string): MigrationSummary {
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

  const mainFile = isDevMode ? `${APP_NAME}-Dev.config` : `${APP_NAME}.config`;
  const browserFile = isDevMode ? `${APP_NAME}-Browser-Dev.config` : `${APP_NAME}-Browser.config`;

  try {
    manager.sqlite.transaction(() => {
      // 1. Migrate Main Config
      const mainPath = join(dataDir, mainFile);
      if (fs.existsSync(mainPath)) {
        try {
          const rawContent = fs.readFileSync(mainPath, 'utf-8');
          const rawData = JSON.parse(rawContent);
          const mainData = unpackLowdbData(rawData);

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
      const browserPath = join(dataDir, browserFile);
      if (fs.existsSync(browserPath)) {
        try {
          const rawContent = fs.readFileSync(browserPath, 'utf-8');
          const rawData = JSON.parse(rawContent);
          const browserData = unpackLowdbData(rawData);
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

        // Filter for valid plugin .config files only (skip main, browser, and non-.config files)
        const pluginFiles = files.filter(file => {
          if (!file.endsWith('.config')) return false;
          const isMainOrBrowser =
            file.startsWith(`${APP_NAME}.config`) ||
            file.startsWith(`${APP_NAME}-Dev.config`) ||
            file.startsWith(`${APP_NAME}-Browser`);
          return !isMainOrBrowser;
        });

        // Group plugin candidate files by base plugin ID and choose appropriate variant for current environment
        const chosenFilesMap = new Map<string, string>();
        for (const file of pluginFiles) {
          const baseName = file.replace(/\.config$/, '').replace(/-Dev$/, '');
          const isDevFile = file.endsWith('-Dev.config');

          if (isDevMode) {
            if (isDevFile || !chosenFilesMap.has(baseName)) {
              chosenFilesMap.set(baseName, file);
            }
          } else {
            if (!isDevFile || !chosenFilesMap.has(baseName)) {
              chosenFilesMap.set(baseName, file);
            }
          }
        }

        for (const [pluginId, chosenFile] of chosenFilesMap.entries()) {
          const fullPath = join(dataDir, chosenFile);

          try {
            const rawContent = fs.readFileSync(fullPath, 'utf-8');
            const rawData = JSON.parse(rawContent);
            const pluginData = unpackLowdbData(rawData);

            if (typeof pluginData === 'object' && pluginData !== null) {
              const pluginType = getPluginType(pluginId);

              if (pluginType === 'extension') {
                for (const [k, v] of Object.entries(pluginData)) {
                  manager.setExtensionData(pluginId, k, v);
                }
                summary.extensionsMigratedCount++;
              } else {
                for (const [k, v] of Object.entries(pluginData)) {
                  manager.setModuleData(pluginId, k, v);
                }
                summary.modulesMigratedCount++;
              }
            }
          } catch (err: any) {
            summary.errors.push(`Error reading plugin LowDB file '${chosenFile}': ${err?.message || err}`);
          }
        }
      } catch (err: any) {
        summary.errors.push(`Error scanning directory for extension/module configs: ${err?.message || err}`);
      }
    })();
  } catch (txErr: any) {
    summary.errors.push(`Database transaction failed during LowDB migration: ${txErr?.message || txErr}`);
  }

  console.log('[LowDB Migration] LowDB to SQLite migration complete.', summary);
  return summary;
}

export default migrateLowdbToSqlite;
