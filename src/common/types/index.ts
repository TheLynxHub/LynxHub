// Card Repository information type

import type {ButtonProps} from '@heroui/react';

import type {BINARIES_FOLDER_NAME, PLUGINS_FOLDER_NAME, REPOSITORIES_FOLDER_NAME, STATICS_FOLDER_NAME} from '../consts';
import {ArgumentType, ChosenArgument} from './plugins/modules';

/**
 * Information about a git repository branch and status.
 */
export type RepositoryInfo = {
  currentBranch: string;
  availableBranches: string[];
  remoteUrl: string;
  isShallow: boolean;
  lastCommitHash: string;
  lastCommitMessage: string;
  lastCommitTime: string;
};

/**
 * Supported Operating System platforms.
 */
export type OsPlatforms =
  'aix' | 'android' | 'darwin' | 'freebsd' | 'haiku' | 'linux' | 'openbsd' | 'sunos' | 'win32' | 'cygwin' | 'netbsd';

export type ArgumentsPresets = {preset: string; arguments: ChosenArgument[]};
export type ChosenArgumentsData = {activePreset: string; data: ArgumentsPresets[]};
export type StorageChosenArgumentsData = {cardId: string; activePreset: string; data: ArgumentsPresets[]}[];

export type CustomArgKinds = 'envVar' | 'commandLine' | 'custom' | 'comment';
export type CustomArg = {
  id?: string;
  name: string;
  kind: CustomArgKinds;
  type: ArgumentType;
  defaultValue?: any;
  values?: string[];
};

/**
 * Progress information for downloads or updates.
 */
export type UpdateDownloadProgress = {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
};

/**
 * Represents a single item in a changelog.
 */
export type ChangelogItem = {
  label: string;
  subitems?: ChangelogItem[];
};

/**
 * Represents a changelog entry with a title and items.
 */
export type Changelog = {
  title: string;
  items: ChangelogItem[];
};

/**
 * Information about a downloadable module.
 */
export type ModuleInfo = {
  id: string;

  title: string;

  publishDate: string;

  version: string;

  updateDate: string;

  changeLog: string;
  changes: Changelog[];

  description: string;

  requireAppBuild: number;

  /** Repository address to be cloned when user install module */
  repoUrl: string;

  /** Url address to logo picture or relative path to the image file
   * - A relative path will start with './'
   */
  logoUrl?: string;

  /** Is the WebUI or the repository provided by this module owned by you? */
  owner?: boolean;
};

/**
 * Information about a downloadable extension.
 */
export type ExtensionInfo = {
  id: string;

  title: string;

  publishDate: string;

  version: string;

  updateDate: string;

  changeLog: Changelog[];

  description: string;

  /** Repository address to be cloned when user install module */
  repoUrl: string;

  requireAppBuild: number;

  /** Url address to logo picture or relative path to the image file
   * - A relative path will start with './'
   */
  avatarUrl?: string;
  tag: 'tools' | 'feature' | 'games';
  platforms: OsPlatforms[];
};

/**
 * Basic information about an app update.
 */
export type AppUpdateInfo = {
  currentVersion: string;
  currentBuild: number;
  releaseDate: string;
  earlyAccess: {
    version: string;
    build: number;
    releaseDate: string;
  };
};

/**
 * Detailed app update data including changelogs.
 */
export type AppUpdateData = AppUpdateInfo & {
  changeLog: {build: number; version: string; changes: Changelog[]}[];
};
export type AppUpdateInsiderData = Omit<AppUpdateData, 'earlyAccess'>;

export type FolderNames =
  | typeof PLUGINS_FOLDER_NAME
  | typeof BINARIES_FOLDER_NAME
  | typeof REPOSITORIES_FOLDER_NAME
  | typeof STATICS_FOLDER_NAME;

export type UserAccountData = {
  tier: string;
  name: string;
  imageUrl: string;
  subscribeStage: SubscribeStages;
  connectedProviders?: string[];
};

export type FolderListData = {type: 'folder' | 'file'; name: string};

export type TabInfo = {
  id: string;
  isLoading: boolean;
  title: string;
  isTerminal: boolean;
  pageID: string;
  favIcon: {show: boolean; url: string};
  // Terminal progress state (ConEmu OSC 9;4 sequence)
  progress?: {state: 0 | 1 | 2 | 3 | 4; value: number};
  isPinned?: boolean;
  showIconOnly?: boolean;
};

export type TabContextMenuPayload = {
  tabId: string;
  title: string;
  isPinned?: boolean;
  showIconOnly?: boolean;
  canCloseOthers: boolean;
  canCloseRight: boolean;
  isOnlyTab: boolean;
  hasRunningCard?: boolean;
};

export type TerminateMultipleTabsPayload = {
  tabIds: string[];
  count: number;
  runningCount: number;
};

export interface NotificationAction {
  label: string;
  url: string;
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  isExternal?: boolean;
}

/**
 * Data for a notification.
 */
export type NotificationData = {
  id: string;
  title: string | null;
  body: string;
  style: string;
  icon: string | null;
  iconColor: string | null;
  bgColor: string | null;
  textColor: string | null;
  image: string | null;
  actions: NotificationAction[] | string | null;
  targetTiers: string[];
  releaseType?: string | null;
  releaseVersion?: string | null;
  publicVersion?: string | null;
  eaVersion?: string | null;
  insiderVersion?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PatreonSupporterTier = 'Platinum Sponsor' | 'Diamond Sponsor';

export type PatreonSupporter = {
  name: string;
  tier: PatreonSupporterTier;
  imageUrl: string;
  memberSince: string;
  homePage: string;
};

/**
 * Configuration for a custom button in toast or notification.
 */
export type CustomBtn = {
  id: string;
  label: string;
  color: ButtonProps['variant'];
  cursor?: 'default' | 'pointer';
};

/**
 * Message type for Toast Window.
 */
export type ToastWindowMessageType = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  title: string;
  buttons?: ('close' | 'exit' | 'restart')[];
  customButtons?: CustomBtn[];
};

export type CustomNotificationInfo = {
  key: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  description: string;
  buttons?: CustomBtn[];
  closeBtn?: boolean;
};

type CardOverlayState = {
  overlayStates: Record<string, boolean>;

  addOverlayState: (key: string, initialOpen?: boolean) => void;
  removeOverlayState: (key: string) => void;
  setOverlay: (key: string, isOpen: boolean) => void;
  openOverlay: (key: string) => void;
  closeOverlay: (key: string) => void;
  toggleOverlay: (key: string) => void;
  isOverlayOpen: (key: string) => boolean;
};

export type CardState = {
  title: string;
  id: string;
  description: string;
  repoUrl: string;
  extensionsDir?: string;
  haveArguments: boolean;
  type: 'image' | 'audio' | 'text' | 'unknown';
  isOnline?: boolean;
  logoUrl?: string;
  iconUrl?: string;
  developer?: string;

  installed: boolean;
  menuIsOpen: boolean;

  checkingForUpdate: boolean;

  setMenuIsOpen: (isOpen: boolean) => void;
  setCheckingForUpdate: (isChecking: boolean) => void;
  setTitle: (title: string) => void;
} & CardOverlayState;

export type SubscribeStages = 'insider' | 'early_access' | 'public';
export type SearchQuerySites = 'Google' | 'DuckDuckGo' | 'Reddit' | 'ChatGPT' | 'Perplexity' | 'Claude';

export type ElementResizeData = {width: number; height: number; dpr: number; x?: number; y?: number};

export type StorageUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'b' | 'kb' | 'mb' | 'gb' | 'tb' | 'pb';

export type HeroToastPlacement = 'top' | 'bottom';

export type ConfirmMenuTypes =
  'closeConfirm' | 'terminateAIConfirm' | 'closeTabConfirm' | 'exitSignalConfirm' | 'forceReloadConfirm';
