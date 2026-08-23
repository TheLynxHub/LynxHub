import type {ToastProps} from '@heroui/react';
import {appChannels} from '@lynx_common/consts/ipcChannels/application';
import type {AppCliOptions, HeroToastPlacement} from '@lynx_common/types';
import type {
  AppUpdateEventTypes,
  AppUpdateStatus,
  ChangeWindowState,
  DarkModeTypes,
  LynxInput,
  SystemInfo,
  TaskbarStatus,
  WinStateChange,
} from '@lynx_common/types/ipc';

import lynxIpc from './lynxIpc';

const applicationIpc = {
  send: {
    // Changes window state (maximize, minimize, close, fullscreen, restart)
    changeWinState: (state: ChangeWindowState) => lynxIpc.send(appChannels.changeState, state),

    // Sets app theme (light, dark, or system)
    setDarkMode: (darkMode: DarkModeTypes) => lynxIpc.send(appChannels.setDarkMode, darkMode),

    // Sets taskbar visibility status (taskbar, tray, taskbar-tray, tray-minimized)
    setTaskBarStatus: (status: TaskbarStatus) => lynxIpc.send(appChannels.setTaskBarStatus, status),

    // Opens URL in default system browser
    openUrlDefaultBrowser: (url: string) => lynxIpc.send(appChannels.openUrlDefaultBrowser, url),

    /* Sets window progress bar (taskbar/dock)
       - **progress**: 0-1 for progress, -1 to remove, >1 for indeterminate */
    setProgressBar: (progress: number, options?: {mode: 'none' | 'normal' | 'indeterminate' | 'error' | 'paused'}) =>
      lynxIpc.send(appChannels.setProgressBar, progress, options),

    // Downloads app update
    updateDownload: () => lynxIpc.send(appChannels.updateDownload),

    // Cancels app update download
    updateCancel: () => lynxIpc.send(appChannels.updateCancel),

    // Installs downloaded app update
    updateInstall: () => lynxIpc.send(appChannels.updateInstall),
  },
  invoke: {
    // Gets system dark mode preference (light/dark)
    getSystemDarkMode: () => lynxIpc.invoke<'light' | 'dark'>(appChannels.getSystemDarkMode),

    // Gets whether current dark mode
    isDarkMode: () => lynxIpc.invoke<boolean>(appChannels.isDarkMode),

    // Gets system information (OS platform and build number)
    getSystemInfo: () => lynxIpc.invoke<SystemInfo>(appChannels.getSystemInfo),

    // Gets current app data directory path
    getCurrentDataPath: () => lynxIpc.invoke<string>(appChannels.getCurrentDataPath),

    // Opens dialog to select new app data folder
    selectAnotherDataPath: () => lynxIpc.invoke<string>(appChannels.selectAnotherDataPath),

    // Checks if directory is valid app data directory
    isValidDataPath: (dir: string) => lynxIpc.invoke<boolean>(appChannels.isValidDataPath, dir),

    // Checks if Git is installed and returns version
    checkGitInstalled: () => lynxIpc.invoke<string | undefined>(appChannels.checkGitInstalled),

    // Checks if PowerShell 7 is installed and returns version
    checkPwsh7Installed: () => lynxIpc.invoke<string | undefined>(appChannels.checkPwsh7Installed),

    disableLoadingAnimations: () => lynxIpc.invoke<boolean>(appChannels.disableLoadingAnimations),

    // Gets application command-line arguments
    getCliArgs: () => lynxIpc.invoke<AppCliOptions>(appChannels.getCliArgs),
  },

  on: {
    // Listens for window state change events
    windowStateChange: (result: (result: WinStateChange) => void): (() => void) =>
      lynxIpc.on(appChannels.onChangeState, result),

    // Listens for dark mode change events
    darkMode: (result: (isDark: boolean) => void): (() => void) => lynxIpc.on(appChannels.onDarkMode, result),

    // Listens for hotkey change events
    onHotkeysChange: (result: (input: LynxInput) => void): (() => void) =>
      lynxIpc.on(appChannels.hotkeysChange, result),

    // Listens for toast notification events
    onShowToast: (
      result: (message: string, type: NonNullable<ToastProps['variant']>, placement?: HeroToastPlacement) => void,
    ): (() => void) => lynxIpc.on(appChannels.showToast, result),

    // Listens for new tab events
    onNewTab: (result: (url: string, background?: boolean) => void): (() => void) =>
      lynxIpc.on(appChannels.onNewTab, result),

    // Listens for app update error events
    updateError: (result: () => void): (() => void) => lynxIpc.on(appChannels.updateError, result),
    updateChannelChange: (result: (channel: string) => void): (() => void) =>
      lynxIpc.on(appChannels.updateChannelChange, result),

    // Listens for app update status events
    updateStatus: (result: (type: AppUpdateEventTypes, status: AppUpdateStatus) => void): (() => void) =>
      lynxIpc.on(appChannels.updateStatus, result),

    onOnline: (result: (isOnline: boolean) => void): (() => void) => lynxIpc.on(appChannels.onOnline, result),
  },
};

export default applicationIpc;
