import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import browserIpc from '@lynx_shared/ipc/browser';
import filesIpc from '@lynx_shared/ipc/files';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../layouts/ToastProviders';
import {chatBridgeActions, useChatBridgeSelector} from '../../redux/reducers/chatBridge';
import {useSettingsState} from '../../redux/reducers/settings';
import {tabsActions, useTabsState} from '../../redux/reducers/tabs';
import {AppDispatch} from '../../redux/store';
import {resolveOnlineScript} from '../../utils/onlineChatScripts';
import {useChatBridgeVisibility} from './hooks/useChatBridgeVisibility';
import {formatChatToMarkdown, formatChatToPlainText} from './utils/chatBridgeUtils';

export type ChatStep = 'select_module' | 'login' | 'chat';

export {formatChatToMarkdown, formatChatToPlainText, markdownToPlainText, type Message} from './utils/chatBridgeUtils';

const unifiedCard: any = {
  id: 'unified',
  title: 'Unified Chat',
  description: 'Chat with all enabled background AIs in a unified interface, with aggregated thread history.',
  isOnline: true,
  logoUrl: '',
  onlineConfig: {
    url: '',
    selectors: {},
  },
};

export function useChatBridge(tabID = 'chat-bridge') {
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();
  const allCards = useAllCardDataWithPath();

  const bgChatEnabledCards = useChatBridgeSelector(state => state.bgChatEnabledCards);
  const activeUnifiedCardId = useChatBridgeSelector(state => state.activeUnifiedCardId);
  const visibleModuleIds = useChatBridgeSelector(state => state.visibleModuleIds);
  const modules = useChatBridgeSelector(state => state.modules);

  const onlineCards = useMemo(() => {
    const list = allCards.filter(card => card.isOnline && card.id !== 'unified');
    if (list.length > 0) {
      return [unifiedCard, ...list];
    }
    return list;
  }, [allCards]);

  const bridgeDefaultView = useSettingsState('bridgeDefaultView') || 'custom';

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [step, setStep] = useState<ChatStep>('select_module');

  const currentCardId = selectedCard?.id === 'unified' ? activeUnifiedCardId : selectedCard?.id;
  const currentModule = currentCardId ? modules[currentCardId] : null;

  const messages = currentModule?.messages || [];
  const isGenerating = currentModule?.isGenerating || false;
  const isPageLoaded = currentModule?.isPageLoaded || false;
  const isHistoryLoading = currentModule?.isHistoryLoading || false;
  const isSending = currentModule?.isSending || false;
  const activeWindow = currentModule?.activeWindow || null;

  // Reconcile unified sidebar history
  const unifiedHistory = useMemo(() => {
    if (!selectedCard) return [];

    if (selectedCard.id !== 'unified') {
      const hist = currentModule?.chatHistory || [];
      return hist.map(item => ({
        ...item,
        cardId: selectedCard.id,
      }));
    }

    const merged: any[] = [];
    visibleModuleIds.forEach(cardId => {
      const mod = modules[cardId];
      if (mod && mod.chatHistory) {
        mod.chatHistory.forEach(item => {
          merged.push({
            ...item,
            cardId,
            active: item.active && activeUnifiedCardId === cardId,
          });
        });
      }
    });
    return merged;
  }, [selectedCard, currentModule, modules, visibleModuleIds, activeUnifiedCardId]);

  // Hook for WebContentsView IPC visibility management
  useChatBridgeVisibility({
    tabID,
    activeTab,
    step,
    currentCardId,
    bgChatEnabledCards,
    activeWindow,
  });

  const handleSelectCard = useCallback(
    (card: any) => {
      setSelectedCard(card);
      if (card.id === 'unified') {
        setStep('chat');

        // Auto-enable all online AI cards for background scraping when entering Unified Chat
        const allOnlineIds = onlineCards.filter(c => c.id !== 'unified').map(c => c.id);
        if (bgChatEnabledCards.length === 0 && allOnlineIds.length > 0) {
          dispatch(chatBridgeActions.setBgChatEnabledCards(allOnlineIds));
          dispatch(chatBridgeActions.setVisibleModuleIds(allOnlineIds));
          storageIpc.update('plugin', {bgChatEnabledCards: allOnlineIds});
          dispatch(chatBridgeActions.setActiveUnifiedCardId(allOnlineIds[0]));
        } else if (bgChatEnabledCards.length > 0) {
          dispatch(chatBridgeActions.setActiveUnifiedCardId(bgChatEnabledCards[0]));
        } else {
          dispatch(chatBridgeActions.setActiveUnifiedCardId(null));
        }

        dispatch(
          tabsActions.setTabFavIcon({
            tabID,
            show: false,
            url: '',
          }),
        );
      } else {
        setStep(bridgeDefaultView === 'custom' ? 'chat' : 'login');
        dispatch(chatBridgeActions.setActiveUnifiedCardId(card.id));

        dispatch(
          tabsActions.setTabFavIcon({
            tabID,
            show: !!(card.logoUrl || card.iconUrl),
            url: card.logoUrl || card.iconUrl || '',
          }),
        );
      }
    },
    [tabID, dispatch, bgChatEnabledCards, onlineCards, bridgeDefaultView],
  );

  // Auto-select card if tab ID contains a card identifier
  useEffect(() => {
    if (tabID.startsWith('chat-bridge-')) {
      const cardId = tabID.replace('chat-bridge-', '');
      const foundCard = onlineCards.find(c => c.id === cardId);
      if (foundCard && (!selectedCard || selectedCard.id !== cardId)) {
        handleSelectCard(foundCard);
      }
    }
  }, [tabID, onlineCards, selectedCard, handleSelectCard]);

  const handleBackToSelect = useCallback(() => {
    setSelectedCard(null);
    setStep('select_module');
    dispatch(chatBridgeActions.setActiveUnifiedCardId(null));

    dispatch(
      tabsActions.setTabFavIcon({
        tabID,
        show: false,
        url: '',
      }),
    );
  }, [tabID, dispatch]);

  // Synchronize tab title with active chat title or fallbacks
  const tabs = useTabsState('tabs');
  const currentTab = useMemo(() => tabs.find(t => t.id === tabID), [tabs, tabID]);
  const currentTabTitle = currentTab?.title;

  useEffect(() => {
    let targetTitle = 'Chat Bridge';

    if (step === 'login') {
      targetTitle = selectedCard?.title || 'Chat Bridge';
    } else if (step === 'chat') {
      const activeItem = unifiedHistory.find(item => item.active);
      if (activeItem && activeItem.title) {
        targetTitle = activeItem.title;
      } else {
        targetTitle = selectedCard?.id === 'unified' ? 'Unified Chat' : selectedCard?.title || 'Chat Bridge';
      }
    }

    if (targetTitle && targetTitle !== currentTabTitle) {
      dispatch(tabsActions.setTabTitle({tabID, title: targetTitle}));
    }
  }, [tabID, step, selectedCard, unifiedHistory, currentTabTitle, dispatch]);

  const handleSelectHistoryItem = useCallback(
    async (index: number, cardId?: string) => {
      const targetCardId = cardId || currentCardId;
      if (!targetCardId) return;

      const card = onlineCards.find(c => c.id === targetCardId);
      if (!card || !card.onlineConfig) return;
      const {selectors} = card.onlineConfig;
      if (!selectors.chatItem) return;

      const viewId = `online-bg-${targetCardId}`;
      dispatch(
        chatBridgeActions.setModuleState({
          cardId: targetCardId,
          updates: {isHistoryLoading: true, messages: [], pendingActiveIndex: index},
        }),
      );
      dispatch(chatBridgeActions.setActiveUnifiedCardId(targetCardId));

      const script = resolveOnlineScript('selectThread', card, {index});

      try {
        await browserIpc.invoke.executeJavaScript(viewId, script);
      } catch (err) {
        console.error('Failed to select chat history item:', err);
      }
    },
    [onlineCards, currentCardId, dispatch],
  );

  const handleGoToChat = useCallback(() => {
    if (!currentCardId) return;
    browserIpc.send.setVisible(`online-bg-${currentCardId}`, false, 'offscreen');
    setStep('chat');
  }, [currentCardId]);

  const handleShowWebpage = useCallback(() => {
    if (!currentCardId) return;
    setStep('login');
    browserIpc.send.setVisible(`online-bg-${currentCardId}`, true);
  }, [currentCardId]);

  const handleRefresh = useCallback(() => {
    if (!currentCardId) return;
    dispatch(chatBridgeActions.setModulePageLoaded({cardId: currentCardId, isPageLoaded: false}));
    browserIpc.send.reload(`online-bg-${currentCardId}`);
  }, [currentCardId, dispatch]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isSending || !currentCardId) return;

      const card = onlineCards.find(c => c.id === currentCardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${currentCardId}`;
      dispatch(chatBridgeActions.setModuleSending({cardId: currentCardId, isSending: true}));
      dispatch(chatBridgeActions.setModuleGenerating({cardId: currentCardId, isGenerating: true}));

      // Optimistically add locally
      dispatch(
        chatBridgeActions.setModuleMessages({
          cardId: currentCardId,
          messages: [...messages, {sender: 'user', text: messageText}],
        }),
      );

      const script = resolveOnlineScript('sendMessage', card, {messageText});

      try {
        await browserIpc.invoke.executeJavaScript(viewId, script);
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        dispatch(chatBridgeActions.setModuleSending({cardId: currentCardId, isSending: false}));
      }
    },
    [isSending, currentCardId, onlineCards, messages, dispatch],
  );

  const handleCopyToClipboard = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, selectedCard?.title)
          : formatChatToPlainText(messages, selectedCard?.title);
      try {
        await navigator.clipboard.writeText(formatted);
        topToast.success(`Copied chat as ${format}`, {timeout: 1500});
      } catch (err) {
        console.error('Failed to copy chat:', err);
        topToast.danger('Failed to copy chat', {timeout: 2000});
      }
    },
    [messages, selectedCard],
  );

  const handleSaveToFile = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, selectedCard?.title)
          : formatChatToPlainText(messages, selectedCard?.title);

      const dateStr = new Date().toISOString().slice(0, 10);
      const cardName = selectedCard?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'chat';
      const defaultFilename = `chat-${cardName}-${dateStr}.${format === 'markdown' ? 'md' : 'txt'}`;

      try {
        const result = await filesIpc.saveToFile(formatted, defaultFilename);
        if (result) {
          topToast.success('Saved chat successfully', {timeout: 1500});
        }
      } catch (err) {
        console.error('Failed to save chat:', err);
        topToast.danger('Failed to save chat', {timeout: 2000});
      }
    },
    [messages, selectedCard],
  );

  const handleNewChat = useCallback(
    async (cardId?: string) => {
      const targetCardId = cardId || currentCardId;
      if (!targetCardId) return;

      const card = onlineCards.find(c => c.id === targetCardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${targetCardId}`;
      const {newChat, url} = card.onlineConfig;

      dispatch(
        chatBridgeActions.setModuleState({
          cardId: targetCardId,
          updates: {
            messages: [],
            isGenerating: false,
            isHistoryLoading: true,
            pendingActiveIndex: null,
          },
        }),
      );

      if (selectedCard?.id === 'unified') {
        dispatch(chatBridgeActions.setActiveUnifiedCardId(targetCardId));
      }

      const hasCustomNewChat = !!card.onlineConfig.scripts?.newChat;
      const isClickAction = newChat?.action === 'click';

      if (hasCustomNewChat || isClickAction) {
        const script = resolveOnlineScript('newChat', card);
        try {
          const clicked = await browserIpc.invoke.executeJavaScript(viewId, script);
          if (!clicked && !hasCustomNewChat && newChat) {
            console.warn('New chat button not found, falling back to page reload/navigation:', newChat.value);
            dispatch(chatBridgeActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
            browserIpc.send.loadURL(viewId, url);
          }
        } catch (err) {
          console.error('Failed to click new chat button, falling back:', err);
          if (!hasCustomNewChat && newChat) {
            dispatch(chatBridgeActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
            browserIpc.send.loadURL(viewId, url);
          }
        }
      } else if (newChat && newChat.action === 'navigate') {
        dispatch(chatBridgeActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
        browserIpc.send.loadURL(viewId, newChat.value);
      }
    },
    [currentCardId, onlineCards, dispatch, selectedCard],
  );

  const toggleBgChat = useCallback(
    async (cardId: string) => {
      const enabled = bgChatEnabledCards.includes(cardId);
      const updated = enabled ? bgChatEnabledCards.filter(id => id !== cardId) : [...bgChatEnabledCards, cardId];
      dispatch(chatBridgeActions.setBgChatEnabledCards(updated));

      // Update filters initially to include it when enabling
      if (!enabled) {
        dispatch(chatBridgeActions.setVisibleModuleIds([...visibleModuleIds, cardId]));
      } else {
        dispatch(chatBridgeActions.setVisibleModuleIds(visibleModuleIds.filter(id => id !== cardId)));
      }

      await storageIpc.update('plugin', {bgChatEnabledCards: updated});
    },
    [bgChatEnabledCards, visibleModuleIds, dispatch],
  );

  return {
    selectedCard,
    step,
    messages,
    isSending,
    isPageLoaded,
    isGenerating,
    onlineCards,
    chatHistory: unifiedHistory,
    isHistoryLoading,
    handleSelectCard,
    handleSelectHistoryItem,
    handleBackToSelect,
    handleGoToChat,
    handleShowWebpage,
    handleRefresh,
    handleSendMessage,
    handleCopyToClipboard,
    handleSaveToFile,
    handleNewChat,
    activeWindow,
    // Background Scraper settings/state properties
    activeUnifiedCardId,
    setActiveUnifiedCardId: (id: string | null) => dispatch(chatBridgeActions.setActiveUnifiedCardId(id)),
    bgChatEnabledCards,
    visibleModuleIds,
    toggleBgChat,
    setVisibleModuleIds: (ids: string[]) => dispatch(chatBridgeActions.setVisibleModuleIds(ids)),
  };
}
