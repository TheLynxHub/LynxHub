import browserIpc from '@lynx_shared/ipc/browser';
import {useEffect, useRef} from 'react';

import {ChatStep} from '../useChatBridge';

interface UseChatBridgeVisibilityParams {
  tabID: string;
  activeTab: string;
  step: ChatStep;
  currentCardId: string | null | undefined;
  bgChatEnabledCards: string[];
  activeWindow: string | null | undefined;
}

export function useChatBridgeVisibility({
  tabID,
  activeTab,
  step,
  currentCardId,
  bgChatEnabledCards,
  activeWindow,
}: UseChatBridgeVisibilityParams) {
  const activeWindowRef = useRef(activeWindow);
  useEffect(() => {
    activeWindowRef.current = activeWindow;
  }, [activeWindow]);

  const lastStepRef = useRef(step);
  const lastActiveTabRef = useRef(activeTab);

  // Handle visibility transitions
  useEffect(() => {
    if (!currentCardId || currentCardId === 'unified') return;

    const viewId = `online-bg-${currentCardId}`;
    const isTabFocused = activeTab === tabID;

    const stepChangedToLogin = step === 'login' && lastStepRef.current !== 'login';
    const tabFocusedWithLogin = isTabFocused && lastActiveTabRef.current !== tabID && step === 'login';

    lastStepRef.current = step;
    lastActiveTabRef.current = activeTab;

    if (isTabFocused) {
      if (step === 'login') {
        if (stepChangedToLogin || tabFocusedWithLogin || !activeWindowRef.current) {
          browserIpc.send.setVisible(viewId, true);
        }
      } else if (step === 'chat') {
        if (activeWindowRef.current === 'main') {
          browserIpc.send.setVisible(viewId, false, 'offscreen');
        }
      } else {
        if (activeWindowRef.current === 'main') {
          browserIpc.send.setVisible(viewId, false, 'detach');
        }
      }
    } else {
      if (activeWindowRef.current === 'main') {
        const isBgEnabled = bgChatEnabledCards.includes(currentCardId);
        browserIpc.send.setVisible(viewId, false, isBgEnabled ? 'offscreen' : 'detach');
      }
    }

    return () => {
      if (activeWindowRef.current === 'main') {
        const isBgEnabled = bgChatEnabledCards.includes(currentCardId);
        browserIpc.send.setVisible(viewId, false, isBgEnabled ? 'offscreen' : 'detach');
      }
    };
  }, [tabID, activeTab, step, currentCardId, bgChatEnabledCards]);

  // Reclaim free webview when it becomes free (activeWindow becomes null)
  useEffect(() => {
    if (!currentCardId || currentCardId === 'unified') return;
    const viewId = `online-bg-${currentCardId}`;
    const isTabFocused = activeTab === tabID;

    if (isTabFocused && step === 'login' && !activeWindow) {
      browserIpc.send.setVisible(viewId, true);
    }
  }, [activeWindow, currentCardId, step, activeTab, tabID]);
}
