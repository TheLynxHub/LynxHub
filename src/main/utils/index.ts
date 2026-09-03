import {execSync, spawn} from 'node:child_process';
import {platform} from 'node:os';
import {dirname, isAbsolute, relative, resolve} from 'node:path';

import {AgentTypes, DarkModeTypes} from '@lynx_common/types/ipc';
import {formatSize, isLinux, isMac, isWin} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import classHolder from '@lynx_main/managers/classHolder';
import {app, BrowserWindow, dialog, nativeTheme, OpenDialogOptions, OpenDialogReturnValue, safeStorage} from 'electron';
import fs from 'graceful-fs';

import calcFolderSize from './calcFolderSize';

/**
 * Opens a system file/folder dialog and returns the selected path.
 *
 * @param options - Electron OpenDialogOptions to configure the dialog (e.g. title, properties)
 * @returns {Promise<string | string[] | undefined>} The selected file/folder path, selected paths, or undefined if cancelled.
 */
export async function openDialog(options: OpenDialogOptions): Promise<string | string[] | undefined> {
  const {appManager} = classHolder;
  try {
    const mainWindow = appManager?.getMainWindow();
    const result: OpenDialogReturnValue = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return undefined;
    if (options.properties?.includes('multiSelections')) return result.filePaths;
    return result.filePaths[0];
  } catch (error) {
    console.log('util:openDialog -> No valid directory or file selected');
    throw error;
  }
}

/**
 * Check if a given path exists and is accessible for reading.
 *
 * @param {string} path - The absolute path to check.
 * @returns {Promise<boolean>} A promise that resolves to true if the path exists and is readable, false otherwise.
 */
export const checkPathExists = async (path: string): Promise<boolean> => {
  try {
    // Use the promises.access function to check if the path exists and is accessible
    await fs.promises.access(path, fs.constants.R_OK);
    return true;
  } catch (error: any) {
    // If the path doesn't exist or is not accessible, the error code will be 'ENOENT'
    if (error.code === 'ENOENT') {
      return false;
    }
    // If there's any other error, re-throw it
    throw error;
  }
};

/**
 * Calculates the total size of a folder and its contents recursively.
 *
 * @param {string} folderPath - The absolute path of the folder to calculate the size for.
 * @returns {Promise<string>} A promise that resolves with the formatted total size of the folder (e.g. "1.5 MB"). Returns '0' on error.
 */
export async function calculateFolderSize(folderPath: string): Promise<string> {
  try {
    const result = await calcFolderSize(folderPath);

    return result ? formatSize(result) : '0';
  } catch (error) {
    console.error('Error calculating folder size:', error);
    return '0';
  }
}

/**
 * Gets the creation date (birthtime) of a directory formatted as a string.
 *
 * @param dir - The path to the directory.
 * @returns {Promise<string>} The formatted creation date (YYYY-MM-DD HH:mm:ss) or empty string if not found/error.
 */
export async function getDirCreationDate(dir: string): Promise<string> {
  const dirPath = resolve(dir);

  try {
    const stats = await fs.promises.stat(dirPath);

    if (stats.isDirectory()) {
      return stats.birthtime.toISOString().replace(/T/, ' ').replace(/\..+/, '');
    }
    return '';
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist
      return '';
    }

    // Re-throw any other error
    throw error;
  }
}

/**
 * Gets the highest available PowerShell version on the system.
 * Checks for `pwsh` (PowerShell Core) first, then `powershell` (Windows PowerShell).
 *
 * @returns {number} The major version number of PowerShell, or -1 if PowerShell is not found or version is too low.
 */
export function getPowerShellVersion(): number {
  const command = '$PSVersionTable.PSVersion.Major';

  try {
    // Try PowerShell Core (pwsh.exe) first
    const pwshVersion = parseInt(
      execSync(`pwsh.exe -NoProfile -Command "${command}"`, {
        encoding: 'utf8' as const,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim(),
      10,
    );
    if (pwshVersion >= 7) return pwshVersion;
  } catch {
    // pwsh.exe not available, try Windows PowerShell
  }

  try {
    // Fall back to Windows PowerShell (powershell.exe)
    const psVersion = parseInt(
      execSync(`powershell.exe -NoProfile -Command "${command}"`, {
        encoding: 'utf8' as const,
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim(),
      10,
    );
    return psVersion >= 5 ? psVersion : -1;
  } catch {
    // Neither PowerShell is available
    return -1;
  }
}

/**
 * Determines the appropriate shell executable based on the operating system.
 * - macOS: zsh
 * - Linux: bash
 * - Windows: pwsh.exe (if v7+), powershell.exe (if v5+), or cmd.exe fallback
 *
 * @returns {string} The shell command to use.
 */
export function determineShell(): string {
  switch (platform()) {
    case 'darwin':
      return 'zsh';
    case 'linux':
      return 'bash';
    case 'win32':
    default: {
      const psVersion = getPowerShellVersion();
      if (psVersion >= 7) return 'pwsh.exe';
      if (psVersion >= 5) return 'powershell.exe';
      // Fallback to cmd.exe if PowerShell is not available
      return 'cmd.exe';
    }
  }
}

/**
 * Gets the system's current dark mode preference.
 * @returns {'dark' | 'light'} The system theme preference.
 */
export function getSystemDarkMode(): 'dark' | 'light' {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

/**
 * Determines if the app should be in dark mode based on settings and system preference.
 * @returns {boolean} True if dark mode should be enabled.
 */
export function isDark(): boolean {
  const {storageManager} = classHolder;
  const darkMode = storageManager.getData('app').darkMode;
  switch (darkMode) {
    case 'dark':
      return true;
    case 'light':
      return false;
    case 'system':
      return getSystemDarkMode() == 'dark';
  }
}

/**
 * Safely gets the WebContents of a window if it hasn't been destroyed.
 * @param window - The BrowserWindow to get WebContents from.
 * @returns {Electron.WebContents | undefined} The WebContents or undefined.
 */
export function getWebContentsIfAvailable(window: BrowserWindow | undefined): Electron.WebContents | undefined {
  if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) return window.webContents;

  return undefined;
}

/**
 * Notifies the renderer process about dark mode changes.
 * @param darkMode - The new dark mode setting.
 */
export function noticeAllWindowsDarkMode(darkMode: DarkModeTypes): void {
  const value = darkMode === 'system' ? getSystemDarkMode() : darkMode;
  const isDark = value === 'dark';

  applicationIpc.send.onDarkMode(isDark);
}

function getWindowBgColor(isDark: boolean) {
  return isDark ? '#212121' : '#ffffff';
}

/**
 * Gets the window background color based on the current theme or preference.
 * @param preferred - Optional preferred theme ('dark' or 'light').
 * @returns {string} The hex color code.
 */
export function getWindowColor(preferred?: 'dark' | 'light'): string {
  if (preferred) return getWindowBgColor(preferred === 'dark');

  return getWindowBgColor(isDark());
}

/**
 * Checks if the application is running in portable mode.
 * @returns {'win' | 'linux' | null} The platform if portable, or null if standard installation.
 */
export function isPortable(): 'win' | 'linux' | null {
  if (process.env.PORTABLE_EXECUTABLE_FILE) return 'win';
  if (process.env.APPIMAGE) return 'linux';
  return null;
}

/**
 * Gets the directory path of the executable.
 * Handles portable versions and standard installations.
 * @returns {string} The absolute path to the executable's directory.
 */
export function getExePath(): string {
  try {
    const winPortablePath = process.env.PORTABLE_EXECUTABLE_FILE && dirname(process.env.PORTABLE_EXECUTABLE_FILE);
    const linuxPortablePath = process.env.APPIMAGE && dirname(process.env.APPIMAGE);

    if (winPortablePath) return winPortablePath;
    if (linuxPortablePath) return linuxPortablePath;

    return app.getAppPath();
  } catch (e) {
    console.error(e);
    return '';
  }
}

/**
 * Calculates a relative path from a base path to a target path.
 * If target path is already relative, returns it as is.
 * @param basePath - The base directory.
 * @param targetPath - The target file or directory.
 * @returns {string} The relative path.
 */
export function getRelativePath(basePath: string, targetPath: string): string {
  try {
    if (!isAbsolute(targetPath)) {
      return targetPath;
    }
    const relPath = relative(basePath, targetPath);

    return relPath.startsWith('..') ? relPath : `./${relPath}`;
  } catch (error) {
    console.error('Error calculating relative path:', error);
    return resolve(targetPath);
  }
}

/**
 * Resolves a relative path to an absolute path based on a base path.
 * If target path is already absolute, returns it as is.
 * @param basePath - The base directory.
 * @param targetPath - The target file or directory (absolute or relative).
 * @returns {string} The absolute path.
 */
export function getAbsolutePath(basePath: string, targetPath: string): string {
  try {
    if (isAbsolute(targetPath)) {
      return targetPath;
    }
    return resolve(basePath, targetPath);
  } catch (error) {
    console.error('Error calculating absolute path:', error);
    return targetPath;
  }
}

/**
 * Relaunches the application.
 * @param saveLastSize - Whether to save the window size/position before relaunching.
 */
export function RelaunchApp(saveLastSize: boolean = true): void {
  const {storageManager} = classHolder;
  if (saveLastSize) storageManager.updateLastSize();
  app.relaunch({execPath: process.env.PORTABLE_EXECUTABLE_FILE || process.env.APPIMAGE});
  app.quit();
}

const FIREFOX_VERSION = '154.0';

/**
 * User agent configuration and templates
 */
const USER_AGENT_CONFIG = {
  osMap: {
    darwin: '(Macintosh; Intel Mac OS X 10_15_7)',
    linux: '(X11; Linux x86_64)',
    win32: '(Windows NT 10.0; Win64; x64)',
  },
  firefoxOsMap: {
    darwin: `(Macintosh; Intel Mac OS X 10.15; rv:${FIREFOX_VERSION})`,
    linux: `(X11; Linux x86_64; rv:${FIREFOX_VERSION})`,
    win32: `(Windows NT 10.0; Win64; x64; rv:${FIREFOX_VERSION})`,
  },
  getVersionStrings: () => ({
    lynxHub: `LynxHub/${app.getVersion()}`,
    electron: `Electron/${process.versions.electron}`,
    chrome: `Chrome/${process.versions.chrome}`,
    firefox: `Firefox/${FIREFOX_VERSION}`,
  }),
};

/**
 * Builds a user agent string based on the specified type.
 * @param type - The type of user agent to generate.
 * @returns {string} The user agent string.
 */
export function getUserAgent(type?: AgentTypes): string {
  const targetType: AgentTypes = type || classHolder.storageManager.getData('browser').userAgent || 'lynxhub';

  const osString = USER_AGENT_CONFIG.osMap[platform()] || USER_AGENT_CONFIG.osMap.win32;
  const firefoxOsString = USER_AGENT_CONFIG.firefoxOsMap[platform()] || USER_AGENT_CONFIG.firefoxOsMap.win32;
  const baseUA = `Mozilla/5.0 ${osString} AppleWebKit/537.36 (KHTML, like Gecko)`;
  const versions = USER_AGENT_CONFIG.getVersionStrings();

  const templates: Record<AgentTypes, () => string> = {
    lynxhub: () => `${baseUA} ${versions.lynxHub} ${versions.chrome} ${versions.electron} Safari/537.36`,
    electron: () => `${baseUA} ${versions.chrome} ${versions.electron} Safari/537.36`,
    chrome: () => `${baseUA} ${versions.chrome} Safari/537.36`,
    firefox: () => `Mozilla/5.0 ${firefoxOsString} Gecko/20100101 ${versions.firefox}`,
    custom: () => classHolder.storageManager.getData('browser').customUserAgent,
  };

  return templates[targetType]?.() || templates.lynxhub();
}

/**
 * Generic encryption/decryption handler for safeStorage operations
 */
function handleSafeStorageOperation<T extends string | string[]>(
  data: T,
  operation: 'encrypt' | 'decrypt',
  operationName: string,
): T {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn(`safeStorage ${operationName} not available. Data will not be ${operation}ed.`);
    return data;
  }

  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  try {
    const processed = items.map(item => {
      if (operation === 'encrypt') {
        return safeStorage.encryptString(item).toString('hex');
      } else {
        return safeStorage.decryptString(Buffer.from(item, 'hex'));
      }
    });

    return (isArray ? processed : processed[0]) as T;
  } catch (e) {
    console.error(`Failed to ${operation} data:`, e);
    return data;
  }
}

/**
 * Helper function to encrypt a string using Electron's safeStorage.
 * Returns the encrypted data as a hexadecimal string.
 * Provides a warning if encryption is not available.
 */
export function encryptString(data: string): string {
  return handleSafeStorageOperation(data, 'encrypt', 'encryption');
}

export function encryptStrings(data: string[]): string[] {
  return handleSafeStorageOperation(data, 'encrypt', 'encryption');
}

/**
 * Helper function to decrypt a string using Electron's safeStorage.
 * Expects the input to be a hexadecimal string.
 * Provides a warning and returns the original string if decryption fails or isn't available.
 */
export function decryptString(encryptedData: string): string {
  return handleSafeStorageOperation(encryptedData, 'decrypt', 'decryption');
}

export function decryptStrings(encryptedData: string[]): string[] {
  return handleSafeStorageOperation(encryptedData, 'decrypt', 'decryption');
}

/**
 * Gets the text representation of required privileges based on OS.
 * @returns {'administrator' | 'sudo' | 'elevated privileges'}
 */
export const getPrivilegeText = (): string => {
  if (isWin) {
    return 'administrator';
  } else if (isMac || isLinux) {
    return 'sudo';
  }
  return 'elevated privileges';
};

/**
 * Checks if Git is installed and returns the version.
 * @returns {Promise<string>} The git version string.
 * @throws Will reject if git is not found or fails.
 */
export async function isGitInstalled(): Promise<string> {
  return new Promise((resolve, reject) => {
    const commandProcess = spawn('git', ['--version']);

    let stdoutData = '';

    commandProcess.on('error', err => {
      console.error('Failed to start git process. Is Git installed and in your PATH?', err);

      reject('Git is not installed or could not be found in the system PATH.');
    });

    commandProcess.stdout.on('data', data => {
      stdoutData += data.toString();
    });

    commandProcess.stderr.on('data', data => {
      console.error(`stderr: ${data}`);
    });

    commandProcess.on('close', code => {
      if (code !== 0) {
        console.error(`git process exited with error code ${code}`);
        reject(`Git process exited with error code: ${code}`);
        return;
      }

      if (stdoutData) {
        const versionString = stdoutData.trim();
        const versionParts = versionString.split(' ');

        if (versionParts.length >= 3) {
          resolve(versionParts[2]);
        } else {
          resolve(versionString);
        }
      } else {
        reject('Git command ran successfully but produced no output.');
      }
    });
  });
}

/**
 * Checks if PowerShell 7+ (pwsh) is installed.
 * @returns {Promise<string>} The PowerShell version string (e.g. "V7.4.1").
 * @throws Will reject if pwsh is not found or version is < 7.
 */
export async function isPowerShell7Installed(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Flag to ensure the promise is only settled once.
    let isSettled = false;

    // Use 'pwsh' to specifically target PowerShell 7+
    const commandProcess = spawn('pwsh', ['--version']);

    commandProcess.stdout.on('data', data => {
      if (isSettled) return;

      const output = data.toString().trim();
      // Expected output is something like "PowerShell 7.4.1"
      const versionParts = output.split(' ');
      if (versionParts.length >= 2 && versionParts[0] === 'PowerShell') {
        const version = versionParts[1];
        // Ensure it's version 7 or higher
        if (version.startsWith('7.')) {
          isSettled = true;
          resolve(`V${version}`);
        } else {
          isSettled = true;
          // It's a version of pwsh, but not 7. Reject with a clear message.
          reject(new Error(`Found PowerShell version ${version}, but version 7 is required.`));
        }
      }
      // If output is unexpected, we'll let the 'close' event handle the rejection.
    });

    // This 'error' event fires if the 'pwsh' command cannot be started.
    commandProcess.on('error', err => {
      if (isSettled) return;
      isSettled = true;

      console.error('Failed to start pwsh. Is PowerShell 7 installed and in PATH?', err.message);
      // Reject with a clear error message.
      reject(new Error('PowerShell 7 (pwsh) was not found in your system PATH.'));
    });

    commandProcess.stderr.on('data', data => {
      // Log stderr for debugging, but don't reject here. Let the 'close' event handle it
      // based on the exit code, as some programs write warnings to stderr on success.
      console.error('stderr from pwsh check:', data.toString());
    });

    // The 'close' event fires when the process has exited.
    commandProcess.on('close', code => {
      if (isSettled) return;
      isSettled = true;

      // If we reach this point, it means stdout did not resolve the promise.
      // This is considered a failure. The exit code gives a hint as to why.
      console.log(`pwsh process exited with code ${code}.`);
      reject(new Error(`The PowerShell 7 check failed. The 'pwsh' command exited without providing a valid version.`));
    });
  });
}
