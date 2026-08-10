import path from 'node:path';

import {electronApp, optimizer} from '@electron-toolkit/utils';
import {APP_NAME} from '@lynx_common/consts';
import {isDev, isMac} from '@lynx_common/utils';
import {app, Menu, nativeImage} from 'electron';
import log from 'electron-log/main';

import darwinIcon from '../../resources/icon-darwin.png?asset';
import {configureAppBeforeReady, handleAppReadyToShow, registerCustomProtocols} from './appLifecycle';
import LoadingWindow from './childWindows/loading';
import ShowToastWindow from './childWindows/toast';
import {listenToIpcChannels} from './ipc';
import {listenBrowser, resetBrowserIPC} from './ipc/browser';
import listenDialogsWindow from './ipc/dialogsWindow';
import {stopAllPty} from './ipc/methods/pty';
import classHolder from './managers/classHolder';
import {checkAppDirectories, cleanupLeftoverOldFolders} from './managers/dataFolder';
import {getImageCacheManager} from './managers/imageCache';
import {checkForUpdate} from './managers/updater';
import Auth, {handleDeepLink} from './monitoring/auth';
import {fetchAndCacheSentryDsn} from './monitoring/sentry';
import {PluginMigrate} from './setup/migration';
import {getPrivilegeText} from './utils';
import {initSession, sendCollectedActions} from './utils/actionLogger';
import downloadDU from './utils/calcFolderSize/downloadDiskUsageUtility';

/**
 * Initializes logging for production environments.
 * Redirects console output to electron-log files.
 */
if (!isDev()) {
  log.initialize();

  // On Linux/macOS, stdout/stderr can become a broken pipe (EPIPE) if the app
  // is launched from a terminal that the user subsequently closes.
  // Suppress EPIPE errors on these streams so electron-log's console transport
  // doesn't crash the process — the file transport will continue logging normally.
  process.stdout.on('error', err => {
    if ((err as NodeJS.ErrnoException).code !== 'EPIPE') throw err;
  });
  process.stderr.on('error', err => {
    if ((err as NodeJS.ErrnoException).code !== 'EPIPE') throw err;
  });

  Object.assign(console, log.functions);
}

// Suppress default menu as we use custom in-app menus
Menu.setApplicationMenu(null);

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance deep linking
  app.on('second-instance', (_, commandLine) => {
    const appManager = classHolder.appManager;
    const mainWindow = appManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
    const url = commandLine.find(arg => arg.startsWith('lynxhub://'));
    if (url) {
      handleDeepLink(url);
    }
  });

  // Handle open-url on macOS
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Register protocol client
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('lynxhub', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('lynxhub');
  }
}

// Initialize command-line switches and protocol scheme before app getting ready
configureAppBeforeReady();

// Create the loading window instance immediately
const loadingWindow = new LoadingWindow();

/**
 * Main application entry point.
 * Handles app readiness, migration, and initialization flow.
 */
app.whenReady().then(async () => {
  // Check if plugin migration is needed for users coming from old versions
  const storageManager = await classHolder.waitForClass('storageManager');
  if (storageManager.getData('plugin').migrated) {
    await loadingWindow.startLoading();
    await initializeLynxHub();
  } else {
    // Initialize managers needed for migration
    await classHolder.initializeManagers();
    const pluginManager = await classHolder.waitForClass('pluginManager');
    PluginMigrate(storageManager, pluginManager);
  }
});

/**
 * Initializes the main LynxHub application components.
 * Sets up environment, directories, managers, protocols, and the main window.
 */
async function initializeLynxHub(): Promise<void> {
  // Fix the macOS environment paths
  const {default: fixPath} = await import('fix-path');
  fixPath();

  // Create required folders for app
  try {
    await checkAppDirectories();
  } catch (_) {
    ShowToastWindow({
      buttons: ['exit'],
      title: 'Permission Error',
      message: `Could not create app data directories. Please run as ${getPrivilegeText()}. Alternatively,
     you can change the data folder in the settings page to another folder that does not require admin rights.`,
      type: 'error',
    });
    return;
  }

  // Cleanup leftover folders from previous runs
  await cleanupLeftoverOldFolders().catch(err => {
    console.error('Failed to cleanup leftover old folders:', err);
  });

  // Initialize and hold classes
  const {storageManager} = classHolder;

  storageManager.completeDeferredMigrations();
  storageManager.decryptBrowserData();
  initSession();

  // Fetch Sentry DSN in the background to cache it for the next run
  fetchAndCacheSentryDsn(storageManager).catch(err => {
    console.error('Failed to fetch and cache Sentry DSN:', err instanceof Error ? err.message : err);
  });

  await classHolder.initializeManagers();
  await classHolder.checkStaticsRequirements();

  await downloadDU();

  await registerCustomProtocols();

  await classHolder.pluginManager!.initPlugins();
  await classHolder.extensionManager!.onAppReady();

  electronApp.setAppUserModelId(APP_NAME);

  if (isMac) app.dock?.setIcon(nativeImage.createFromPath(darwinIcon));

  listenToIpcChannels();

  Auth();

  const appManager = await classHolder.waitForClass('appManager');

  appManager.onCreateWindow(() => {
    listenBrowser();
    listenDialogsWindow();
  });
  appManager.onReadyToShow(() => {
    loadingWindow.closeWindow();
    handleAppReadyToShow();
  });

  appManager.startApp();

  checkForUpdate();
}

// ====================================== App Events ======================================

let isAppQuitting = false;

app.on('before-quit', e => {
  if (!isAppQuitting) {
    e.preventDefault();
    // Stop image cache manager
    getImageCacheManager().stop();
    sendCollectedActions().finally(() => {
      stopAllPty().then(() => {
        isAppQuitting = true;
        app.quit();
      });
    });
  }
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('browser-window-created', (_, window) => {
  optimizer.watchWindowShortcuts(window);
});

// Handle child process crashes (GPU, utility processes, etc.)
// These are Chromium internal issues, not app bugs - log and ignore
app.on('child-process-gone', (_event, details) => {
  const {type, reason, exitCode} = details;
  // Only log non-normal exits for debugging, don't report to Sentry
  if (reason !== 'clean-exit' && reason !== 'killed') {
    console.warn(`Child process (${type}) exited: reason=${reason}, exitCode=${exitCode}`);
  }
});

app.on('activate', async () => {
  // Ensure app is ready before creating windows
  if (!app.isReady()) {
    await app.whenReady();
  }

  const appManager = classHolder.appManager;
  const mainWindow = appManager?.getMainWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    // Reset browserIPC state so it reinitializes with the new window
    resetBrowserIPC();
    appManager?.startApp();
  } else {
    mainWindow.show();
  }
});
