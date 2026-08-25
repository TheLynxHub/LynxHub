import {appChannels} from '@lynx_common/consts/ipcChannels/application';
import {AppCliOptions, HeroToastPlacement} from '@lynx_common/types';
import {
  AppUpdateEventTypes,
  AppUpdateStatus,
  ChangeWindowState,
  DarkModeTypes,
  LynxInput,
  MainHT,
  ProcessMetricsReport,
  ShowToastTypes,
  SystemInfo,
  TaskbarStatus,
  WinStateChange,
} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';
import {getAppDataPath, isAppDir, selectNewAppDataFolder} from '@lynx_main/managers/dataFolder';
import {
  getSystemDarkMode,
  getWebContentsIfAvailable,
  isDark,
  isGitInstalled,
  isPowerShell7Installed,
  noticeAllWindowsDarkMode,
} from '@lynx_main/utils';
import {getProcessMetrics, logProcessMetrics} from '@lynx_main/utils/processMetrics';
import {nativeTheme, shell} from 'electron';

import lynxIpc from './ipcWrapper';
import {getSystemInfo} from './methods/platform';
import {changeWindowState, setDarkMode, setTaskbarStatus} from './methods/windowUtils';
import {sendToMain} from './sender';

/**
 * Sets up IPC listeners for application-level events.
 */
export default async function listenApplication() {
  const storageManager = classHolder.storageManager;
  const appManager = await classHolder.waitForClass('appManager');

  // Listens for system theme changes and updates app if set to 'system' mode
  nativeTheme.on('updated', () => {
    if (storageManager.getData('app').darkMode === 'system') noticeAllWindowsDarkMode('system');
  });

  // Changes window state (maximize, minimize, close, fullscreen, restart)
  applicationIpc.on.onChangeState(state => changeWindowState(state));

  // Sets app theme (light, dark, or system)
  applicationIpc.on.setDarkMode(darkMode => setDarkMode(darkMode));

  // Sets taskbar visibility status (taskbar, tray, taskbar-tray, tray-minimized)
  applicationIpc.on.setTaskBarStatus(status => setTaskbarStatus(status));

  // Opens URL in default system browser
  applicationIpc.on.openUrlDefaultBrowser(url => {
    try {
      const parsedUrl = new URL(url);
      const safeProtocols = ['http:', 'https:', 'mailto:'];
      if (safeProtocols.includes(parsedUrl.protocol)) {
        shell.openExternal(url);
      } else {
        console.warn('Blocked opening unsafe URL:', url);
      }
    } catch (error) {
      console.warn('Blocked opening invalid URL:', url);
    }
  });

  // Sets window progress bar (taskbar/dock) - value: 0-1 for progress, -1 to remove, >1 for indeterminate
  // mode: 'none' | 'normal' | 'indeterminate' | 'error' | 'paused' (Windows only)
  applicationIpc.on.setProgressBar((progress, options) => {
    const window = appManager.getMainWindow();
    if (window) window.setProgressBar(progress, options);
  });

  // Gets system dark mode preference (light/dark)
  applicationIpc.handle.getSystemDarkMode(() => getSystemDarkMode());

  applicationIpc.handle.isDarkMode(() => isDark());

  // Gets system information (OS platform and build number)
  applicationIpc.handle.getSystemInfo(() => getSystemInfo());

  applicationIpc.handle.checkGitInstalled(() => isGitInstalled());

  applicationIpc.handle.checkPwsh7Installed(() => isPowerShell7Installed());

  applicationIpc.handle.getCurrentDataPath(() => getAppDataPath());
  applicationIpc.handle.selectAnotherDataPath(() => selectNewAppDataFolder());
  applicationIpc.handle.isValidDataPath(dir => isAppDir(dir));

  applicationIpc.handle.getCliArgs(() => classHolder.cliArgs);

  applicationIpc.handle.getProcessMetrics(() => getProcessMetrics());
  applicationIpc.on.logProcessMetrics(() => logProcessMetrics());
}

/**
 * Notifies all application windows about the dark mode change.
 * @param isDark - Whether dark mode is enabled.
 */
const notifyAllWindowsDarkMode = (isDark: boolean) => {
  const {childWindowManager, quickWindowManager, toastWindow} = classHolder;

  sendToMain(appChannels.onDarkMode, isDark);

  const childWebContents = childWindowManager?.getWebContent();
  if (childWebContents && !childWebContents.isDestroyed()) {
    childWebContents.send(appChannels.onDarkMode, isDark);
  }

  const quickWeb = getWebContentsIfAvailable(quickWindowManager?.getWindow());
  if (quickWeb) quickWeb.send(appChannels.onDarkMode, isDark);

  const toast = getWebContentsIfAvailable(toastWindow);
  if (toast) toast.send(appChannels.onDarkMode, isDark);
};

/**
 * IPC interface for application events.
 */
export const applicationIpc = {
  send: {
    /** Sends event to open a new tab */
    onNewTab: (url: string, background?: boolean) => sendToMain(appChannels.onNewTab, url, background),
    /** Sends online status update */
    onOnline: (isOnline: boolean) => sendToMain(appChannels.onOnline, isOnline),
    /** Sends hotkey change event */
    onHotkeysChange: (input: LynxInput) => sendToMain(appChannels.hotkeysChange, input),
    /** Sends application update status */
    updateStatus: (type: AppUpdateEventTypes, status?: AppUpdateStatus) =>
      sendToMain(appChannels.updateStatus, type, status),
    /** Sends update error event */
    updateError: () => sendToMain(appChannels.updateError),

    /** Shows a toast message */
    showToast: (message: string, type: ShowToastTypes, placement: HeroToastPlacement = 'top') =>
      sendToMain(appChannels.showToast, message, type, placement),
    /** Changes window state */
    changeWinState: (state: WinStateChange) => sendToMain(appChannels.onChangeState, state),
    /** Updates channel change event */
    updateChannelChange: (channel: string) => sendToMain(appChannels.updateChannelChange, channel),
    /** Notifies about dark mode change */
    onDarkMode: (isDark: boolean) => notifyAllWindowsDarkMode(isDark),
  },
  on: {
    /** Listens for window state change requests */
    onChangeState: (callback: (state: ChangeWindowState) => void) => lynxIpc.on(appChannels.changeState, callback),
    /** Listens for dark mode change requests */
    setDarkMode: (callback: (darkMode: DarkModeTypes) => void) => lynxIpc.on(appChannels.setDarkMode, callback),
    /** Listens for taskbar status change requests */
    setTaskBarStatus: (callback: (status: TaskbarStatus) => void) => lynxIpc.on(appChannels.setTaskBarStatus, callback),
    /** Listens for requests to open URL in default browser */
    openUrlDefaultBrowser: (callback: (url: string) => void) => lynxIpc.on(appChannels.openUrlDefaultBrowser, callback),
    /** Listens for progress bar updates */
    setProgressBar: (
      callback: (progress: number, options?: {mode: 'none' | 'normal' | 'indeterminate' | 'error' | 'paused'}) => void,
    ) => lynxIpc.on(appChannels.setProgressBar, callback),
    /** Listens for update download request */
    updateDownload: (callback: () => void) => lynxIpc.on(appChannels.updateDownload, callback),
    /** Listens for update install request */
    updateInstall: (callback: () => void) => lynxIpc.on(appChannels.updateInstall, callback),
    /** Listens for update cancel request */
    updateCancel: (callback: () => void) => lynxIpc.on(appChannels.updateCancel, callback),
    /** Listens for logging process metrics */
    logProcessMetrics: (callback: () => void) => lynxIpc.on(appChannels.logProcessMetrics, callback),
  },
  handle: {
    /** Gets system dark mode setting */
    getSystemDarkMode: (callback: () => MainHT<'dark' | 'light'>) =>
      lynxIpc.handle(appChannels.getSystemDarkMode, callback),
    /** Checks if dark mode is active */
    isDarkMode: (callback: () => MainHT<boolean>) => lynxIpc.handle(appChannels.isDarkMode, callback),
    /** Gets system information */
    getSystemInfo: (callback: () => MainHT<SystemInfo>) => lynxIpc.handle(appChannels.getSystemInfo, callback),
    /** Disables loading animations */
    disableLoadingAnimations: (callback: () => MainHT<boolean>) =>
      lynxIpc.handle(appChannels.disableLoadingAnimations, callback),
    /** Checks if Git is installed */
    checkGitInstalled: (callback: () => MainHT<string>) => lynxIpc.handle(appChannels.checkGitInstalled, callback),
    /** Checks if PowerShell 7 is installed */
    checkPwsh7Installed: (callback: () => MainHT<string>) => lynxIpc.handle(appChannels.checkPwsh7Installed, callback),

    /** Gets current app data path */
    getCurrentDataPath: (callback: () => MainHT<string>) => lynxIpc.handle(appChannels.getCurrentDataPath, callback),
    /** Selects a new app data path */
    selectAnotherDataPath: (callback: () => MainHT<string>) =>
      lynxIpc.handle(appChannels.selectAnotherDataPath, callback),
    /** Checks if a path is a valid app data directory */
    isValidDataPath: (callback: (dir: string) => MainHT<boolean>) =>
      lynxIpc.handle(appChannels.isValidDataPath, callback),
    /** Gets application command-line arguments */
    getCliArgs: (callback: () => MainHT<AppCliOptions>) => lynxIpc.handle(appChannels.getCliArgs, callback),
    /** Gets detailed process metrics report */
    getProcessMetrics: (callback: () => MainHT<ProcessMetricsReport>) =>
      lynxIpc.handle(appChannels.getProcessMetrics, callback),
  },
};
