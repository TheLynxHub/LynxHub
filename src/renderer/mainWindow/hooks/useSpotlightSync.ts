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

  const onlineCards = useMemo(() => {
    const list = allCards.filter(card => card.isOnline && card.id !== 'universal');
    if (list.length > 0) {
      return [universalCard, ...list];
    }
    return list;
  }, [allCards]);

  // 1. Sync onlineCards list to spotlight window
  useEffect(() => {
    console.log('useSpotlightSync: syncing onlineCards, count:', onlineCards.length, onlineCards);
    if (onlineCards.length > 0) {
      spotlightChatIpc.setOnlineCards(onlineCards);
    }
  }, [onlineCards]);

  // 2. Sync onlineChat state to spotlight window
  useEffect(() => {
    spotlightChatIpc.syncState(onlineChat);
  }, [onlineChat]);

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

      const {selectors} = card.onlineConfig;
      const escapedMessage = text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

      const script = `
        (() => {
          const inputSel = ${JSON.stringify(selectors.input)};
          const sendButtonSel = ${JSON.stringify(selectors.sendButton)};
          const inputEl = document.querySelector(inputSel);
          if (!inputEl) return false;
          
          inputEl.focus();
          
          if (inputEl.tagName === 'INPUT' || inputEl.tagName === 'TEXTAREA') {
            const valueSetter = Object.getOwnPropertyDescriptor(inputEl.constructor.prototype, 'value') ||
                                Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value') ||
                                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (valueSetter && valueSetter.set) {
              valueSetter.set.call(inputEl, \`\${${JSON.stringify(escapedMessage)}}\`);
            } else {
              inputEl.value = \`\${${JSON.stringify(escapedMessage)}}\`;
            }
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            try {
              inputEl.focus();
              document.execCommand('selectAll', false, null);
              document.execCommand('delete', false, null);
              document.execCommand('insertText', false, \`\${${JSON.stringify(escapedMessage)}}\`);
            } catch (e) {
              inputEl.innerHTML = \`\${${JSON.stringify(escapedMessage)}}\`;
            }
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
            inputEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          setTimeout(() => {
            const sendBtn = document.querySelector(sendButtonSel);
            if (sendBtn) {
              sendBtn.click();
            } else {
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              });
              inputEl.dispatchEvent(enterEvent);
            }
          }, 150);
          return true;
        })()
      `;

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

      const script = `
        (() => {
          const itemSel = ${JSON.stringify(selectors.chatItem)};
          const items = Array.from(document.querySelectorAll(itemSel));
          const item = items[${index}];
          if (item) {
            item.click();
            return true;
          }
          return false;
        })()
      `;

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
      if (!card || !card.onlineConfig || !card.onlineConfig.newChat) return;

      const viewId = `online-bg-${cardId}`;
      const {newChat} = card.onlineConfig;

      dispatch(onlineChatActions.setActiveUniversalCardId(cardId));
      dispatch(
        onlineChatActions.setModuleState({
          cardId,
          updates: {messages: []},
        }),
      );

      if (newChat.action === 'click') {
        const script = `
          (() => {
            const btn = document.querySelector(${JSON.stringify(newChat.value)});
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          })()
        `;
        try {
          await browserIpc.invoke.executeJavaScript(viewId, script);
        } catch (err) {
          console.error('Failed to start new chat from Spotlight:', err);
        }
      } else if (newChat.action === 'navigate') {
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
  }, [onlineCards, onlineChat, handleEnsureBgChatEnabled, dispatch]);
}
