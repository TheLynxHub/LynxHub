import {extensionsData} from '@lynx/plugins/extensions/loader';
import {PreloadState} from '@lynx/types/reducers';
import {isWin} from '@lynx_common/utils';
import storageIpc from '@lynx_shared/ipc/storage';
import {configureStore} from '@reduxjs/toolkit';
import {createReduxEnhancer} from '@sentry/react';

import {actionLoggerMiddleware} from './middleware/actionLogger';
import app from './reducers/app';
import cards from './reducers/cards';
import hotkeys from './reducers/hotkeys';
import modals from './reducers/modals';
import plugins from './reducers/plugins';
import settings from './reducers/settings';
import tabs from './reducers/tabs';
import terminal from './reducers/terminal';
import trigger from './reducers/triggers';
import user from './reducers/user';
import volume from './reducers/volume';
import {getIsDarkMode, getStorageData} from './storageInit';

const staticReducers = {
  app,
  tabs,
  user,
  cards,
  modals,
  settings,
  terminal,
  hotkeys,
  plugins,
  volume,
  trigger,
};

const emptyHotkeyInput = {
  key: '',
  shift: false,
  control: false,
  alt: false,
  meta: false,
  type: '',
} as const;

const sentryReduxEnhancer = createReduxEnhancer({});

const resolveInitializerState = (oldSetupDone: boolean, newSetupDone: boolean): PreloadState['app']['initializer'] => {
  if (newSetupDone) {
    return {showWizard: false, isUpgradeFlow: false};
  }

  if (oldSetupDone && !isWin) {
    storageIpc.update('app', {inited: true});
    return {showWizard: false, isUpgradeFlow: false};
  }

  return {showWizard: true, isUpgradeFlow: oldSetupDone};
};

const buildPreloadedState = (): PreloadState | undefined => {
  const storage = getStorageData();
  if (!storage) return undefined;

  const darkMode = getIsDarkMode();
  const oldSetupDone = storage.app.initialized;
  const newSetupDone = storage.app.inited;
  const initializer = resolveInitializerState(oldSetupDone, newSetupDone);

  return {
    app: {
      darkMode,
      fullscreen: false,
      isOnline: false,
      maximized: false,
      onFocus: true,
      navBar: true,
      appTitle: undefined,
      initializer,
      showUpgradePromo: false,
      showStarPromo: false,
    },
    cards: {
      autoUpdate: storage.cards.autoUpdateCards,
      installedCards: storage.cards.installedCards,
      pinnedCards: storage.cards.pinnedCards,
      updateAvailable: [],
      updatingCards: [],
      runningCard: [],
      recentlyUsedCards: storage.cards.recentlyUsedCards,
      homeCategory: storage.app.homeCategory,
      autoUpdateExtensions: storage.cards.autoUpdateExtensions,
      updatingExtensions: undefined,
      duplicates: storage.cards.duplicated,
      checkUpdateInterval: storage.cards.checkUpdateInterval,
      activeTab: '',
      browserDomReadyIds: [],
      updateChecking: '',
    },
    hotkeys: {
      input: emptyHotkeyInput,
      isCtrlPressed: false,
      isShiftPressed: false,
      isAltPressed: false,
      isMetaPressed: false,
      key: '',
      type: '',
      copyPressed: false,
      hotkeys: storage.app.hotkeys,
    },
    settings: {
      tooltipLevel: storage.app.tooltipStatus,
      closeConfirm: storage.app.closeConfirm,
      closeTabConfirm: storage.app.closeTabConfirm,
      terminateAIConfirm: storage.app.terminateAIConfirm,
      exitSignalConfirm: storage.app.exitSignalConfirm,
      openLastSize: storage.app.openLastSize,
      updatedModules: [],
      newModules: [],
      updateAvailable: false,
      dynamicAppTitle: storage.app.dynamicAppTitle,
      openLinkExternal: storage.app.openLinkExternal,
      hardwareAcceleration: storage.app.hardwareAcceleration,
      disableLoadingAnimations: storage.app.disableLoadingAnimations,
      checkCustomUpdate: false,
      searchValue: '',
      searchWords: [],
      selectedSection: '',
    },
    terminal: storage.terminal,
    volume: {
      tabVolumes: storage.browser.volumeSettings?.tabVolumes || {},
      tabMuted: {},
      tabAudioPlaying: {},
      globalMuted: storage.browser.volumeSettings?.globalMuted ?? false,
    },
  };
};

let store = configureStore({
  reducer: staticReducers,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(actionLoggerMiddleware),
});

export const createStore = (collectError: boolean) => {
  const extensionReducers = extensionsData.addReducer.reduce<
    Record<string, (state: unknown, action: unknown) => unknown>
  >((acc, reducer) => {
    acc[reducer.name] = reducer.reducer;
    return acc;
  }, {});

  const preloadedState = buildPreloadedState();

  store = configureStore({
    reducer: {
      ...staticReducers,
      ...extensionReducers,
    },
    preloadedState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        serializableCheck: false,
      }).concat(actionLoggerMiddleware),
    enhancers: collectError
      ? getDefaultEnhancers => {
          return getDefaultEnhancers().concat(sentryReduxEnhancer);
        }
      : undefined,
  });

  return store;
};

export const getStore = () => store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
