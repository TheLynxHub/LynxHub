// Card extensions IPC methods - Manages extension details, updates, and enable/disable operations
import path from 'node:path';

import {ExtensionsData, ExtensionsUpdateStatus} from '@lynx_common/types/ipc';
import {utilsIpc} from '@lynx_main/ipc/utils';
import classHolder from '@lynx_main/managers/classHolder';
import {calculateFolderSize} from '@lynx_main/utils';
import fs from 'graceful-fs';

// Global flag to control extension loading cancellation
let isLoadingExtensions = false;

/**
 * stops the extension loading process.
 */
export function disableExtensionsLoading(): void {
  isLoadingExtensions = false;
}

/**
 * Retrieves plugin folders from a given directory.
 * @param dir - The directory to search for plugins.
 * @returns A promise that resolves to an array of folder names.
 */
async function getRepoFolders(dir: string): Promise<string[]> {
  try {
    const files = await fs.promises.readdir(dir, {withFileTypes: true});
    return files.filter(file => file.isDirectory() && !file.name.startsWith('.')).map(file => file.name);
  } catch (error) {
    console.error(`Error retrieving extension folders from ${dir}:`, error);
    return [];
  }
}

/**
 * Retrieves update status for extensions in a given directory.
 * @param dir - The directory containing the extensions.
 * @returns A promise that resolves to an array of extension update statuses.
 */
export async function getExtensionsUpdate(dir: string): Promise<ExtensionsUpdateStatus> {
  try {
    const filteredFolders = await getRepoFolders(path.resolve(dir));
    if (filteredFolders.length === 0) return [];

    isLoadingExtensions = true;

    const updateData = await Promise.all(
      filteredFolders.map(async extension => {
        if (!isLoadingExtensions) return null;
        return {id: extension, updateAvailable: false, isDisabled: extension.startsWith('.')};
      }),
    );

    return isLoadingExtensions ? (updateData.filter(Boolean) as ExtensionsUpdateStatus) : [];
  } catch (error) {
    console.error(`Error retrieving extension updates from ${dir}:`, error);
    return [];
  }
}

/**
 * Retrieves detailed information about extensions in a given directory.
 * @param dir - The directory containing the extensions.
 * @returns A promise that resolves to an array of extension details or 'empty' if no extensions are found.
 */
export async function getExtensionsDetails(dir: string): Promise<ExtensionsData | 'empty'> {
  try {
    const filteredFolders = await getRepoFolders(path.resolve(dir));
    if (filteredFolders.length === 0) return 'empty';

    isLoadingExtensions = true;

    const extensionsData = await Promise.all(
      filteredFolders.map(async extension => {
        if (!isLoadingExtensions) return null;
        const extensionDir = path.join(dir, extension);
        const size = await calculateFolderSize(extensionDir);
        return {name: extension, remoteUrl: '', size, isDisabled: extension.startsWith('.')};
      }),
    );

    return isLoadingExtensions ? (extensionsData.filter(Boolean) as ExtensionsData) : 'empty';
  } catch (error) {
    console.error(`Error retrieving extension details from ${dir}:`, error);
    return 'empty';
  }
}

/**
 * Enables or disables an extension by renaming its directory (prefixing with dot).
 * @param disable - Whether to disable or enable the extension.
 * @param dir - The path to the extension directory.
 * @returns The new path of the extension directory.
 */
export async function disableExtension(disable: boolean, dir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const targetDir = path.resolve(dir);

      // Use sync methods inside Promise to catch errors in try-catch block,
      // but ideally this should be async. However, keeping logic similar to original for safety.
      if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
        reject(new Error(`${dir} not exist.`));
        return;
      }

      const parsedPath = path.parse(targetDir);
      const currentName = parsedPath.base;
      let newName = currentName;

      if (disable) {
        if (!currentName.startsWith('.')) {
          newName = '.' + currentName;
        } else {
          resolve(targetDir);
          return;
        }
      } else {
        if (currentName.startsWith('.')) {
          newName = currentName.slice(1);
        } else {
          resolve(targetDir);
          return;
        }
      }

      const newPath = path.join(parsedPath.dir, newName);

      if (fs.existsSync(newPath)) {
        reject(new Error(`Target path ${newPath} already exists.`));
        return;
      }

      fs.renameSync(targetDir, newPath);
      resolve(newPath);
    } catch (error) {
      console.error(`Error renaming directory: ${error}`);
      reject(new Error(`Error renaming directory: ${error}`));
    }
  });
}

/**
 * Updates all extensions in a directory.
 * @param data - Object containing the directory path and ID for progress tracking.
 */
export async function updateAllExtensions(data: {id: string; dir: string}) {
  const {pluginManager, staticManager} = classHolder;
  if (pluginManager && staticManager) {
    const stage = await staticManager.getCurrentAppState();
    await pluginManager.checkForSync(stage);
  }

  utilsIpc.send.onUpdateAllExtensions({
    id: data.id,
    step: 'done',
  });
}
