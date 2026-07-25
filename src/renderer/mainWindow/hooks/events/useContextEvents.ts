import {useRemoveTab} from '@lynx/layouts/tabs/utils';
import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {AppDispatch, getStore} from '@lynx/redux/store';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import ptyIpc from '@lynx_shared/ipc/pty';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

/**
 * Handles context menu actions for running processes.
 */
export const useContextEvents = () => {
  const runningCards = useCardsState('runningCard');

  const dispatch = useDispatch<AppDispatch>();
  const removeTab = useRemoveTab();

  useEffect(() => {
    const offStopAI = contextMenuIpc.on.stopProcess(id => removeTab({id}));

    const offRelaunchAI = contextMenuIpc.on.relaunchProcess(id => {
      const runningCard = runningCards.find(card => card.id === id);
      if (!runningCard) return;

      const targetTabId = runningCard.tabId;

      // Stop process & browser without removing the tab from tabs list
      if (runningCard.type !== 'browser') {
        ptyIpc.stop(runningCard.id);
      }
      dispatch(cardsActions.stopRunningCard({tabId: targetTabId}));

      setTimeout(() => {
        const store = getStore();
        const tabExists = store.getState().tabs.tabs.some(tab => tab.id === targetTabId);
        const finalTabId = tabExists ? targetTabId : store.getState().tabs.activeTab;

        if (runningCard.isEmptyRunning) {
          dispatch(cardsActions.addRunningEmpty({tabId: finalTabId, type: runningCard.type}));
        } else {
          ptyIpc.process(runningCard.id, runningCard.id);
          dispatch(cardsActions.addRunningCard({id: runningCard.id, tabId: finalTabId}));
        }
      }, 1000);
    });

    return () => {
      offRelaunchAI();
      offStopAI();
    };
  }, [runningCards, dispatch, removeTab]);
};
