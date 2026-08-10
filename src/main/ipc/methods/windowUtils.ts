// Utility IPC methods - Window state, file operations, and general utilities
import {writeFile} from 'node:fs/promises';
import {basename, extname, join, resolve} from 'node:path';

import {FolderListData} from '@lynx_common/types';
import {ChangeWindowState, DarkModeTypes, TaskbarStatus} from '@lynx_common/types/ipc';
import {isMac, isWin} from '@lynx_common/utils';
import classHolder from '@lynx_main/managers/classHolder';
import {noticeAllWindowsDarkMode} from '@lynx_main/utils';
import {decompress} from '@lynxhub/7zip';
import {app, clipboard, dialog, nativeImage, net, shell} from 'electron';
import fs, {promises} from 'graceful-fs';

import {applicationIpc} from '../application';

/**
 * Changes the state of the main window based on the provided action.
 * @param state - The desired window state change.
 */
export function changeWindowState(state: ChangeWindowState): void {
  const {appManager, storageManager, trayManager} = classHolder;

  const mainWindow = appManager?.getMainWindow();
  if (!mainWindow) return;

  const actions: Record<ChangeWindowState, () => void> = {
    maximize: () => (mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()),
    minimize: () => mainWindow.minimize(),
    close: () => {
      storageManager.updateLastSize();
      mainWindow.close();
      if (isMac) trayManager?.destroyTrayIcon();
    },
    fullscreen: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
    restart: () => appManager?.restart(),
  };

  const action = actions[state];
  if (action) {
    action();
  } else {
    console.warn(`MainIpcFunctions:changeWindowState -> Invalid state argument: ${state}`);
  }
}

/**
 * Sets the dark mode for the application.
 * @param darkMode - The dark mode setting to apply.
 */
export function setDarkMode(darkMode: DarkModeTypes): void {
  const {storageManager} = classHolder;

  noticeAllWindowsDarkMode(darkMode);

  storageManager.updateData('app', {darkMode});
}

/**
 * Sets the taskbar status for the application.
 * @param status - The desired taskbar status.
 */
export function setTaskbarStatus(status: TaskbarStatus): void {
  const {appManager, trayManager, storageManager} = classHolder;

  const mainWindow = appManager?.getMainWindow();
  if (!mainWindow) return;

  const actions: Record<TaskbarStatus, () => void> = {
    'taskbar-tray': () => {
      trayManager?.createTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
    },
    taskbar: () => {
      trayManager?.destroyTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
    },
    tray: () => {
      trayManager?.createTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(true);
      } else if (isMac && app.dock?.isVisible()) {
        app.dock?.hide();
      }
    },
    'tray-minimized': () => {
      trayManager?.destroyTrayIcon();
      if (isWin) {
        mainWindow?.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
    },
  };

  const action = actions[status];
  if (action) {
    action();
    storageManager.updateData('app', {taskbarStatus: status});
  } else {
    console.warn(`Invalid taskbar status: ${status}`);
  }
}

/**
 * Permanently removes a directory and all its contents recursively.
 * @param dir - The directory path to remove.
 */
export async function removeDirRecursive(dir: string): Promise<void> {
  try {
    const resolvedPath = resolve(dir);
    console.log(`Removing directory: ${resolvedPath}`);
    return await promises.rm(resolvedPath, {recursive: true, force: true});
  } catch (e) {
    console.error(`Error removing directory ${dir}:`, e);
    throw e;
  }
}

/**
 * Shows a save dialog and writes the provided content to the selected file.
 * @param content The string content to write to the file.
 * @param defaultFilename Optional default filename for the save dialog.
 * @returns The file path if saved successfully, otherwise null if cancelled.
 * @throws An error if the file operation fails.
 */
export async function saveToFile(content: string, defaultFilename?: string): Promise<string | null> {
  const {appManager} = classHolder;

  try {
    const mainWindow = appManager?.getMainWindow();

    const options: Electron.SaveDialogOptions = {
      properties: ['createDirectory'],
      filters: [
        {name: 'Text file', extensions: ['txt']},
        {name: 'All types', extensions: ['*']},
      ],
      defaultPath: defaultFilename,
    };

    // The dialog returns a promise that resolves with a SaveDialogReturnValue object
    const {canceled, filePath} = await (mainWindow
      ? dialog.showSaveDialog(mainWindow, options)
      : dialog.showSaveDialog(options));

    // 1. Check if the user cancelled the dialog
    if (canceled || !filePath) {
      console.log('User cancelled the save dialog.');
      return null; // Return null to indicate cancellation
    }

    // 2. If a file path was chosen, write the content to it
    // We use fs.writeFile which is asynchronous and returns a promise
    await writeFile(filePath, content, 'utf8');

    console.log(`File saved successfully to: ${filePath}`);

    // 3. Return the path of the newly created file
    return filePath;
  } catch (error) {
    // The error could be from the dialog or the file write operation
    console.error('Error saving file:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}
/**
 * Moves a directory to the trash.
 * @param dir - The directory path to trash.
 */
export async function trashDir(dir: string): Promise<void> {
  try {
    const resolvedPath = resolve(dir);
    console.log(`Moving directory to trash: ${resolvedPath}`);
    return await shell.trashItem(resolvedPath);
  } catch (e) {
    console.error(`Error moving ${dir} to trash:`, e);
    throw e;
  }
}

/**
 * Checks if the specified directory is empty.
 * @param dir - The directory path to check.
 * @returns A promise that resolves to true if the directory is empty, false otherwise.
 */
export async function isEmptyDir(dir: string): Promise<boolean> {
  try {
    const files = await promises.readdir(dir);
    return files.length === 0;
  } catch (e) {
    return true;
  }
}

/**
 * Lists files and folders in a directory.
 * @param dirPath - The directory path.
 * @returns A promise resolving to a list of files and folders.
 */
export function listDirectory(dirPath: string): Promise<FolderListData[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(dirPath, {withFileTypes: true}, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const filesData: FolderListData[] = [];
      const foldersData: FolderListData[] = [];

      files.forEach(file => {
        if (file.isDirectory()) {
          foldersData.push({type: 'folder', name: file.name});
        } else {
          filesData.push({type: 'file', name: file.name});
        }
      });

      resolve([...foldersData, ...filesData]);
    });
  });
}

/**
 * Lists files in a relative path.
 * @param dirPath - The base directory path.
 * @param relatives - The relative path segments.
 * @returns A promise resolving to a list of files and folders.
 */
export async function getRelativeList(dirPath: string, relatives: string[]): Promise<FolderListData[]> {
  const resolvePath = resolve(dirPath, ...relatives);
  try {
    return await listDirectory(resolvePath);
  } catch (e) {
    try {
      // Fallback: try removing the last segment if resolution failed
      if (relatives.length > 0) {
        relatives.pop();
        const newResolvePath = resolve(dirPath, ...relatives);
        return await listDirectory(newResolvePath);
      }
      return [];
    } catch (innerError) {
      console.error('Error reading relative directory:', innerError);
      return [];
    }
  }
}

/**
 * Decompresses a file to the Downloads folder.
 * @param filePath - The path of the file to decompress.
 * @returns A promise resolving to the output path.
 */
export async function decompressFile(filePath: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const fileName = basename(filePath, extname(filePath));
      const finalPath = join(app.getPath('downloads'), 'LynxHub', fileName);
      await decompress(filePath, finalPath);
      resolve(finalPath);
    } catch (e) {
      console.error('Error decompressing file:', e);
      reject(e);
    }
  });
}

/**
 * Checks if a list of files exists in a directory.
 * @param dir - The directory to check.
 * @param files - The list of file names.
 * @returns True if all files exist, false otherwise.
 */
export async function checkFilesExist(dir: string, files: string[]): Promise<boolean> {
  try {
    for (const file of files) {
      const fullPath = join(dir, file);
      try {
        await promises.access(fullPath);
      } catch (error) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking files:', error);
    return false;
  }
}

/**
 * Checks if a URL returns a valid response.
 * @param url - The URL to check.
 * @returns True if response is OK, false otherwise.
 */
export async function isResponseValid(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Fetches an image from a URL and converts it to a Data URL (base64).
 * @param imageUrl - The URL of the image.
 * @returns The Data URL string or null on failure.
 */
export async function getImageAsDataURL(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`The fetched URL does not appear to be an image. Content-Type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = buffer.toString('base64');

    return `data:${contentType};base64,${base64String}`;
  } catch (error: any) {
    console.error(`Error processing image from ${imageUrl}:`, error.message);
    return null;
  }
}

/**
 * Downloads an image from a URL and copies it to the clipboard.
 * @param url - The URL of the image.
 */
export async function downloadImageToClipboard(url: string): Promise<void> {
  try {
    const response = await net.fetch(url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const image = nativeImage.createFromBuffer(buffer);
    if (!image.isEmpty()) {
      clipboard.writeImage(image);
      applicationIpc.send.showToast('Image copied to clipboard', 'success', 'top');
    } else {
      applicationIpc.send.showToast('Failed to copy image', 'danger', 'top');
    }
  } catch (error) {
    console.error('Failed to copy image:', error);
    applicationIpc.send.showToast('Failed to copy image', 'danger', 'top');
  }
}
