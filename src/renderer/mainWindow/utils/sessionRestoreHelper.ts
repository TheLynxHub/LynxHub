import {cardsActions} from '@lynx/redux/reducers/cards';
import {tabsActions} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {defaultTabItem} from '@lynx/utils/constants';
import {RecentlyClosedTab, SavedRunningCard, SessionRestoreConfig, SessionSnapshot, TabInfo} from '@lynx_common/types';
import ptyIpc from '@lynx_shared/ipc/pty';

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
