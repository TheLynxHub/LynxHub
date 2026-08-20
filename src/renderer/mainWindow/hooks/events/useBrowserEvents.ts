import {appActions, useAppState} from '@lynx/redux/reducers/app';
import {useBookmarksState} from '@lynx/redux/reducers/bookmarks';
import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {defaultTabItem} from '@lynx/utils/constants';
import applicationIpc from '@lynx_shared/ipc/application';
import browserIpc from '@lynx_shared/ipc/browser';
import {capitalize} from 'lodash-es';
import {useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Handles browser events such as loading, title, favicon, and URL changes.
 */
export const useBrowserEvents = () => {
  const runningCards = useCardsState('runningCard');
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const offIsLoading = browserIpc.on.loading((id, isLoading) => {
      const tabID = runningCards.find(card => card.id === id)?.tabId;
      if (tabID) dispatch(tabsActions.setTabLoading({tabID, isLoading}));
    });

    const offTitleChange = browserIpc.on.titleChanged((id, title) => {
      const tabID = runningCards.find(card => card.id === id)?.tabId;
      if (tabID) {
        // Replace "about:blank" with a friendly name
        const displayTitle = title === 'about:blank' ? 'Browser' : title;
        dispatch(tabsActions.setTabTitle({tabID, title: displayTitle}));
        dispatch(cardsActions.setRunningCardBrowserTitle({tabId: tabID, title: displayTitle}));
      }
    });

    const offFavIconChange = browserIpc.on.favIconChanged((id, url) => {
      const tabID = runningCards.find(card => card.id === id)?.tabId;
      if (tabID) dispatch(tabsActions.setTabFavIcon({tabID, show: true, url}));
    });

    const offUrlChange = browserIpc.on.urlChanged((id, url) => {
      const tabID = runningCards.find(card => card.id === id)?.tabId;
      if (tabID) dispatch(cardsActions.setRunningCardCurrentAddress({tabId: tabID, address: url}));
    });

    return () => {
      offIsLoading();
      offTitleChange();
      offFavIconChange();
      offUrlChange();
    };
  }, [runningCards, dispatch]);
};

/**
 * Updates the application window title based on the active tab and running card.
 */
export const useAppTitleEvents = () => {
  const dispatch = useDispatch<AppDispatch>();
  const appTitle = useAppState('appTitle');

  const activeTab = useTabsState('activeTab');
  const tabs = useTabsState('tabs');
  const runningCard = useCardsState('runningCard');

  useEffect(() => {
    const currentView = capitalize(runningCard.find(card => card.tabId === activeTab)?.currentView);
    const title = tabs.find(tab => tab.id === activeTab)?.title;
    const result = title && `${title} - ${currentView}`;

    if (result && appTitle !== result) dispatch(appActions.setAppTitle(title && `${title} - ${currentView}`));
  }, [runningCard, activeTab, tabs, appTitle, dispatch]);
};

/**
 * Handles new tab creation events from the main process.
 */
export const useNewTabEvents = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tabs = useTabsState('tabs');
  const newTabBehavior = useBookmarksState('newTabBehavior');

  const [pendingTab, setPendingTab] = useState<{url: string; background: boolean} | null>(null);
  const prevTabsLength = useRef(tabs.length);

  // When tabs array grows, find the new tab and set up the running card
  useEffect(() => {
    if (pendingTab && tabs.length > prevTabsLength.current) {
      // Find the newly added tab (last one in the array)
      const newTab = tabs[tabs.length - 1];
      if (newTab) {
        const cardType = newTabBehavior === 'both' ? 'both' : 'browser';
        dispatch(
          cardsActions.addRunningEmpty({
            tabId: newTab.id,
            type: cardType,
          }),
        );
        dispatch(
          cardsActions.setRunningCardCustomAddress({
            tabId: newTab.id,
            address: pendingTab.url,
          }),
        );
        if (cardType === 'both') {
          dispatch(
            cardsActions.setRunningCardView({
              tabId: newTab.id,
              view: 'browser',
            }),
          );
        }
      }
      setPendingTab(null);
    }
    prevTabsLength.current = tabs.length;
  }, [tabs.length, pendingTab, tabs, newTabBehavior, dispatch]);

  useEffect(() => {
    const offNewTab = applicationIpc.on.onNewTab((url, background = false) => {
      setPendingTab({url, background});
      dispatch(tabsActions.addTab({...defaultTabItem, background}));
    });

    return () => offNewTab();
  }, [dispatch]);
};
