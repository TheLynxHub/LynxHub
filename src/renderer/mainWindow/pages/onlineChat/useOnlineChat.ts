import {useAllCardDataWithPath} from '@lynx/plugins/modules';
import browserIpc from '@lynx_shared/ipc/browser';
import filesIpc from '@lynx_shared/ipc/files';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {topToast} from '../../layouts/ToastProviders';
import {onlineChatActions, useOnlineChatSelector} from '../../redux/reducers/onlineChat';
import {tabsActions, useTabsState} from '../../redux/reducers/tabs';
import {AppDispatch} from '../../redux/store';

export type ChatStep = 'select_module' | 'login' | 'chat';

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, block => block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/([*_])(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-\*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatChatToMarkdown(messages: Message[], cardTitle: string): string {
  const header = `# Chat with ${cardTitle}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : cardTitle || 'Assistant';
      return `**${sender}**:\n${msg.text}`;
    })
    .join('\n\n---\n\n');
  return header + body;
}

function formatChatToPlainText(messages: Message[], cardTitle: string): string {
  const header = `Chat with ${cardTitle}\n\n`;
  const body = messages
    .map(msg => {
      const sender = msg.sender === 'user' ? 'User' : cardTitle || 'Assistant';
      const plainText = markdownToPlainText(msg.text);
      return `${sender}:\n${plainText}`;
    })
    .join('\n\n' + '-'.repeat(50) + '\n\n');
  return header + body;
}

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

export function useOnlineChat(tabID = 'online-chat') {
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();
  const allCards = useAllCardDataWithPath();

  const bgChatEnabledCards = useOnlineChatSelector(state => state.bgChatEnabledCards);
  const activeUniversalCardId = useOnlineChatSelector(state => state.activeUniversalCardId);
  const visibleModuleIds = useOnlineChatSelector(state => state.visibleModuleIds);
  const modules = useOnlineChatSelector(state => state.modules);

  const onlineCards = useMemo(() => {
    const list = allCards.filter(card => card.isOnline && card.id !== 'universal');
    if (list.length > 0) {
      return [universalCard, ...list];
    }
    return list;
  }, [allCards]);

  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [step, setStep] = useState<ChatStep>('select_module');

  const currentCardId = selectedCard?.id === 'universal' ? activeUniversalCardId : selectedCard?.id;
  const currentModule = currentCardId ? modules[currentCardId] : null;

  const messages = currentModule?.messages || [];
  const isGenerating = currentModule?.isGenerating || false;
  const isPageLoaded = currentModule?.isPageLoaded || false;
  const isHistoryLoading = currentModule?.isHistoryLoading || false;
  const isSending = currentModule?.isSending || false;

  // Reconcile unified sidebar history
  const unifiedHistory = useMemo(() => {
    if (!selectedCard) return [];

    if (selectedCard.id !== 'universal') {
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
            active: item.active && activeUniversalCardId === cardId,
          });
        });
      }
    });
    return merged;
  }, [selectedCard, currentModule, modules, visibleModuleIds, activeUniversalCardId]);

  // Handle visibility transitions
  useEffect(() => {
    if (!currentCardId || currentCardId === 'universal') return;

    const viewId = `online-bg-${currentCardId}`;
    const isTabFocused = activeTab === tabID;

    if (isTabFocused) {
      if (step === 'login') {
        browserIpc.send.setVisible(viewId, true);
      } else if (step === 'chat') {
        browserIpc.send.setVisible(viewId, false, 'offscreen');
      } else {
        browserIpc.send.setVisible(viewId, false, 'detach');
      }
    } else {
      const isBgEnabled = bgChatEnabledCards.includes(currentCardId);
      browserIpc.send.setVisible(viewId, false, isBgEnabled ? 'offscreen' : 'detach');
    }

    return () => {
      const isBgEnabled = bgChatEnabledCards.includes(currentCardId);
      browserIpc.send.setVisible(viewId, false, isBgEnabled ? 'offscreen' : 'detach');
    };
  }, [tabID, activeTab, step, currentCardId, bgChatEnabledCards]);

  const handleSelectCard = useCallback(
    (card: any) => {
      setSelectedCard(card);
      if (card.id === 'universal') {
        setStep('chat');

        // Auto-enable all online AI cards for background scraping when entering Universal Chat
        const allOnlineIds = onlineCards.filter(c => c.id !== 'universal').map(c => c.id);
        if (bgChatEnabledCards.length === 0 && allOnlineIds.length > 0) {
          dispatch(onlineChatActions.setBgChatEnabledCards(allOnlineIds));
          dispatch(onlineChatActions.setVisibleModuleIds(allOnlineIds));
          storageIpc.update('plugin', {bgChatEnabledCards: allOnlineIds});
          dispatch(onlineChatActions.setActiveUniversalCardId(allOnlineIds[0]));
        } else if (bgChatEnabledCards.length > 0) {
          dispatch(onlineChatActions.setActiveUniversalCardId(bgChatEnabledCards[0]));
        } else {
          dispatch(onlineChatActions.setActiveUniversalCardId(null));
        }

        dispatch(
          tabsActions.setTabFavIcon({
            tabID,
            show: false,
            url: '',
          }),
        );
      } else {
        setStep('login');
        dispatch(onlineChatActions.setActiveUniversalCardId(card.id));

        dispatch(
          tabsActions.setTabFavIcon({
            tabID,
            show: !!(card.logoUrl || card.iconUrl),
            url: card.logoUrl || card.iconUrl || '',
          }),
        );
      }
    },
    [tabID, dispatch, bgChatEnabledCards, onlineCards],
  );

  // Auto-select card if tab ID contains a card identifier
  useEffect(() => {
    if (tabID.startsWith('online-chat-')) {
      const cardId = tabID.replace('online-chat-', '');
      const foundCard = onlineCards.find(c => c.id === cardId);
      if (foundCard && (!selectedCard || selectedCard.id !== cardId)) {
        handleSelectCard(foundCard);
      }
    }
  }, [tabID, onlineCards, selectedCard, handleSelectCard]);

  const handleBackToSelect = useCallback(() => {
    setSelectedCard(null);
    setStep('select_module');
    dispatch(onlineChatActions.setActiveUniversalCardId(null));

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
    let targetTitle = 'Online Chat';

    if (step === 'login') {
      targetTitle = selectedCard?.title || 'Online Chat';
    } else if (step === 'chat') {
      const activeItem = unifiedHistory.find(item => item.active);
      if (activeItem && activeItem.title) {
        targetTitle = activeItem.title;
      } else {
        targetTitle = selectedCard?.id === 'universal' ? 'Universal Chat' : selectedCard?.title || 'Online Chat';
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
        onlineChatActions.setModuleState({
          cardId: targetCardId,
          updates: {isHistoryLoading: true, messages: [], pendingActiveIndex: index},
        }),
      );
      dispatch(onlineChatActions.setActiveUniversalCardId(targetCardId));

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
    dispatch(onlineChatActions.setModulePageLoaded({cardId: currentCardId, isPageLoaded: false}));
    browserIpc.send.reload(`online-bg-${currentCardId}`);
  }, [currentCardId, dispatch]);

  const handleSendMessage = useCallback(
    async (messageText: string) => {
      if (!messageText.trim() || isSending || !currentCardId) return;

      const card = onlineCards.find(c => c.id === currentCardId);
      if (!card || !card.onlineConfig) return;

      const viewId = `online-bg-${currentCardId}`;
      dispatch(onlineChatActions.setModuleSending({cardId: currentCardId, isSending: true}));
      dispatch(onlineChatActions.setModuleGenerating({cardId: currentCardId, isGenerating: true}));

      // Optimistically add locally
      dispatch(
        onlineChatActions.setModuleMessages({
          cardId: currentCardId,
          messages: [...messages, {sender: 'user', text: messageText}],
        }),
      );

      const {selectors} = card.onlineConfig;
      const escapedMessage = messageText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

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
        console.error('Failed to send message:', err);
      } finally {
        dispatch(onlineChatActions.setModuleSending({cardId: currentCardId, isSending: false}));
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
      if (!card || !card.onlineConfig || !card.onlineConfig.newChat) return;

      const viewId = `online-bg-${targetCardId}`;
      const {newChat, url} = card.onlineConfig;

      dispatch(
        onlineChatActions.setModuleState({
          cardId: targetCardId,
          updates: {
            messages: [],
            isGenerating: false,
            isHistoryLoading: true,
            pendingActiveIndex: null,
          },
        }),
      );

      if (selectedCard?.id === 'universal') {
        dispatch(onlineChatActions.setActiveUniversalCardId(targetCardId));
      }

      if (newChat.action === 'click') {
        const script = `
          (() => {
            const selectors = ${JSON.stringify(newChat.value.split(',').map(s => s.trim()))};
            for (const selector of selectors) {
              const btn = document.querySelector(selector);
              if (btn) {
                btn.click();
                return true;
              }
            }
            return false;
          })()
        `;
        try {
          const clicked = await browserIpc.invoke.executeJavaScript(viewId, script);
          if (!clicked) {
            console.warn('New chat button not found, falling back to page reload/navigation:', newChat.value);
            dispatch(onlineChatActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
            browserIpc.send.loadURL(viewId, url);
          }
        } catch (err) {
          console.error('Failed to click new chat button, falling back:', err);
          dispatch(onlineChatActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
          browserIpc.send.loadURL(viewId, url);
        }
      } else if (newChat.action === 'navigate') {
        dispatch(onlineChatActions.setModulePageLoaded({cardId: targetCardId, isPageLoaded: false}));
        browserIpc.send.loadURL(viewId, newChat.value);
      }
    },
    [currentCardId, onlineCards, dispatch],
  );

  const toggleBgChat = useCallback(
    async (cardId: string) => {
      const enabled = bgChatEnabledCards.includes(cardId);
      const updated = enabled ? bgChatEnabledCards.filter(id => id !== cardId) : [...bgChatEnabledCards, cardId];
      dispatch(onlineChatActions.setBgChatEnabledCards(updated));

      // Update filters initially to include it when enabling
      if (!enabled) {
        dispatch(onlineChatActions.setVisibleModuleIds([...visibleModuleIds, cardId]));
      } else {
        dispatch(onlineChatActions.setVisibleModuleIds(visibleModuleIds.filter(id => id !== cardId)));
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
    // Background Scraper settings/state properties
    activeUniversalCardId,
    setActiveUniversalCardId: (id: string | null) => dispatch(onlineChatActions.setActiveUniversalCardId(id)),
    bgChatEnabledCards,
    visibleModuleIds,
    toggleBgChat,
    setVisibleModuleIds: (ids: string[]) => dispatch(onlineChatActions.setVisibleModuleIds(ids)),
  };
}
