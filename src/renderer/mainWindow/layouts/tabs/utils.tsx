import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {sessionActions} from '@lynx/redux/reducers/session';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {volumeActions} from '@lynx/redux/reducers/volume';
import {AppDispatch} from '@lynx/redux/store';
import applicationIpc from '@lynx_shared/ipc/application';
import browserIpc from '@lynx_shared/ipc/browser';
import ptyIpc from '@lynx_shared/ipc/pty';
import {useCallback, useMemo} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Hook to handle tab removal logic.
 * Stops associated processes (pty), clears progress bars, records closed tabs history, and updates Redux state.
 * @returns A function to remove a tab by tabId or process id.
 */
export function useRemoveTab() {
  const runningCards = useCardsState('runningCard');
  const tabs = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();

  return useCallback(
    ({tabId, id}: {tabId?: string; id?: string}) => {
      const running = runningCards.find(card => card.tabId === tabId || card.id === id);

      if (running && running.type !== 'browser') {
        ptyIpc.stop(running.id);
      }

      const tId = tabId || running?.tabId;

      if (tId) {
        // Clear window progress bar if the removed tab had progress and was active
        const removedTab = tabs.find(tab => tab.id === tId);
        if (removedTab?.progress && tId === activeTab) {
          applicationIpc.send.setProgressBar(-1);
        }

        if (removedTab) {
          dispatch(
            sessionActions.pushClosedTab({
              tab: removedTab,
              runningCard: running
                ? {
                    tabId: running.tabId,
                    id: running.id,
                    type: running.type,
                    isEmptyRunning: running.isEmptyRunning,
                    currentView: running.currentView,
                    customAddress: running.customAddress,
                    webUIAddress: running.webUIAddress,
                    currentAddress: running.currentAddress,
                    browserTitle: running.browserTitle,
                    startTime: running.startTime,
                  }
                : undefined,
            }),
          );
        }

        dispatch(tabsActions.removeTab(tId));
        dispatch(cardsActions.stopRunningCard({tabId: tId}));
        dispatch(volumeActions.removeTab(tId));
        browserIpc.send.removeBrowser(tId);
      }
    },
    [runningCards, tabs, activeTab, dispatch],
  );
}

/**
 * Hook to check if a specific tab is currently active.
 * @param tabID - The ID of the tab to check.
 * @returns True if the tab is active, false otherwise.
 */
export function useIsActiveTab(tabID: string) {
  const activeTab = useTabsState('activeTab');

  return useMemo(() => activeTab === tabID, [activeTab, tabID]);
}
