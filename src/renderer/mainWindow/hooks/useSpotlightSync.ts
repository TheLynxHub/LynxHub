import {PageID} from '@lynx_common/consts';
import browserIpc from '@lynx_shared/ipc/browser';
import spotlightChatIpc from '@lynx_shared/ipc/spotlightChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {useAllCardDataWithPath} from '../plugins/modules';
import {onlineChatActions} from '../redux/reducers/onlineChat';
import {tabsActions} from '../redux/reducers/tabs';
import {AppDispatch, RootState} from '../redux/store';
import {resolveOnlineScript} from '../utils/onlineChatScripts';

const universalCard: any = {
  id: 'universal',
  title: 'Universal Chat',
  description: 'Chat with all enabled background AIs in a unified interface, with aggregated thread history.',
  isOnline: true,
  logoUrl: '',
  onlineConfig: {
    url: '',
    selectors: {},
  },
};

export function useSpotlightSync() {
  const dispatch = useDispatch<AppDispatch>();
  const allCards = useAllCardDataWithPath();
  const onlineChat = useSelector((state: RootState) => state.onlineChat);
  const bgChatEnabledCards = onlineChat.bgChatEnabledCards || [];
  const disableSpotlight = useSelector((state: RootState) => state.settings.disableSpotlight);

  const onlineCards = useMemo(() => {
    const list = allCards.filter(card => card.isOnline && card.id !== 'universal');
    if (list.length > 0) {
      return [universalCard, ...list];
    }
    return list;
  }, [allCards]);

  // 1. Sync onlineCards list to spotlight window
  useEffect(() => {
    if (disableSpotlight) return;
    console.log('useSpotlightSync: syncing onlineCards, count:', onlineCards.length, onlineCards);
    if (onlineCards.length > 0) {
      spotlightChatIpc.setOnlineCards(onlineCards);
    }
  }, [onlineCards, disableSpotlight]);

  // 2. Sync onlineChat state to spotlight window
  useEffect(() => {
    if (disableSpotlight) return;
    spotlightChatIpc.syncState(onlineChat);
  }, [onlineChat, disableSpotlight]);

  // Helper to ensure background view is running for a module
  const handleEnsureBgChatEnabled = useCallback(
    (cardId: string) => {
      if (!bgChatEnabledCards.includes(cardId)) {
        const updated = [...bgChatEnabledCards, cardId];
        dispatch(onlineChatActions.setBgChatEnabledCards(updated));
        dispatch(onlineChatActions.setVisibleModuleIds(updated));
        storageIpc.update('plugin', {bgChatEnabledCards: updated});
      }
    },
    [bgChatEnabledCards, dispatch],
  );

  // 3. Listen to commands from spotlight
  useEffect(() => {
    if (disableSpotlight) return;

    // A. Send Message
    const offSendMessage = spotlightChatIpc.onSendMessage(async (cardId, text) => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${cardId}`;
      const moduleState = onlineChat.modules[cardId];
      const prevMessages = moduleState?.messages || [];

      // Optimistically add message
      dispatch(
        onlineChatActions.setModuleMessages({
          cardId,
          messages: [...prevMessages, {sender: 'user', text}],
        }),
      );
      dispatch(onlineChatActions.setModuleSending({cardId, isSending: true}));
      dispatch(onlineChatActions.setModuleGenerating({cardId, isGenerating: true}));

      const script = resolveOnlineScript('sendMessage', card, {messageText: text});

      try {
        await browserIpc.invoke.executeJavaScript(viewId, script);
      } catch (err) {
        console.error('Failed to send message from Spotlight:', err);
      } finally {
        dispatch(onlineChatActions.setModuleSending({cardId, isSending: false}));
      }
    });

    // B. Select Thread
    const offSelectThread = spotlightChatIpc.onSelectThread(async (cardId, index) => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;
      const {selectors} = card.onlineConfig;
      if (!selectors.chatItem) return;

      dispatch(onlineChatActions.setActiveUniversalCardId(cardId));
      dispatch(
        onlineChatActions.setModuleState({
          cardId,
          updates: {isHistoryLoading: true, messages: [], pendingActiveIndex: index},
        }),
      );

      const script = resolveOnlineScript('selectThread', card, {index});

      try {
        await browserIpc.invoke.executeJavaScript(`online-bg-${cardId}`, script);
      } catch (err) {
        console.error('Failed to select chat history from Spotlight:', err);
      }
    });

    // C. New Chat
    const offNewChat = spotlightChatIpc.onNewChat(async cardId => {
      handleEnsureBgChatEnabled(cardId);

      const card = onlineCards.find(c => c.id === cardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${cardId}`;
      const {newChat} = card.onlineConfig;

      dispatch(onlineChatActions.setActiveUniversalCardId(cardId));
      dispatch(
        onlineChatActions.setModuleState({
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
          console.error('Failed to start new chat from Spotlight:', err);
        }
      } else if (newChat && newChat.action === 'navigate') {
        browserIpc.send.loadURL(viewId, newChat.value);
      }
    });

    // D. Open Login (Navigates main window tab and focuses it)
    const offOpenLogin = spotlightChatIpc.onOpenLogin(cardId => {
      const card = onlineCards.find(c => c.id === cardId);
      if (!card) return;

      dispatch(
        tabsActions.addTab({
          id: `online-chat-${cardId}`,
          title: card.title,
          pageID: PageID.onlineChat,
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
    const offSetActiveCard = spotlightChatIpc.onSetActiveCard(cardId => {
      if (cardId && cardId !== 'universal') {
        handleEnsureBgChatEnabled(cardId);
        dispatch(onlineChatActions.setActiveUniversalCardId(cardId));
      }
    });

    return () => {
      offSendMessage();
      offSelectThread();
      offNewChat();
      offOpenLogin();
      offSetActiveCard();
    };
  }, [onlineCards, onlineChat, handleEnsureBgChatEnabled, dispatch, disableSpotlight]);
}
