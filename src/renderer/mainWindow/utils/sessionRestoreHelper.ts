import {cardsActions} from '@lynx/redux/reducers/cards';
import {tabsActions} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {RunningCard} from '@lynx/types';
import {defaultTabItem} from '@lynx/utils/constants';
import {RecentlyClosedTab, SavedRunningCard, SessionRestoreConfig, SessionSnapshot, TabInfo} from '@lynx_common/types';
import ptyIpc from '@lynx_shared/ipc/pty';

export type CurrentSessionState = {
  tabs: TabInfo[];
  activeTab?: string;
  activePage?: string;
  runningCards?: (RunningCard | SavedRunningCard)[];
};

/**
 * Filters tabs and running cards based on user restore configuration.
 */
export function filterSessionSnapshot(
  snapshot: SessionSnapshot,
  config: SessionRestoreConfig,
): {tabs: TabInfo[]; runningCards: SavedRunningCard[]; activeTab: string} {
  const {restoreBrowserTabs, restoreTerminalTabs, restoreAiCardTabs, restoreStaticPages, restorePinnedTabsOnly} =
    config;

  const validRunningCardsMap = new Map<string, SavedRunningCard>();
  snapshot.runningCards.forEach(rc => validRunningCardsMap.set(rc.tabId, rc));

  const filteredTabs: TabInfo[] = [];
  const filteredRunningCards: SavedRunningCard[] = [];

  for (const rawTab of snapshot.tabs) {
    if (restorePinnedTabsOnly && !rawTab.isPinned) {
      continue;
    }

    const runningCard = validRunningCardsMap.get(rawTab.id);

    if (runningCard) {
      if (runningCard.type === 'browser') {
        if (!restoreBrowserTabs) continue;
      } else if (runningCard.type === 'terminal') {
        if (!restoreTerminalTabs) continue;
      } else if (runningCard.type === 'both' || !runningCard.isEmptyRunning) {
        if (!restoreAiCardTabs) continue;
      }
      filteredRunningCards.push(runningCard);
    } else {
      if (!restoreStaticPages) continue;
    }

    const tabInfo: TabInfo = {
      id: rawTab.id,
      title: rawTab.title || 'New Tab',
      pageID: rawTab.pageID || defaultTabItem.pageID,
      isLoading: false,
      isTerminal: rawTab.isTerminal ?? false,
      favIcon: rawTab.favIcon || {show: false, url: ''},
      isPinned: Boolean(rawTab.isPinned),
      showIconOnly: Boolean(rawTab.showIconOnly),
    };

    filteredTabs.push(tabInfo);
  }

  const activeTabExists = filteredTabs.some(t => t.id === snapshot.activeTab);
  const activeTab = activeTabExists ? snapshot.activeTab : filteredTabs[0]?.id || defaultTabItem.id;

  return {
    tabs: filteredTabs.length > 0 ? filteredTabs : [defaultTabItem],
    runningCards: filteredRunningCards,
    activeTab,
  };
}

/**
 * Restores a full session snapshot into Redux and starts required processes and browser instances.
 */
export function restoreSessionSnapshot(
  snapshot: SessionSnapshot,
  config: SessionRestoreConfig,
  dispatch: AppDispatch,
): boolean {
  const {tabs, runningCards, activeTab} = filterSessionSnapshot(snapshot, config);

  if (tabs.length === 0) return false;

  const activeTabObj = tabs.find(t => t.id === activeTab) || tabs[0];

  // Set tabs state
  dispatch(tabsActions.setTabState({key: 'tabs', value: tabs}));
  dispatch(tabsActions.setTabState({key: 'activeTab', value: activeTabObj.id}));
  dispatch(tabsActions.setTabState({key: 'activePage', value: activeTabObj.pageID}));

  // Restore running cards
  for (const card of runningCards) {
    if (card.isEmptyRunning) {
      dispatch(
        cardsActions.addRunningEmpty({
          tabId: card.tabId,
          type: card.type,
          dir: card.dir,
        }),
      );
    } else {
      dispatch(
        cardsActions.addRunningCard({
          tabId: card.tabId,
          id: card.id,
        }),
      );
      ptyIpc.process(card.id, card.id);
    }

    if (card.customAddress) {
      dispatch(cardsActions.setRunningCardCustomAddress({tabId: card.tabId, address: card.customAddress}));
    }
    if (card.currentAddress) {
      dispatch(cardsActions.setRunningCardCurrentAddress({tabId: card.tabId, address: card.currentAddress}));
    }
    if (card.browserTitle) {
      dispatch(cardsActions.setRunningCardBrowserTitle({tabId: card.tabId, title: card.browserTitle}));
    }
    if (card.currentView) {
      dispatch(cardsActions.setRunningCardView({tabId: card.tabId, view: card.currentView}));
    }
  }

  return true;
}

/**
 * Restores a single recently closed tab from the undo stack.
 */
export function restoreSingleClosedTab(entry: RecentlyClosedTab, dispatch: AppDispatch): void {
  const {tab, runningCard} = entry;

  // Add the tab to tabs list and make it active
  dispatch(tabsActions.addTab({...tab, background: false}));

  if (runningCard) {
    if (runningCard.isEmptyRunning) {
      dispatch(
        cardsActions.addRunningEmpty({
          tabId: tab.id,
          type: runningCard.type,
          dir: runningCard.dir,
        }),
      );
    } else {
      dispatch(
        cardsActions.addRunningCard({
          tabId: tab.id,
          id: runningCard.id,
        }),
      );
      ptyIpc.process(runningCard.id, runningCard.id);
    }

    if (runningCard.customAddress) {
      dispatch(cardsActions.setRunningCardCustomAddress({tabId: tab.id, address: runningCard.customAddress}));
    }
    if (runningCard.currentAddress) {
      dispatch(cardsActions.setRunningCardCurrentAddress({tabId: tab.id, address: runningCard.currentAddress}));
    }
    if (runningCard.browserTitle) {
      dispatch(cardsActions.setRunningCardBrowserTitle({tabId: tab.id, title: runningCard.browserTitle}));
    }
    if (runningCard.currentView) {
      dispatch(cardsActions.setRunningCardView({tabId: tab.id, view: runningCard.currentView}));
    }
  }
}

/**
 * Compares current session state against a saved snapshot and restore configuration.
 * Returns true if the restorable state is functionally identical to the current state.
 */
export function isSameSessionState(
  current: CurrentSessionState,
  snapshot: SessionSnapshot,
  config: SessionRestoreConfig,
): boolean {
  const {
    tabs: targetTabs,
    runningCards: targetCards,
    activeTab: targetActiveTab,
  } = filterSessionSnapshot(snapshot, config);

  const currentTabs = current.tabs || [];
  const currentCards = current.runningCards || [];

  // Check tab count
  if (currentTabs.length !== targetTabs.length) {
    return false;
  }

  // Check running cards count
  if (currentCards.length !== targetCards.length) {
    return false;
  }

  // Compare tabs sequentially
  for (let i = 0; i < currentTabs.length; i++) {
    const currTab = currentTabs[i];
    const targetTab = targetTabs[i];

    if (!currTab || !targetTab) return false;

    // Compare tab page and properties
    if ((currTab.pageID || '') !== (targetTab.pageID || '')) {
      return false;
    }
    if (Boolean(currTab.isTerminal) !== Boolean(targetTab.isTerminal)) {
      return false;
    }
    if (Boolean(currTab.isPinned) !== Boolean(targetTab.isPinned)) {
      return false;
    }
    if (Boolean(currTab.showIconOnly) !== Boolean(targetTab.showIconOnly)) {
      return false;
    }

    // Compare associated running cards for this tab
    const currCard = currentCards.find(rc => rc.tabId === currTab.id);
    const targetCard = targetCards.find(rc => rc.tabId === targetTab.id);

    if (Boolean(currCard) !== Boolean(targetCard)) {
      return false;
    }

    if (currCard && targetCard) {
      if (currCard.type !== targetCard.type) return false;
      if (currCard.id !== targetCard.id) return false;
      if (Boolean(currCard.isEmptyRunning) !== Boolean(targetCard.isEmptyRunning)) return false;
      if ((currCard.currentView || '') !== (targetCard.currentView || '')) return false;
      if ((currCard.customAddress || '') !== (targetCard.customAddress || '')) return false;
      if ((currCard.currentAddress || '') !== (targetCard.currentAddress || '')) return false;
      if ((currCard.browserTitle || '') !== (targetCard.browserTitle || '')) return false;
    }
  }

  // Compare active tab index
  const currentActiveIndex = currentTabs.findIndex(t => t.id === current.activeTab);
  const targetActiveIndex = targetTabs.findIndex(t => t.id === targetActiveTab);

  if (currentActiveIndex !== -1 && targetActiveIndex !== -1 && currentActiveIndex !== targetActiveIndex) {
    return false;
  }

  // Check active page match if available
  if (current.activePage) {
    const targetActiveTabObj = targetTabs.find(t => t.id === targetActiveTab) || targetTabs[0];
    if (targetActiveTabObj && (targetActiveTabObj.pageID || '') !== current.activePage) {
      return false;
    }
  }

  return true;
}
