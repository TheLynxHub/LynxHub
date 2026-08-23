import {useCardsState} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {SessionSnapshot} from '@lynx_common/types';
import sessionIpc from '@lynx_shared/ipc/session';
import {useEffect, useRef} from 'react';

/**
 * Hook to continuously track and persist a debounced session snapshot to SQLite.
 */
export default function useSessionSnapshotTracker() {
  const tabs = useTabsState('tabs');
  const activeTab = useTabsState('activeTab');
  const runningCards = useCardsState('runningCard');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!tabs || tabs.length === 0) return;

      const snapshot: SessionSnapshot = {
        tabs: tabs.map(t => ({
          id: t.id,
          title: t.title,
          pageID: t.pageID,
          favIcon: t.favIcon,
          isTerminal: t.isTerminal,
          isPinned: t.isPinned,
          showIconOnly: t.showIconOnly,
        })),
        activeTab,
        runningCards: (runningCards || []).map(rc => ({
          tabId: rc.tabId,
          id: rc.id,
          type: rc.type,
          isEmptyRunning: rc.isEmptyRunning,
          currentView: rc.currentView,
          customAddress: rc.customAddress,
          webUIAddress: rc.webUIAddress,
          currentAddress: rc.currentAddress,
          browserTitle: rc.browserTitle,
          startTime: rc.startTime,
        })),
        timestamp: Date.now(),
      };

      sessionIpc.saveSnapshot('current', snapshot).catch(err => {
        console.warn('[SessionTracker] Failed to save session snapshot:', err);
      });
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [tabs, activeTab, runningCards]);
}
