import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import {chatBridgeActions, ChatBridgeModuleState, useChatBridgeSelector} from '@lynx/redux/reducers/chatBridge';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import browserIpc from '@lynx_shared/ipc/browser';
import storageIpc from '@lynx_shared/ipc/storage';
import {useEffect, useMemo, useRef} from 'react';
import {useDispatch} from 'react-redux';

import {resolveOnlineScript} from '../utils/onlineChatScripts';

export function useOnlineBgManager() {
  const dispatch = useDispatch<AppDispatch>();
  const allCards = useAllCardDataWithPath();
  const activeTab = useTabsState('activeTab');
  const bgChatEnabledCards = useChatBridgeSelector(state => state.bgChatEnabledCards);
  const activeUnifiedCardId = useChatBridgeSelector(state => state.activeUnifiedCardId);
  const modules = useChatBridgeSelector(state => state.modules);

  const modulesRef = useRef(modules);
  useEffect(() => {
    modulesRef.current = modules;
  }, [modules]);

  const ignoreCounterRef = useRef<{[cardId: string]: number}>({});

  const onlineCards = useMemo(() => allCards.filter(card => card.isOnline && card.id !== 'unified'), [allCards]);

  // Determine active AI Card ID
  const activeAiId = useMemo(() => {
    if (activeTab?.startsWith('chat-bridge-')) {
      return activeTab.replace('chat-bridge-', '');
    }
    if (activeTab === 'chat-bridge') {
      return activeUnifiedCardId;
    }
    return null;
  }, [activeTab, activeUnifiedCardId]);

  const loadedViews = useRef<Set<string>>(new Set());
  const activeIntervals = useRef<{[cardId: string]: NodeJS.Timeout[]}>({});
  const lastChangeTimeRef = useRef<{[cardId: string]: number}>({});
  const isGeneratingRef = useRef<{[cardId: string]: boolean}>({});
  const prevMessagesRef = useRef<{[cardId: string]: any[]}>({});

  // 1. Initial storage load on mount
  useEffect(() => {
    storageIpc.get('plugin').then(plugin => {
      if (plugin?.bgChatEnabledCards) {
        dispatch(chatBridgeActions.setBgChatEnabledCards(plugin.bgChatEnabledCards));
        dispatch(chatBridgeActions.setVisibleModuleIds(plugin.bgChatEnabledCards));
      }
    });
  }, [dispatch]);

  // 2. Background browser view loading and polling reconciliation
  useEffect(() => {
    const targetCardIds = new Set<string>();

    // Add active AI if it is online
    if (activeAiId && onlineCards.some(c => c.id === activeAiId)) {
      targetCardIds.add(activeAiId);
    }

    // Add active unified AI if set (for Float Chat or Unified Mode sync)
    if (activeUnifiedCardId && onlineCards.some(c => c.id === activeUnifiedCardId)) {
      targetCardIds.add(activeUnifiedCardId);
    }

    // Add all background-enabled AIs
    bgChatEnabledCards.forEach(id => {
      if (onlineCards.some(c => c.id === id)) {
        targetCardIds.add(id);
      }
    });

    // A. Start new background views and set up polling
    targetCardIds.forEach(cardId => {
      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig || !card.onlineConfig.selectors) return;
      const {selectors} = card.onlineConfig;

      const viewId = `online-bg-${cardId}`;

      // Initialize browser view if not loaded
      if (!loadedViews.current.has(cardId)) {
        browserIpc.send.createBrowser(viewId, {backgroundThrottling: false});
        browserIpc.send.loadURL(viewId, card.onlineConfig.url);
        browserIpc.send.setVisible(viewId, false, 'offscreen');
        loadedViews.current.add(cardId);
      }

      // Check if polling rates need updates
      const isCurrent = cardId === activeAiId;
      const msgIntervalTime = isCurrent ? 1000 : 5000;
      const histIntervalTime = isCurrent ? 2500 : 8000;

      // Clear existing intervals
      if (activeIntervals.current[cardId]) {
        activeIntervals.current[cardId].forEach(clearInterval);
      }

      // Scraping Functions
      const runScrapeMessages = async () => {
        const script = resolveOnlineScript('scrapeMessages', card);
        try {
          const res = await browserIpc.invoke.executeJavaScript(viewId, script);
          if (Array.isArray(res)) {
            const validMsgs = res
              .map((m: any) => ({
                sender: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
                text: String(m.text || '').trim(),
              }))
              .filter(m => m.text.length > 0);

            // Detect AI generating progress
            const lastMsg = validMsgs[validMsgs.length - 1];
            const prevLastMsg = prevMessagesRef.current[cardId]?.[prevMessagesRef.current[cardId].length - 1];
            let isGenerating = isGeneratingRef.current[cardId] || false;

            if (lastMsg) {
              if (lastMsg.sender === 'user') {
                // Keep generating state
              } else {
                if (!prevLastMsg || prevLastMsg.sender === 'user' || prevLastMsg.text !== lastMsg.text) {
                  isGenerating = true;
                  lastChangeTimeRef.current[cardId] = Date.now();
                } else {
                  if (isGenerating && Date.now() - (lastChangeTimeRef.current[cardId] || 0) > 3000) {
                    isGenerating = false;
                  }
                }
              }
            } else {
              isGenerating = false;
            }

            isGeneratingRef.current[cardId] = isGenerating;

            const moduleState = modulesRef.current[cardId];
            const isHistoryLoading = moduleState?.isHistoryLoading;
            const pendingActiveIndex = moduleState?.pendingActiveIndex;

            if (isHistoryLoading) {
              const prevMsgs = prevMessagesRef.current[cardId] || [];
              const isSame = JSON.stringify(validMsgs) === JSON.stringify(prevMsgs);

              const isStillShowingOldMsgs = isSame && validMsgs.length > 0;
              const isWaitingForHistoryItem =
                pendingActiveIndex !== null && pendingActiveIndex !== undefined && validMsgs.length === 0;

              if (isStillShowingOldMsgs || isWaitingForHistoryItem) {
                const currentIgnoreCount = (ignoreCounterRef.current[cardId] || 0) + 1;
                ignoreCounterRef.current[cardId] = currentIgnoreCount;

                if (currentIgnoreCount < 6) {
                  // Ignore scrape: webview is still loading the new thread messages
                  return;
                }
              }
            }

            ignoreCounterRef.current[cardId] = 0;

            const updates: Partial<ChatBridgeModuleState> = {
              messages: validMsgs,
              isGenerating,
              isHistoryLoading: false,
              pendingActiveIndex: null,
            };

            prevMessagesRef.current[cardId] = validMsgs;

            dispatch(
              chatBridgeActions.setModuleState({
                cardId,
                updates,
              }),
            );
          }
        } catch (err) {
          console.error(`Failed to scrape background page for ${cardId}:`, err);
        }
      };

      const runScrapeHistory = async () => {
        if (!selectors.chatItem) return;
        const script = resolveOnlineScript('scrapeHistory', card);
        try {
          const res = await browserIpc.invoke.executeJavaScript(viewId, script);
          if (Array.isArray(res)) {
            const history = res.map((item: any) => ({
              index: Number(item.index),
              title: String(item.title || 'Untitled Chat')
                .replace(/\n+/g, ' ')
                .trim(),
              active: Boolean(item.active),
            }));

            dispatch(chatBridgeActions.setModuleChatHistory({cardId, chatHistory: history}));
          }
        } catch (err) {
          console.error(`Failed to scrape chat history for ${cardId}:`, err);
        }
      };

      // Run immediately
      runScrapeMessages();
      runScrapeHistory();

      // Start new intervals
      const msgTimer = setInterval(runScrapeMessages, msgIntervalTime);
      const histTimer = setInterval(runScrapeHistory, histIntervalTime);

      activeIntervals.current[cardId] = [msgTimer, histTimer];
    });

    // B. Cleanup browser views no longer in target
    loadedViews.current.forEach(cardId => {
      if (!targetCardIds.has(cardId)) {
        // Clear intervals
        if (activeIntervals.current[cardId]) {
          activeIntervals.current[cardId].forEach(clearInterval);
          delete activeIntervals.current[cardId];
        }
        delete lastChangeTimeRef.current[cardId];
        delete isGeneratingRef.current[cardId];
        delete prevMessagesRef.current[cardId];

        // Tear down browser view
        const viewId = `online-bg-${cardId}`;
        browserIpc.send.removeBrowser(viewId);
        loadedViews.current.delete(cardId);
      }
    });
  }, [bgChatEnabledCards, activeAiId, onlineCards, dispatch]);

  // 3. Monitor loading state of background pages
  useEffect(() => {
    const offLoading = browserIpc.on.loading((id, isLoading) => {
      if (id.startsWith('online-bg-') && !isLoading) {
        const cardId = id.replace('online-bg-', '');
        dispatch(chatBridgeActions.setModulePageLoaded({cardId, isPageLoaded: true}));
      }
    });

    const offDomReady = browserIpc.on.domReady((id, isReady) => {
      if (id.startsWith('online-bg-') && isReady) {
        const cardId = id.replace('online-bg-', '');
        dispatch(chatBridgeActions.setModulePageLoaded({cardId, isPageLoaded: true}));
      }
    });

    const offActiveWindowChange = browserIpc.on.activeWindowChanged((id, activeWindow) => {
      if (id.startsWith('online-bg-')) {
        const cardId = id.replace('online-bg-', '');
        dispatch(
          chatBridgeActions.setModuleState({
            cardId,
            updates: {activeWindow},
          }),
        );
      }
    });

    return () => {
      offLoading();
      offDomReady();
      offActiveWindowChange();
    };
  }, [dispatch]);

  // Clean up all on unmount
  useEffect(() => {
    return () => {
      Object.keys(activeIntervals.current).forEach(cardId => {
        activeIntervals.current[cardId].forEach(clearInterval);
      });
      loadedViews.current.forEach(cardId => {
        browserIpc.send.removeBrowser(`online-bg-${cardId}`);
      });
    };
  }, []);
}
