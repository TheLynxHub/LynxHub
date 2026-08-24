import {dirname, isAbsolute, join, resolve} from 'node:path';

import {
  BINARIES_FOLDER_NAME,
  PLUGINS_FOLDER_NAME,
  REPOSITORIES_FOLDER_NAME,
  STATICS_FOLDER_NAME,
} from '@lynx_common/consts';
import {FolderNames} from '@lynx_common/types';
import {isWin} from '@lynx_common/utils';
import {changeWindowState} from '@lynx_main/ipc/methods/windowUtils';
import {getExePath, getRelativePath, isPortable} from '@lynx_main/utils';
import {robustWipe} from '@lynx_main/utils/fileSystem';
import {app, BrowserWindow, dialog} from 'electron';
import fs from 'graceful-fs';

import classHolder from './classHolder';

const DIRECTORIES = [PLUGINS_FOLDER_NAME, BINARIES_FOLDER_NAME, REPOSITORIES_FOLDER_NAME, STATICS_FOLDER_NAME] as const;

/**
 * Creates application directories in the app data path.
 * Ensures all required subdirectories exist.
 * @throws {Error} If directory creation fails
 */
export async function checkAppDirectories(): Promise<void> {
  const appDataPath = getAppDataPath();

  try {
    await Promise.all(DIRECTORIES.map(dir => fs.promises.mkdir(join(appDataPath, dir), {recursive: true})));
  } catch (error) {
    console.error('Error creating directories:', error);
    throw error;
  }
}

/**
 * Gets the full path for a specific app directory.
 * @param name - The name of the directory
 * @returns The full path to the specified directory
 */
export function getAppDirectory(name: FolderNames): string {
  return join(getAppDataPath(), name);
}

/**
 * Retrieves the app data path from storage.
 * Resolves relative paths against the executable location.
 */
export function getAppDataPath(): string {
  const {storageManager} = classHolder;
  const dataDir = storageManager.getData('app').appDataDir;

  if (isAbsolute(dataDir)) return dataDir;

  return join(getExePath(), dataDir);
}

/**
 * Sets a new app data folder and restarts the app.
 * @param targetDir - The new destination folder
 */
function setAppDataFolder(targetDir: string): void {
  const {storageManager, appManager} = classHolder;
  storageManager.updateData('app', {appDataDir: targetDir});

  if (isPortable() === 'linux') {
    changeWindowState('close');
  } else {
    appManager?.restart();
  }
}

/**
 * Prompts the user to select a new app data folder.
 * @param targetWindow - Optional window to attach the dialog to
 * @returns A promise that resolves when a new folder is selected or rejects if cancelled
 */
export async function selectNewAppDataFolder(targetWindow?: BrowserWindow): Promise<string> {
  const {appManager} = classHolder;
  const window = targetWindow || appManager?.getMainWindow();

  if (!window) {
    throw new Error('Main window is not available. Please ensure the application is properly initialized.');
  }

  const result = await dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
    title: 'Select Application Data Folder',
    buttonLabel: 'Select Folder',
  });

  if (result.canceled) {
    throw new Error('Folder selection was cancelled.');
  }

  if (!result.filePaths || result.filePaths.length === 0) {
    throw new Error('No folder was selected. Please try again.');
  }

  const targetPath = result.filePaths[0];

  try {
    // Verify write access
    fs.accessSync(targetPath, fs.constants.R_OK | fs.constants.W_OK);

    const newPath = getRelativePath(getExePath(), targetPath);
    setAppDataFolder(newPath);

    return 'Application data folder has been successfully updated.';
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === 'ENOENT') {
        throw new Error('The selected folder does not exist or has been moved.', {cause: error});
      } else if (nodeError.code === 'EACCES') {
        throw new Error(
          `Permission denied. Try running as ${isWin ? 'administrator' : 'sudo'}` + ` or select another folder.`,
          {cause: error},
        );
      }
    }

    throw new Error(
      `Unable to access the selected folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {cause: error},
    );
  }
}

/**
 * Checks if a given directory is within the application installation path,
 * the application source root, or the application data path.
 * @param dir - The directory to check
 * @returns True if the directory is inside any application path
 */
export async function isAppDir(dir: string): Promise<boolean> {
  if (!dir) return false;

  const target = isWin ? resolve(dir).toLowerCase() : resolve(dir);
  const exePath = isWin ? resolve(dirname(app.getPath('exe'))).toLowerCase() : resolve(dirname(app.getPath('exe')));
  const appPath = isWin ? resolve(app.getAppPath()).toLowerCase() : resolve(app.getAppPath());

  const isInsideOrEqual = (basePath: string) => {
    if (!basePath) return false;
    if (target === basePath) return true;
    const separator = isWin ? '\\' : '/';
    const prefix = basePath.endsWith(separator) ? basePath : `${basePath}${separator}`;
    return target.startsWith(prefix);
  };

  return isInsideOrEqual(exePath) || isInsideOrEqual(appPath);
}

/**
 * Cleans up leftover renamed (_old_*) folders for statics and plugins from previous sessions.
 */
export async function cleanupLeftoverOldFolders(): Promise<void> {
  const appDataPath = getAppDataPath();
  const staticsPath = getAppDirectory('Statics');
  const pluginsPath = getAppDirectory('Plugins');

  const oldFolderPattern = /_old_\d+/;

  // 1. Clean up old folders in appDataPath root
  try {
    if (fs.existsSync(appDataPath)) {
      const entries = await fs.promises.readdir(appDataPath, {withFileTypes: true});
      for (const entry of entries) {
        if (oldFolderPattern.test(entry.name)) {
          const fullPath = join(appDataPath, entry.name);
          try {
            robustWipe(fullPath);
            console.log(`cleanupLeftoverOldFolders: Cleaned up leftover folder: ${entry.name}`);
          } catch (err) {
            console.warn(`cleanupLeftoverOldFolders: Failed to delete ${fullPath}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('cleanupLeftoverOldFolders: Error cleaning up old root folders:', err);
  }

  // 2. Clean up old statics items in staticsPath
  try {
    if (fs.existsSync(staticsPath)) {
      const entries = await fs.promises.readdir(staticsPath, {withFileTypes: true});
      for (const entry of entries) {
        if (oldFolderPattern.test(entry.name)) {
          const fullPath = join(staticsPath, entry.name);
          try {
            robustWipe(fullPath);
            console.log(`cleanupLeftoverOldFolders: Cleaned up leftover statics item: ${entry.name}`);
          } catch (err) {
            console.warn(`cleanupLeftoverOldFolders: Failed to delete ${fullPath}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.error('cleanupLeftoverOldFolders: Error cleaning up old statics items:', err);
  }

  // 3. Clean up old plugin folders and temporary subfolders in pluginsPath
  try {
    if (fs.existsSync(pluginsPath)) {
      const entries = await fs.promises.readdir(pluginsPath, {withFileTypes: true});
      for (const entry of entries) {
        const fullPath = join(pluginsPath, entry.name);
        if (oldFolderPattern.test(entry.name)) {
          try {
            robustWipe(fullPath);
            console.log(`cleanupLeftoverOldFolders: Cleaned up leftover plugin folder: ${entry.name}`);
          } catch (err) {
            console.warn(`cleanupLeftoverOldFolders: Failed to delete ${fullPath}:`, err);
          }
        } else if (entry.isDirectory()) {
          try {
            const subEntries = await fs.promises.readdir(fullPath, {withFileTypes: true});
            for (const subEntry of subEntries) {
              if (oldFolderPattern.test(subEntry.name) || subEntry.name === '.tmp') {
                const subFullPath = join(fullPath, subEntry.name);
                try {
                  robustWipe(subFullPath);
                  console.log(`cleanupLeftoverOldFolders: Cleaned up plugin sub-item: ${entry.name}/${subEntry.name}`);
                } catch (err) {
                  console.warn(`cleanupLeftoverOldFolders: Failed to delete ${subFullPath}:`, err);
                }
              }
            }
          } catch {
            // Ignore if subfolder read fails
          }
        }
      }
    }
  } catch (err) {
    console.error('cleanupLeftoverOldFolders: Error cleaning up old plugin folders:', err);
  }
}
