import {LynxHotkey, LynxInput, OnUpdatingExtensions, TooltipStatus} from '@lynx_common/types/ipc';
import StorageTypes, {InstalledCards} from '@lynx_common/types/storage';

import type {RunningCard, UpdatingCards} from './index';

type DuplicatedCard = {ogID: string; id: string; title: string};

/**
 * Redux `app` reducer state shape.
 */
export type AppState = {
  darkMode: boolean;
  onFocus: boolean;
  maximized: boolean;
  fullscreen: boolean;
  isOnline: boolean;
  navBar: boolean;
  appTitle: string | undefined;

  initializer: {
    showWizard: boolean;
    isUpgradeFlow: boolean;
  };
  showUpgradePromo: boolean;
  showStarPromo: boolean;
};

export type CardsState = {
  installedCards: InstalledCards;
  autoUpdate: string[];
  autoUpdateExtensions: string[];
  updatingExtensions: OnUpdatingExtensions | undefined;
  checkUpdateInterval: number;

  updatingCards: UpdatingCards;
  updateAvailable: string[];
  updateChecking: string;

  pinnedCards: string[];
  recentlyUsedCards: string[];
  runningCard: RunningCard[];
  homeCategory: string[];
  duplicates: DuplicatedCard[];

  activeTab: string;

  browserDomReadyIds: string[];
};

export type HotkeysState = {
  hotkeys: LynxHotkey[];
  input: LynxInput;

  isCtrlPressed: boolean;
  isShiftPressed: boolean;
  isAltPressed: boolean;
  isMetaPressed: boolean;
  key: string;
  type: 'keyUp' | 'keyDown' | string;

  copyPressed: boolean;
};

export type SettingState = {
  tooltipLevel: TooltipStatus;

  closeConfirm: boolean;
  closeTabConfirm: boolean;
  terminateAIConfirm: boolean;
  exitSignalConfirm: boolean;
  openLastSize: boolean;
  dynamicAppTitle: boolean;
  openLinkExternal: boolean;
  hardwareAcceleration: boolean;
  disableLoadingAnimations: boolean;

  updatedModules: string[];
  newModules: string[];

  updateAvailable: boolean;
  checkCustomUpdate: boolean;

  searchValue: string;
  searchWords: string[];
  selectedSection: string;
};

export type TerminalState = StorageTypes['terminal'];

/**
 * Redux `volume` reducer state shape.
 */
export type VolumeState = {
  // Per-tab volume levels (0-100)
  tabVolumes: {[tabId: string]: number};

  // Per-tab mute states
  tabMuted: {[tabId: string]: boolean};

  // Per-tab audio playing states
  tabAudioPlaying: {[tabId: string]: boolean};

  // Global mute state
  globalMuted: boolean;
};

/**
 * Root preload state passed into Redux store initialization.
 */
export type PreloadState = {
  app: AppState;
  cards: CardsState;
  hotkeys: HotkeysState;
  settings: SettingState;
  terminal: TerminalState;
  volume: VolumeState;
};
