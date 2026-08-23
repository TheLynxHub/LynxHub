import {TabInfo} from './index';

/**
 * Persisted tab state for session snapshot.
 */
export type SavedTab = {
  id: string;
  title: string;
  pageID: string;
  favIcon?: {show: boolean; url: string};
  isTerminal: boolean;
  isPinned?: boolean;
  showIconOnly?: boolean;
};

/**
 * Persisted running card session state.
 */
export type SavedRunningCard = {
  tabId: string;
  id: string;
  type: 'browser' | 'terminal' | 'both';
  isEmptyRunning: boolean;
  currentView: 'browser' | 'terminal';
  customAddress?: string;
  webUIAddress?: string;
  currentAddress?: string;
  browserTitle?: string;
  startTime?: string;
  dir?: string;
};

/**
 * Snapshot representing full open tabs and session state.
 */
export type SessionSnapshot = {
  tabs: SavedTab[];
  activeTab: string;
  runningCards: SavedRunningCard[];
  timestamp: number;
};

/**
 * Closed tab entry stored in the undo stack.
 */
export type RecentlyClosedTab = {
  tab: TabInfo;
  runningCard?: SavedRunningCard;
  closedAt: number;
};

/**
 * How to handle crash recovery on app launch.
 */
export type SessionRestoreMode = 'always' | 'ask' | 'never';

/**
 * Action taken on regular application launch.
 */
export type StartupBehavior = 'home' | 'last_page' | 'restore_session';

/**
 * Configuration options for session and tab persistence/restoration.
 */
export type SessionRestoreConfig = {
  startupBehavior: StartupBehavior;
  restoreOnCrash: SessionRestoreMode;
  restoreBrowserTabs: boolean;
  restoreTerminalTabs: boolean;
  restoreAiCardTabs: boolean;
  restoreStaticPages: boolean;
  restorePinnedTabsOnly: boolean;
  maxClosedTabsHistory: number;
};

/**
 * Response object describing crash status on startup.
 */
export type SessionCrashStatus = {
  hasCrashedSession: boolean;
  snapshot: SessionSnapshot | null;
};
