import {PageID} from '@lynx_common/consts';
import browserIpc from '@lynx_shared/ipc/browser';
import floatChatIpc from '@lynx_shared/ipc/floatChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {useAllCardDataWithPath} from '../plugins/modules';
import {chatBridgeActions} from '../redux/reducers/chatBridge';
import {tabsActions} from '../redux/reducers/tabs';
import {AppDispatch, RootState} from '../redux/store';
import {resolveOnlineScript} from '../utils/onlineChatScripts';

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

export function useFloatChatSync() {
  const dispatch = useDispatch<AppDispatch>();
  const allCards = useAllCardDataWithPath();
  const chatBridge = useSelector((state: RootState) => state.chatBridge);
  const bgChatEnabledCards = chatBridge.bgChatEnabledCards || [];
  const disableFloatChat = useSelector((state: RootState) => state.settings.disableFloatChat);

  const onlineCards = useMemo(() => {
    const list = allCards.filter(card => card.isOnline && card.id !== 'unified');
    if (list.length > 0) {
      return [unifiedCard, ...list];
    }
    return list;
  }, [allCards]);

  // 1. Sync onlineCards list to float window
  useEffect(() => {
    if (disableFloatChat) return;
    if (onlineCards.length > 0) {
      floatChatIpc.setOnlineCards(onlineCards);
    }
  }, [onlineCards, disableFloatChat]);

  // 2. Sync chatBridge state to float window
  useEffect(() => {
    if (disableFloatChat) return;
    floatChatIpc.syncState(chatBridge);
  }, [chatBridge, disableFloatChat]);

  // Helper to ensure background view is running for a module
  const handleEnsureBgChatEnabled = useCallback(
    (cardId: string) => {
      if (!bgChatEnabledCards.includes(cardId)) {
        const updated = [...bgChatEnabledCards, cardId];
        dispatch(chatBridgeActions.setBgChatEnabledCards(updated));
        dispatch(chatBridgeActions.setVisibleModuleIds(updated));
        storageIpc.update('plugin', {bgChatEnabledCards: updated});
      }
    },
    [bgChatEnabledCards, dispatch],
  );

  // 3. Listen to commands from float window
  useEffect(() => {
    if (disableFloatChat) return;

    // A. Send Message
    const offSendMessage = floatChatIpc.onSendMessage(async (cardId, text) => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${cardId}`;
      const moduleState = chatBridge.modules[cardId];
      const prevMessages = moduleState?.messages || [];

      // Optimistically add message
      dispatch(
        chatBridgeActions.setModuleMessages({
          cardId,
          messages: [...prevMessages, {sender: 'user', text}],
        }),
      );
      dispatch(chatBridgeActions.setModuleSending({cardId, isSending: true}));
      dispatch(chatBridgeActions.setModuleGenerating({cardId, isGenerating: true}));

      const script = resolveOnlineScript('sendMessage', card, {messageText: text});

      try {
        await browserIpc.invoke.executeJavaScript(viewId, script);
      } catch (err) {
        console.error('Failed to send message from Float Chat:', err);
      } finally {
        dispatch(chatBridgeActions.setModuleSending({cardId, isSending: false}));
      }
    });

    // B. Select Thread
    const offSelectThread = floatChatIpc.onSelectThread(async (cardId, index) => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;
      const {selectors} = card.onlineConfig;
      if (!selectors.chatItem) return;

      dispatch(chatBridgeActions.setActiveUnifiedCardId(cardId));
      dispatch(
        chatBridgeActions.setModuleState({
          cardId,
          updates: {isHistoryLoading: true, messages: [], pendingActiveIndex: index},
        }),
      );

      const script = resolveOnlineScript('selectThread', card, {index});

      try {
        await browserIpc.invoke.executeJavaScript(`online-bg-${cardId}`, script);
      } catch (err) {
        console.error('Failed to select chat history from Float Chat:', err);
      }
    });

    // C. New Chat
    const offNewChat = floatChatIpc.onNewChat(async cardId => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${cardId}`;
      const {newChat} = card.onlineConfig;

      dispatch(chatBridgeActions.setActiveUnifiedCardId(cardId));
      dispatch(
        chatBridgeActions.setModuleState({
          cardId,
          updates: {messages: []},
        }),
      );

      const hasCustomNewChat = !!card.onlineConfig.scripts?.newChat;
      const isClickAction = newChat?.action === 'click';

      if (hasCustomNewChat || isClickAction) {
        const script = resolveOnlineScript('newChat', card);
        try {
          await browserIpc.invoke.executeJavaScript(viewId, script);
        } catch (err) {
          console.error('Failed to start new chat from Float Chat:', err);
        }
      } else if (newChat && newChat.action === 'navigate') {
        browserIpc.send.loadURL(viewId, newChat.value);
      }
    });

    // D. Open Login (Navigates main window tab and focuses it)
    const offOpenLogin = floatChatIpc.onOpenLogin(cardId => {
      const card = onlineCards.find(c => c.id === cardId);
      if (!card) return;

      dispatch(
        tabsActions.addTab({
          id: `chat-bridge-${cardId}`,
          title: card.title,
          pageID: PageID.chatBridge,
          isLoading: false,
          isTerminal: false,
          favIcon: {
            show: !!(card.iconUrl || card.logoUrl),
            url: card.iconUrl || card.logoUrl || '',
          },
        }),
      );
    });

    // E. Set Active Card
    const offSetActiveCard = floatChatIpc.onSetActiveCard(cardId => {
      if (cardId && cardId !== 'unified') {
        handleEnsureBgChatEnabled(cardId);
        dispatch(chatBridgeActions.setActiveUnifiedCardId(cardId));
      }
    });

    return () => {
      offSendMessage();
      offSelectThread();
      offNewChat();
      offOpenLogin();
      offSetActiveCard();
    };
  }, [onlineCards, chatBridge, handleEnsureBgChatEnabled, dispatch, disableFloatChat]);
}
