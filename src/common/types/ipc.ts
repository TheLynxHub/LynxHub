import type {PullResult, SimpleGitProgressEvent} from 'simple-git';

import type {OsPlatforms, UpdateDownloadProgress} from './index';

/**
 * Payload for window state change events.
 */
export type WinStateChange = {name: 'focus' | 'maximize' | 'fullscreen'; value: boolean};

/**
 * Desired state to change the window to.
 */
export type ChangeWindowState = 'minimize' | 'maximize' | 'close' | 'fullscreen' | 'restart';

export type DarkModeTypes = 'dark' | 'light' | 'system';
export type TaskbarStatus = 'taskbar-tray' | 'taskbar' | 'tray' | 'tray-minimized';
export type TooltipStatus = 'essential' | 'full' | 'none';

// Terminal
export type TerminalUseConpty = 'auto' | 'yes' | 'no';
export type TerminalCursorStyle = 'bar' | 'block' | 'underline';
export type TerminalCursorInactiveStyle = 'bar' | 'block' | 'underline' | 'outline' | 'none';

export type GitProgressState = 'Progress' | 'Failed' | 'Completed';
export type GitProgressResult<T extends GitProgressState> = T extends 'Progress'
  ? SimpleGitProgressEvent
  : T extends 'Completed'
    ? PullResult | undefined
    : T extends 'Failed'
      ? string
      : never;
export type GitProgressCallback = <T extends GitProgressState>(
  id: string,
  state: T,
  progress: GitProgressResult<T>,
) => void;

export type StorageOperation = 'add' | 'remove' | 'get' | 'set';
export type RecentlyOperation = 'update' | 'get';
export type StoragePreOpenData = {cardId: string; data: PreOpenData}[];

/**
 * Legacy configuration for custom run behavior (deprecated).
 */
export type LegacyCustomRunBehaviorData = {
  cardID: string;
  terminal: 'runScript' | 'empty' | string;
  browser: 'appBrowser' | 'defaultBrowser' | 'doNothing' | string;
};

/**
 * Configuration for custom run behavior of cards.
 */
export type CustomRunBehaviorData = {
  cardID: string;
  terminal: 'runScript' | 'empty';
  browser: 'appBrowser' | 'defaultBrowser';
  urlCatch: {
    type: 'findLine' | 'custom' | 'module' | 'nothing';
    findLine: string | undefined;
    moduleDelay: number;
    delay: number;
    customUrl: string | undefined;
  };
};
export type CustomRunBehaviorStore = CustomRunBehaviorData[];

export type ExtensionsData = {name: string; remoteUrl: string; size: string; isDisabled: boolean}[] | 'empty';
export type ExtensionsUpdateStatus = {id: string; updateAvailable: boolean; isDisabled: boolean}[];

export type PreCommands = {id: string; command?: string | string[] | number};
export type PreOpen = {id: string; open?: {type: 'folder' | 'file'; path: string} | number};
export type PreOpenData = {type: 'folder' | 'file'; path: string}[];
export type OnPreCommands = {id: string; commands: string[]};

export type HomeCategory = ('Pin' | 'Recently' | 'All' | string)[];

/**
 * System information including OS platform and build number.
 */
export type SystemInfo = {os: OsPlatforms; buildNumber: string | number};

export type LynxInput = {
  type: 'keyUp' | 'keyDown' | string;
  key: string;
  shift: boolean;
  control: boolean;
  alt: boolean;
  meta: boolean;
};
export type LynxHotkey = Omit<LynxInput, 'type'> & {name: string};

export type AppUpdateStatus = string | UpdateDownloadProgress | undefined;
export type AppUpdateEventTypes = 'update-available' | 'download-progress' | 'update-downloaded' | 'error';

export type OnUpdatingExtensions = {id: string; step: string | 'done'};

export type DownloadProgress = {
  stage: 'done' | 'progress' | 'failed';
  finalPath?: string;
  percentage?: number;
  fileName?: string;
  downloaded?: number;
  total?: number;
};

export type CanGoType = {back: boolean; forward: boolean};

export type FavIcons = {url: string; favIcon: string; title?: string};
export type BrowserHistoryData = {
  recentAddress: string[];
  favoriteAddress: string[];
  historyAddress: string[];
  favIcons: FavIcons[];
};
export type AgentTypes = 'lynxhub' | 'electron' | 'chrome' | 'custom';
export type ShowToastTypes = 'success' | 'danger' | 'warning' | 'info';

export type AudioState = {
  playing: boolean;
  muted: boolean;
};

export type ContextMenuVolumeData = {id: string; tabId: string; volume: number; muted: boolean; globalMuted: boolean};

export type MainHT<T> = Promise<T> | T;

export type NavHistory = {
  canGoBack: boolean;
  canGoForward: boolean;
};
