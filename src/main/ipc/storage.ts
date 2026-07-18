import {storageChannels, storageUtilsChannels} from '@lynx_common/consts/ipcChannels/storage';
import {ChosenArgumentsData, ConfirmMenuTypes} from '@lynx_common/types';
import {
  BrowserHistoryData,
  CustomRunBehaviorData,
  HomeCategory,
  MainHT,
  OnPreCommands,
  PreCommands,
  PreOpen,
  PreOpenData,
  RecentlyOperation,
  StorageOperation,
} from '@lynx_common/types/ipc';
import AppStorageData, {InstalledCard, InstalledCards} from '@lynx_common/types/storage';
import classHolder from '@lynx_main/managers/classHolder';
import {app} from 'electron';

import lynxIpc from './ipcWrapper';
import {sendToMain} from './sender';

/**
 * Initializes listeners for core storage events.
 */
export default function listenStorage() {
  const storageManager = classHolder.storageManager;

  // Sets custom storage data by key
  storageIpc.on.setCustom((key, data) => storageManager.setCustomData(key, data));

  // Gets custom storage data by key
  storageIpc.handle.getCustom(key => storageManager.getCustomData(key));

  // Gets typed storage data by key
  storageIpc.handle.get(key => storageManager.getData(key));

  // Gets all storage data
  storageIpc.handle.getAll(() => storageManager.getAll());

  // Updates storage data partially
  storageIpc.handle.update((key, updateData) => {
    const res = storageManager.updateData(key, updateData);
    if (key === 'app') {
      if ((updateData as any).hotkeys) {
        import('../childWindows/spotlightChat').then(({RegisterSpotlightHotkey}) => {
          RegisterSpotlightHotkey();
        });
      }
      if ((updateData as any).spotlightAlwaysOnTop !== undefined) {
        const win = classHolder.spotlightChatWindow;
        if (win && !win.isDestroyed()) {
          win.setAlwaysOnTop((updateData as any).spotlightAlwaysOnTop);
        }
      }
      if ((updateData as any).spotlightShowTaskbar !== undefined) {
        const win = classHolder.spotlightChatWindow;
        if (win && !win.isDestroyed()) {
          win.setSkipTaskbar(!(updateData as any).spotlightShowTaskbar);
        }
      }
    }
    return res;
  });

  // Clears all storage data
  storageIpc.handle.clear(() => storageManager.clearStorage());
}

/**
 * Initializes listeners for storage utility events.
 */
export function listenStorageUtils() {
  const storageManager = classHolder.storageManager;

  // Sets app to start with system startup
  storageUtilsIpc.on.setSystemStartup(systemStartup => {
    app.setLoginItemSettings({openAtLogin: systemStartup});
    storageManager.updateData('app', {systemStartup});
  });

  // Adds installed card to storage
  storageUtilsIpc.on.addInstalledCard(cardData => storageManager.addInstalledCard(cardData));

  // Removes installed card from storage
  storageUtilsIpc.on.removeInstalledCard(cardId => storageManager.removeInstalledCard(cardId));

  // Adds card to auto-update list
  storageUtilsIpc.on.addAutoUpdateCard(cardId => storageManager.addAutoUpdateCard(cardId));

  // Removes card from auto-update list
  storageUtilsIpc.on.removeAutoUpdateCard(cardId => storageManager.removeAutoUpdateCard(cardId));

  // Adds card extensions to auto-update list
  storageUtilsIpc.on.addAutoUpdateExtensions(cardId => storageManager.addAutoUpdateExtensions(cardId));

  // Removes card extensions from auto-update list
  storageUtilsIpc.on.removeAutoUpdateExtensions(cardId => storageManager.removeAutoUpdateExtensions(cardId));

  // Manages pinned cards (add, remove, get)
  storageUtilsIpc.handle.pinnedCards((opt, id, pinnedCards) => storageManager.pinnedCardsOpt(opt, id, pinnedCards));

  // Manages recently used cards (add, remove, get)
  storageUtilsIpc.handle.recentlyUsedCards((opt, id) => storageManager.recentlyUsedCardsOpt(opt, id));

  // Manages home category organization
  storageUtilsIpc.handle.homeCategory((opt, data) => storageManager.handleHomeCategoryOperation(opt, data));

  // Manages pre-commands for cards (commands run before card starts)
  storageUtilsIpc.handle.preCommands((opt, data) => storageManager.handlePreCommandOperation(opt, data));

  // Manages custom run commands for cards
  storageUtilsIpc.handle.customRun((opt, data) => storageManager.handleCustomRunOperation(opt, data));

  // Manages pre-open items (files/folders opened before card starts)
  storageUtilsIpc.handle.preOpen((opt, data) => storageManager.handlePreOpenOperation(opt, data));

  // Updates custom run behavior settings
  storageUtilsIpc.on.customRunBehavior(data => storageManager.updateCustomRunBehavior(data));

  // Gets card arguments by card ID
  storageUtilsIpc.handle.getCardArguments(cardId => storageManager.getCardArgumentsById(cardId));

  // Sets card arguments by card ID
  storageUtilsIpc.handle.setCardArguments((cardId, args) => storageManager.setCardArguments(cardId, args));

  // Adds URL to browser recent list
  storageUtilsIpc.on.addBrowserRecent(recentEntry => storageManager.addBrowserRecent(recentEntry));

  // Adds URL to browser favorites
  storageUtilsIpc.on.addBrowserFavorite(favoriteEntry => storageManager.addBrowserFavorite(favoriteEntry));

  // Adds URL to browser history
  storageUtilsIpc.on.addBrowserHistory(historyEntry => storageManager.addBrowserHistory(historyEntry));

  // Adds favicon for browser recent URL
  storageUtilsIpc.on.addBrowserRecentFavIcon((url, favIcon, title) =>
    storageManager.addBrowserFavIcon(url, favIcon, title),
  );

  // Removes URL from browser recent list
  storageUtilsIpc.on.removeBrowserRecent(url => storageManager.removeBrowserRecent(url));

  // Removes URL from browser favorites
  storageUtilsIpc.on.removeBrowserFavorite(url => storageManager.removeBrowserFavorite(url));

  // Removes URL from browser history
  storageUtilsIpc.on.removeBrowserHistory(url => storageManager.removeBrowserHistory(url));

  // Sets confirmation dialog visibility (close, terminate AI, close tab)
  storageUtilsIpc.on.setShowConfirm((type, enable) => storageManager.setShowConfirm(type, enable));

  // Marks notification as read
  storageUtilsIpc.on.addReadNotif(id => storageManager.addReadNotif(id));

  // Sets terminal pre-commands for card
  storageUtilsIpc.on.setCardTerminalPreCommands((id, commands) =>
    storageManager.setCardTerminalPreCommands(id, commands),
  );

  // Unassigns card and optionally clears its configurations
  storageUtilsIpc.handle.unassignCard((id, clearConfigs) => storageManager.unassignCard(id, clearConfigs));

  // Gets browser history data securely
  storageUtilsIpc.handle.getBrowserHistoryData(() => storageManager.getBrowserDataSecurely());
}

/**
 * IPC interface for storage operations.
 */
export const storageIpc = {
  on: {
    /** Listens for set custom data request */
    setCustom: (callback: (key: string, data: any) => void) => lynxIpc.on(storageChannels.setCustom, callback),
  },
  handle: {
    /** Handles get custom data request */
    getCustom: (callback: (key: string) => MainHT<any>) => lynxIpc.handle(storageChannels.getCustom, callback),
    /** Handles get data request */
    get: (callback: (key: keyof AppStorageData) => MainHT<any>) => lynxIpc.handle(storageChannels.get, callback),
    /** Handles get all data request */
    getAll: (callback: () => MainHT<AppStorageData>) => lynxIpc.handle(storageChannels.getAll, callback),
    /** Handles update data request */
    update: (
      callback: (key: keyof AppStorageData, updateData: Partial<AppStorageData[keyof AppStorageData]>) => MainHT<void>,
    ) => lynxIpc.handle(storageChannels.update, callback),
    /** Handles clear storage request */
    clear: (callback: () => MainHT<void>) => lynxIpc.handle(storageChannels.clear, callback),
  },
};

/**
 * IPC interface for storage utility operations.
 */
export const storageUtilsIpc = {
  send: {
    /** Sends installed cards update */
    onInstalledCards: (cards: InstalledCards) => sendToMain(storageUtilsChannels.onInstalledCards, cards),
    /** Sends pinned cards update */
    onPinnedCardsChange: (cards: string[]) => sendToMain(storageUtilsChannels.onPinnedCardsChange, cards),
    /** Sends recently used cards update */
    onRecentlyUsedCardsChange: (cards: string[]) => sendToMain(storageUtilsChannels.onRecentlyUsedCardsChange, cards),
    /** Sends home category update */
    onHomeCategory: (data: HomeCategory) => sendToMain(storageUtilsChannels.onHomeCategory, data),
    /** Sends pre-commands update */
    onPreCommands: (commands: OnPreCommands) => sendToMain(storageUtilsChannels.onPreCommands, commands),
    /** Sends custom run update */
    onCustomRun: (commands: OnPreCommands) => sendToMain(storageUtilsChannels.onCustomRun, commands),
    /** Sends confirm dialog settings change */
    onConfirmChange: (type: ConfirmMenuTypes, enable: boolean) =>
      sendToMain(storageUtilsChannels.onConfirmChange, type, enable),

    /** Sends generic array update */
    onArrayUpdate: (channel: string, array: string[]) => sendToMain(channel, array),
  },
  on: {
    /** Listens for set system startup request */
    setSystemStartup: (callback: (systemStartup: boolean) => void) =>
      lynxIpc.on(storageUtilsChannels.setSystemStartup, callback),
    /** Listens for add installed card request */
    addInstalledCard: (callback: (cardData: InstalledCard) => void) =>
      lynxIpc.on(storageUtilsChannels.addInstalledCard, callback),
    /** Listens for remove installed card request */
    removeInstalledCard: (callback: (cardId: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeInstalledCard, callback),
    /** Listens for add auto-update card request */
    addAutoUpdateCard: (callback: (cardId: string) => void) =>
      lynxIpc.on(storageUtilsChannels.addAutoUpdateCard, callback),
    /** Listens for remove auto-update card request */
    removeAutoUpdateCard: (callback: (cardId: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeAutoUpdateCard, callback),
    /** Listens for add auto-update extensions request */
    addAutoUpdateExtensions: (callback: (cardId: string) => void) =>
      lynxIpc.on(storageUtilsChannels.addAutoUpdateExtensions, callback),
    /** Listens for remove auto-update extensions request */
    removeAutoUpdateExtensions: (callback: (cardId: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeAutoUpdateExtensions, callback),
    /** Listens for add browser recent favicon request */
    addBrowserRecentFavIcon: (callback: (url: string, favIcon: string, title?: string) => void) =>
      lynxIpc.on(storageUtilsChannels.addBrowserRecentFavIcon, callback),
    /** Listens for remove browser recent request */
    removeBrowserRecent: (callback: (url: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeBrowserRecent, callback),
    /** Listens for remove browser favorite request */
    removeBrowserFavorite: (callback: (url: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeBrowserFavorite, callback),
    /** Listens for remove browser history request */
    removeBrowserHistory: (callback: (url: string) => void) =>
      lynxIpc.on(storageUtilsChannels.removeBrowserHistory, callback),
    /** Listens for set show confirm request */
    setShowConfirm: (callback: (type: ConfirmMenuTypes, enable: boolean) => void) =>
      lynxIpc.on(storageUtilsChannels.setShowConfirm, callback),
    /** Listens for add read notification request */
    addReadNotif: (callback: (id: string) => void) => lynxIpc.on(storageUtilsChannels.addReadNotif, callback),
    /** Listens for set card terminal pre-commands request */
    setCardTerminalPreCommands: (callback: (id: string, commands: string[]) => void) =>
      lynxIpc.on(storageUtilsChannels.setCardTerminalPreCommands, callback),
    /** Listens for add browser favorite request */
    addBrowserFavorite: (callback: (favoriteEntry: string) => MainHT<void>) =>
      lynxIpc.on(storageUtilsChannels.addBrowserFavorite, callback),
    /** Listens for custom run behavior update request */
    customRunBehavior: (callback: (data: Partial<CustomRunBehaviorData>) => MainHT<void>) =>
      lynxIpc.on(storageUtilsChannels.customRunBehavior, callback),
    /** Listens for add browser recent request */
    addBrowserRecent: (callback: (recentEntry: string) => MainHT<void>) =>
      lynxIpc.on(storageUtilsChannels.addBrowserRecent, callback),
    /** Listens for add browser history request */
    addBrowserHistory: (callback: (historyEntry: string) => MainHT<void>) =>
      lynxIpc.on(storageUtilsChannels.addBrowserHistory, callback),
  },
  handle: {
    /** Handles pinned cards operations */
    pinnedCards: (callback: (opt: StorageOperation, id: string, pinnedCards?: string[]) => MainHT<string[]>) =>
      lynxIpc.handle(storageUtilsChannels.pinnedCards, callback),
    /** Handles recently used cards operations */
    recentlyUsedCards: (callback: (opt: RecentlyOperation, id: string) => MainHT<string[]>) =>
      lynxIpc.handle(storageUtilsChannels.recentlyUsedCards, callback),
    /** Handles home category operations */
    homeCategory: (callback: (opt: StorageOperation, data: string[]) => MainHT<string[]>) =>
      lynxIpc.handle(storageUtilsChannels.homeCategory, callback),
    /** Handles pre-commands operations */
    preCommands: (callback: (opt: StorageOperation, data: PreCommands) => MainHT<string[]>) =>
      lynxIpc.handle(storageUtilsChannels.preCommands, callback),
    /** Handles custom run operations */
    customRun: (callback: (opt: StorageOperation, data: PreCommands) => MainHT<string[]>) =>
      lynxIpc.handle(storageUtilsChannels.customRun, callback),
    /** Handles pre-open operations */
    preOpen: (callback: (opt: StorageOperation, data: PreOpen) => MainHT<PreOpenData>) =>
      lynxIpc.handle(storageUtilsChannels.preOpen, callback),
    /** Handles get card arguments request */
    getCardArguments: (callback: (cardId: string) => MainHT<ChosenArgumentsData>) =>
      lynxIpc.handle(storageUtilsChannels.getCardArguments, callback),
    /** Handles set card arguments request */
    setCardArguments: (callback: (cardId: string, args: ChosenArgumentsData) => MainHT<void>) =>
      lynxIpc.handle(storageUtilsChannels.setCardArguments, callback),
    /** Handles unassign card request */
    unassignCard: (callback: (id: string, clearConfigs: boolean) => MainHT<void>) =>
      lynxIpc.handle(storageUtilsChannels.unassignCard, callback),
    /** Handles get browser history data securely request */
    getBrowserHistoryData: (callback: () => MainHT<BrowserHistoryData>) =>
      lynxIpc.handle(storageUtilsChannels.getBrowserHistoryData, callback),
  },
};
