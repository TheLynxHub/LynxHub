import {topToast} from '@lynx/layouts/ToastProviders';
import {formatChatToMarkdown, formatChatToPlainText} from '@lynx/pages/chatBridge/useChatBridge';
import browserIpc from '@lynx_shared/ipc/browser';
import filesIpc from '@lynx_shared/ipc/files';
import floatChatIpc from '@lynx_shared/ipc/floatChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

export function useFloatChat() {
  const [onlineCards, setOnlineCards] = useState<any[]>([]);
  const [activeCardId, setActiveCardId] = useState<string>('chatgpt');
  const [inputText, setInputText] = useState('');
  const [syncedState, setSyncedState] = useState<any>(null);
  const [step, setStep] = useState<'chat' | 'login'>('chat');
  const [hasSetInitialStep, setHasSetInitialStep] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef<number>(0);
  const isNearBottomRef = useRef<boolean>(true);

  const [chatBridgeMaxWidth, setChatBridgeMaxWidth] = useState<string>('default');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedThreads, setPinnedThreads] = useState<string[]>([]);
  const [collapsedProviders, setCollapsedProviders] = useState<Record<string, boolean>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Sync Theme & Settings
  useEffect(() => {
    storageIpc.get('app').then(app => {
      if (app) {
        if (app.darkMode) {
          const isDark =
            app.darkMode === 'dark' ||
            (app.darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.classList.toggle('dark', isDark);
          document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        }
        if (app.chatBridgeMaxWidth) {
          setChatBridgeMaxWidth(app.chatBridgeMaxWidth);
        }
        if (app.floatChatSidebarCollapsed !== undefined) {
          setIsSidebarCollapsed(app.floatChatSidebarCollapsed);
        }
        if (app.floatChatSidebarWidth !== undefined) {
          setSidebarWidth(app.floatChatSidebarWidth);
        }
        if (app.pinnedThreads !== undefined) {
          setPinnedThreads(app.pinnedThreads);
        }
        if (app.floatDefaultView) {
          setStep(app.floatDefaultView === 'webview' ? 'login' : 'chat');
          setHasSetInitialStep(true);
        } else {
          setHasSetInitialStep(true);
        }
      } else {
        setHasSetInitialStep(true);
      }
    });
  }, []);

  // Fetch initial caches & set up listeners
  useEffect(() => {
    floatChatIpc.getOnlineCards().then(cards => {
      if (cards && cards.length > 0) {
        setOnlineCards(cards);
        setActiveCardId(prev => {
          const next = cards.some(c => c.id === prev) ? prev : cards[0].id;
          floatChatIpc.setActiveCard(next);
          return next;
        });
      }
    });

    floatChatIpc.getCachedState().then(state => {
      if (state) setSyncedState(state);
    });

    const offCards = floatChatIpc.onSetOnlineCards(cards => {
      if (cards && cards.length > 0) {
        setOnlineCards(cards);
        setActiveCardId(prev => {
          const next = cards.some(c => c.id === prev) ? prev : cards[0].id;
          floatChatIpc.setActiveCard(next);
          return next;
        });
      }
    });

    const offState = floatChatIpc.onSyncState(state => {
      if (state) setSyncedState(state);
    });

    // Close on Escape pressed anywhere in window
    const handleGlobalKeyDown = (e: any) => {
      if (e.key === 'Escape') {
        floatChatIpc.closeFloatChat();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      offCards();
      offState();
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeCardId]);

  const activeCard = useMemo(() => {
    return onlineCards.find(c => c.id === activeCardId);
  }, [onlineCards, activeCardId]);

  const currentCardId = useMemo(() => {
    if (activeCardId !== 'unified') return activeCardId;
    if (syncedState?.activeUnifiedCardId) return syncedState.activeUnifiedCardId;
    const firstNonUnified = onlineCards.find(c => c.id !== 'unified');
    return firstNonUnified ? firstNonUnified.id : null;
  }, [activeCardId, syncedState?.activeUnifiedCardId, onlineCards]);

  const currentCard = useMemo(() => {
    return onlineCards.find(c => c.id === currentCardId);
  }, [onlineCards, currentCardId]);

  const moduleState = useMemo(() => {
    return currentCardId ? syncedState?.modules?.[currentCardId] : null;
  }, [syncedState, currentCardId]);

  const activeWindowRef = useRef<string | null | undefined>(moduleState?.activeWindow);
  useEffect(() => {
    activeWindowRef.current = moduleState?.activeWindow;
  }, [moduleState?.activeWindow]);

  const messages = useMemo(() => {
    return moduleState?.messages || [];
  }, [moduleState]);

  const chatHistory = useMemo(() => {
    if (activeCardId !== 'unified') {
      const hist = moduleState?.chatHistory || [];
      return hist.map((item: any) => ({
        ...item,
        cardId: activeCardId,
      }));
    }

    // Unified Mode - merge history from all background-enabled modules
    const merged: any[] = [];
    const visibleModuleIds = syncedState?.visibleModuleIds || [];
    const activeUnifiedCardId = syncedState?.activeUnifiedCardId || null;
    const modules = syncedState?.modules || {};

    visibleModuleIds.forEach((cardId: string) => {
      const mod = modules[cardId];
      if (mod && mod.chatHistory) {
        mod.chatHistory.forEach((item: any) => {
          merged.push({
            ...item,
            cardId,
            active: item.active && activeUnifiedCardId === cardId,
          });
        });
      }
    });
    return merged;
  }, [activeCardId, moduleState, syncedState]);

  const isGenerating = moduleState?.isGenerating || false;
  const isPageLoaded = moduleState?.isPageLoaded || false;
  const isHistoryLoading = moduleState?.isHistoryLoading || false;
  const isSending = moduleState?.isSending || false;

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      const {scrollTop, scrollHeight, clientHeight} = el;
      isNearBottomRef.current = scrollTop + clientHeight >= scrollHeight - 100;
    }
  }, []);

  // Monitor size changes to auto-scroll if user is already near bottom
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    });
    resizeObserver.observe(contentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Auto-scroll on new message added
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      scrollToBottom();
    }
    prevMessagesCount.current = messages.length;
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSending || isGenerating || !currentCardId) return;
    floatChatIpc.sendMessage(currentCardId, inputText);
    setInputText('');
  }, [inputText, currentCardId, isSending, isGenerating]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSelectThread = useCallback(
    (index: number, cardId?: string) => {
      const targetCardId = cardId || activeCardId;
      floatChatIpc.selectThread(targetCardId, index);
    },
    [activeCardId],
  );

  const handleNewChat = useCallback(
    (cardId?: string) => {
      const targetCardId = cardId || currentCardId;
      if (targetCardId) floatChatIpc.newChat(targetCardId);
    },
    [currentCardId],
  );

  const handleTogglePin = useCallback((cardId: string, title: string) => {
    const pinKey = `${cardId}::${title}`;
    setPinnedThreads(prev => {
      const isPinned = prev.includes(pinKey);
      const next = isPinned ? prev.filter(k => k !== pinKey) : [...prev, pinKey];
      storageIpc.update('app', {pinnedThreads: next});
      return next;
    });
  }, []);

  const handleCopyToClipboard = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, currentCard?.title || 'AI')
          : formatChatToPlainText(messages, currentCard?.title || 'AI');
      try {
        await navigator.clipboard.writeText(formatted);
        topToast.success(`Copied chat as ${format}`, {timeout: 1500});
      } catch (err) {
        console.error('Failed to copy chat:', err);
        topToast.danger('Failed to copy chat', {timeout: 2000});
      }
    },
    [messages, currentCard],
  );

  const handleSaveToFile = useCallback(
    async (format: 'markdown' | 'text') => {
      if (messages.length === 0) return;
      const formatted =
        format === 'markdown'
          ? formatChatToMarkdown(messages, currentCard?.title || 'AI')
          : formatChatToPlainText(messages, currentCard?.title || 'AI');

      const dateStr = new Date().toISOString().slice(0, 10);
      const cardName = currentCard?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'chat';
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
    [messages, currentCard],
  );

  const isLoginRequired = useMemo(() => {
    return isPageLoaded && messages.length === 0 && chatHistory.length === 0;
  }, [isPageLoaded, messages, chatHistory]);

  const prevIsLoginRequired = useRef<boolean | null>(null);

  // Automatically switch to login step if login is required, or transition to chat on login completion
  useEffect(() => {
    if (!hasSetInitialStep) return;

    if (isLoginRequired) {
      setStep('login');
    } else if (prevIsLoginRequired.current === true) {
      setStep('chat');
    }
    prevIsLoginRequired.current = isLoginRequired;
  }, [isLoginRequired, hasSetInitialStep]);

  const lastStepRef = useRef(step);
  const lastCardIdRef = useRef(currentCardId);

  // Handle webview visibility for the active card in Float Chat
  useEffect(() => {
    if (!currentCardId || currentCardId === 'unified') return;

    const viewId = `online-bg-${currentCardId}`;

    const stepChangedToLogin = step === 'login' && lastStepRef.current !== 'login';
    const cardChangedWithLogin = currentCardId !== lastCardIdRef.current && step === 'login';

    lastStepRef.current = step;
    lastCardIdRef.current = currentCardId;

    if (step === 'login') {
      if (stepChangedToLogin || cardChangedWithLogin || !activeWindowRef.current) {
        browserIpc.send.setVisible(viewId, true);
      }
    } else {
      if (activeWindowRef.current === 'float') {
        browserIpc.send.setVisible(viewId, false, 'offscreen');
      }
    }

    return () => {
      if (activeWindowRef.current === 'float') {
        browserIpc.send.setVisible(viewId, false, 'offscreen');
      }
    };
  }, [currentCardId, step]);

  // Reclaim free webview when it becomes free (activeWindow becomes null)
  useEffect(() => {
    if (!currentCardId || currentCardId === 'unified') return;
    const viewId = `online-bg-${currentCardId}`;

    if (step === 'login' && !moduleState?.activeWindow) {
      browserIpc.send.setVisible(viewId, true);
    }
  }, [moduleState?.activeWindow, currentCardId, step]);

  // Listen for window shown events to re-trigger setVisible and sync app settings
  useEffect(() => {
    const offWindowShown = floatChatIpc.onWindowShown(() => {
      if (step === 'login' && currentCardId) {
        if (activeWindowRef.current !== 'main') {
          browserIpc.send.setVisible(`online-bg-${currentCardId}`, true);
        }
      }
      storageIpc.get('app').then(app => {
        if (app?.chatBridgeMaxWidth) {
          setChatBridgeMaxWidth(app.chatBridgeMaxWidth);
        }
      });
    });

    return () => {
      offWindowShown();
    };
  }, [currentCardId, step]);

  return {
    onlineCards,
    activeCardId,
    setActiveCardId,
    inputText,
    setInputText,
    syncedState,
    step,
    setStep,
    scrollRef,
    contentRef,
    messagesEndRef,
    chatBridgeMaxWidth,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    searchQuery,
    setSearchQuery,
    pinnedThreads,
    collapsedProviders,
    setCollapsedProviders,
    focusedIndex,
    setFocusedIndex,
    activeCard,
    currentCardId,
    currentCard,
    moduleState,
    messages,
    chatHistory,
    isGenerating,
    isPageLoaded,
    isHistoryLoading,
    isSending,
    isLoginRequired,
    handleScroll,
    handleSend,
    handleKeyDown,
    handleSelectThread,
    handleNewChat,
    handleTogglePin,
    handleCopyToClipboard,
    handleSaveToFile,
  };
}
