import {CustomArg, StorageChosenArgumentsData} from './index';
import {
  AgentTypes,
  CustomRunBehaviorStore,
  DarkModeTypes,
  FavIcons,
  HomeCategory,
  LynxHotkey,
  StoragePreOpenData,
  TaskbarStatus,
  TerminalCursorInactiveStyle,
  TerminalCursorStyle,
  TerminalUseConpty,
  TooltipStatus,
} from './ipc';

/**
 * Rectangle definition compatible with Electron's Rectangle.
 * Used for window bounds.
 */
export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Represents an installed card (module/extension).
 */
export type InstalledCard = {
  id: string;
  dir?: string;
};

export type InstalledCards = InstalledCard[];

/**
 * Storage section for cards (modules) configuration.
 */
export type CardsStorage = {
  installedCards: InstalledCards;
  autoUpdateCards: string[];
  autoUpdateExtensions: string[];
  checkUpdateInterval: number;
  pinnedCards: string[];
  recentlyUsedCards: string[];
  zoomFactor: number;
  duplicated: {ogID: string; id: string; title: string}[];
  cardTerminalPreCommands: {id: string; commands: string[]}[];
};

/**
 * Storage section for cards execution configuration.
 */
export type CardsConfigStorage = {
  preCommands: {cardId: string; data: string[]}[];
  customRun: {cardId: string; data: string[]}[];
  customRunBehavior: CustomRunBehaviorStore;
  preOpen: StoragePreOpenData;
  args: StorageChosenArgumentsData;
  customArgs: {global: CustomArg[]; perCard: {cardId: string; args: CustomArg[]}[]};
};

/**
 * Storage section for general application settings.
 */
export type AppConfigStorage = {
  closeConfirm: boolean;
  terminateAIConfirm: boolean;
  closeTabConfirm: boolean;
  exitSignalConfirm: boolean;
  openLastSize: boolean;
  dynamicAppTitle: boolean;
  openLinkExternal: boolean;
  hardwareAcceleration: boolean;
  lastSize:
    | {
        maximized: boolean;
        bounds: Rectangle | undefined;
      }
    | undefined;
  homeCategory: HomeCategory;
  darkMode: DarkModeTypes;
  taskbarStatus: TaskbarStatus;
  tooltipStatus: TooltipStatus;
  systemStartup: boolean;
  startMinimized: boolean;
  startMaximized: boolean;
  startupLastActivePage: boolean;
  lastPage: string;
  hotkeys: LynxHotkey[];
  initialized: boolean;
  inited: boolean;
  appDataDir: string;
  disableLoadingAnimations: boolean;
  collectErrors: boolean;
  addBreadcrumbs: boolean;
  sentryDsn: string;
  anonymousId: string;
  activeDays: string[];
  totalUsageTime: number;
  hasSeenUpgradePromo: boolean;
  hasSeenStarPromo: boolean;
  hasStarredRepo: boolean;
  lastPromoShownActiveDaysCount?: number;
  imageCacheIntervalDays: number;
  imageCacheMaxSize: number;
};

/**
 * Storage section for terminal emulator settings.
 */
export type TerminalStorage = {
  outputColor: boolean;
  useConpty: TerminalUseConpty;
  scrollBack: number;
  fontSize: number;
  cursorStyle: TerminalCursorStyle;
  cursorInactiveStyle: TerminalCursorInactiveStyle;
  blinkCursor: boolean;
  resizeDelay: number;
  fontLoadTimeout: number;
  closeTabOnExit: boolean;
  enableLigatures: boolean;
  cdHistory: string[];
  quickCommands: {label: string; command: string}[];
  sendYWithExit: boolean;
  openLinkNewTab: boolean;
};

/**
 * Storage section for internal browser settings.
 */
export type BrowserStorage = {
  recentAddress: string[];
  favoriteAddress: string[];
  historyAddress: string[];
  favIcons: FavIcons[];
  userAgent: AgentTypes;
  customUserAgent: string;
  downloadLocation: string;
  downloadBehavior: 'ask' | 'default';
  clearedDownloads: string[];
  volumeSettings: {
    globalMuted: boolean;
    tabVolumes: {[cardId: string]: number};
  };
  historyLimits: {
    recentAddress: number;
    historyAddress: number;
    favoriteAddress: number;
    favIcons: number;
  };
};

/**
 * Storage section for notifications.
 */
export type NotificationStorage = {
  readNotifs: string[];
};

/**
 * Storage section for plugins state.
 */
export type PluginStorage = {
  migrated: boolean;
  disabledCards: string[];
};

/**
 * Storage section for performance and hardware settings.
 */
export type PerformanceStorage = {
  forceColorProfile: 'default' | 'srgb' | 'display-p3' | 'color-spin-gamma24';
  highDpiSupport: boolean;
  autoplayPolicy:
    'default' | 'no-user-gesture-required' | 'user-gesture-required' | 'document-user-activation-required';
  enableAcceleratedVideoDecode: boolean;
  jsMaxOldSpaceSize: 2048 | 4096 | 8192;
  ignoreGpuBlocklist: boolean;
  diskCacheSize: 0 | 268435456 | 536870912 | 1073741824;
  enableWebAssemblySimd: boolean;
  forceHighPerformanceGpu: boolean;
  disableGpuVsync: boolean;
  disableFrameRateLimit: boolean;
  enableGpuRasterization: boolean;
  enableZeroCopy: boolean;
  enableParallelDownloading: boolean;
  enableSkiaGraphite: boolean;
};

/**
 * Main storage data structure for the application.
 * Used by LowDB for persistence.
 */
type AppStorageData = {
  storage: {
    version: number;
  };
  cards: CardsStorage;
  cardsConfig: CardsConfigStorage;
  app: AppConfigStorage;
  terminal: TerminalStorage;
  browser: BrowserStorage;
  notification: NotificationStorage;
  plugin: PluginStorage;
  performance: PerformanceStorage;
};

export default AppStorageData;
