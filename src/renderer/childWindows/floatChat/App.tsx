import {Button, CloseButton, Dropdown, InputGroup, ScrollShadow, SearchField} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import ToastProviders, {topToast} from '@lynx/layouts/ToastProviders';
import {formatChatToMarkdown, formatChatToPlainText} from '@lynx/pages/chatBridge/useChatBridge';
import {ChatBubble, ChatSkeleton, TypingIndicatorBubble} from '@lynx_shared/components/ChatBubble';
import browserIpc from '@lynx_shared/ipc/browser';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import filesIpc from '@lynx_shared/ipc/files';
import floatChatIpc from '@lynx_shared/ipc/floatChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {ChatRound, Copy, Earth, FileDownload, Pin, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowDown, AltArrowLeft, AltArrowRight} from '@solar-icons/react-perf/LineDuotone';
import {Plus} from 'lucide-react';
import {KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

export default function FloatChatApp() {
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

  const [menuPosition, setMenuPosition] = useState<{x: number; y: number} | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectionText, setSelectionText] = useState('');

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
      console.log('App.tsx: getOnlineCards returned:', cards);
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
      console.log('App.tsx: getCachedState returned:', state);
      if (state) setSyncedState(state);
    });

    const offCards = floatChatIpc.onSetOnlineCards(cards => {
      console.log('App.tsx: onSetOnlineCards received:', cards);
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
      // User is near bottom if scroll position is within 100px of maximum
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

  const sidebarWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const floatSidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(140, Math.min(350, startWidth + deltaX));
      if (floatSidebarRef.current) {
        floatSidebarRef.current.style.width = `${newWidth}px`;
        floatSidebarRef.current.style.transition = 'none';
      }
    };

    const handleMouseUp = (upEvent: globalThis.MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const deltaX = upEvent.clientX - startX;
      const finalWidth = Math.max(140, Math.min(350, startWidth + deltaX));

      if (floatSidebarRef.current) {
        floatSidebarRef.current.style.transition = '';
      }
      setSidebarWidth(finalWidth);
      storageIpc.update('app', {floatChatSidebarWidth: finalWidth});
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Search and grouping logic
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return chatHistory;
    const q = searchQuery.toLowerCase();
    return chatHistory.filter((item: any) => item.title.toLowerCase().includes(q));
  }, [chatHistory, searchQuery]);

  const groupedHistory = useMemo(() => {
    const pinned: any[] = [];
    const unpinned: any[] = [];

    filteredHistory.forEach((item: any) => {
      const cId = item.cardId || activeCardId;
      const pinKey = `${cId}::${item.title}`;
      if (pinnedThreads.includes(pinKey)) {
        pinned.push(item);
      } else {
        unpinned.push(item);
      }
    });

    const groups: Record<string, any[]> = {};
    if (activeCardId === 'unified') {
      unpinned.forEach((item: any) => {
        const cId = item.cardId || 'unknown';
        if (!groups[cId]) groups[cId] = [];
        groups[cId].push(item);
      });
    }

    return {pinned, unpinned, groups};
  }, [filteredHistory, activeCardId, pinnedThreads]);

  const visibleItemsFlat = useMemo(() => {
    const flat: any[] = [];
    groupedHistory.pinned.forEach(item => flat.push(item));
    if (activeCardId === 'unified') {
      onlineCards
        .filter(c => c.id !== 'unified')
        .forEach(card => {
          const isProviderCollapsed = collapsedProviders[card.id];
          const items = groupedHistory.groups[card.id] || [];
          if (!isProviderCollapsed && items.length > 0) {
            items.forEach(item => flat.push(item));
          }
        });
    } else {
      groupedHistory.unpinned.forEach(item => flat.push(item));
    }
    return flat;
  }, [groupedHistory, activeCardId, onlineCards, collapsedProviders]);

  // Sync focusedIndex focus to DOM element
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < visibleItemsFlat.length) {
      const item = visibleItemsFlat[focusedIndex];
      const cId = item.cardId || activeCardId;
      const el = document.getElementById(`fc-thread-${cId}-${item.index}`);
      el?.focus({preventScroll: false});
    }
  }, [focusedIndex, visibleItemsFlat, activeCardId]);

  const handleSidebarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const isSearchFocused = document.activeElement?.getAttribute('placeholder') === 'Search chats...';

      if (isSearchFocused) {
        if (e.key === 'ArrowDown' && visibleItemsFlat.length > 0) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        return;
      }

      if (visibleItemsFlat.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % visibleItemsFlat.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          if (prev <= 0) {
            const searchInput = document.querySelector('input[placeholder="Search chats..."]') as HTMLInputElement;
            searchInput?.focus();
            return -1;
          }
          return prev - 1;
        });
      } else if (e.key === 'Enter') {
        if (focusedIndex >= 0 && focusedIndex < visibleItemsFlat.length) {
          e.preventDefault();
          const item = visibleItemsFlat[focusedIndex];
          handleSelectThread(item.index, item.cardId);
        }
      }
    },
    [visibleItemsFlat, focusedIndex, handleSelectThread],
  );

  const toggleProviderCollapse = useCallback((cardId: string) => {
    setCollapsedProviders(prev => ({...prev, [cardId]: !prev[cardId]}));
  }, []);

  const renderThreadItem = (item: any) => {
    const isSelected = item.active;
    const cId = item.cardId || activeCardId;
    const card = onlineCards.find(c => c.id === cId);
    const pinKey = `${cId}::${item.title}`;
    const isPinned = pinnedThreads.includes(pinKey);
    const isFocused =
      focusedIndex >= 0 &&
      visibleItemsFlat[focusedIndex]?.index === item.index &&
      visibleItemsFlat[focusedIndex]?.cardId === item.cardId;

    return (
      <button
        className={
          'relative w-full flex items-center justify-between gap-2 p-2 rounded-xl text-left shrink-0 ' +
          'transition duration-200 cursor-pointer overflow-hidden group ' +
          'focus-visible:outline-none focus:outline-none ' +
          `${isSelected ? 'bg-accent/10 text-accent font-semibold' : 'text-foreground hover:bg-foreground/5'} ` +
          `${isFocused || isSelected ? 'ring-2 ring-accent/30' : ''}`
        }
        key={`${cId}-${item.index}`}
        id={`fc-thread-${cId}-${item.index}`}
        onClick={() => handleSelectThread(item.index, item.cardId)}>
        <div className="relative z-10 flex items-center gap-2 w-full overflow-hidden">
          {activeCardId === 'unified' && card?.logoUrl ? (
            <img alt="" src={card.logoUrl} className="size-3.5 rounded shrink-0" />
          ) : (
            <ChatRound className={`size-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`} />
          )}
          <span className="text-xs truncate flex-1">{item.title || 'Untitled Chat'}</span>

          {/* Pin toggle button on hover */}
          <button
            onClick={e => {
              e.stopPropagation();
              handleTogglePin(cId, item.title);
            }}
            className={
              'opacity-0 group-hover:opacity-100 hover:text-accent p-0.5 ' +
              `transition-opacity duration-150 cursor-pointer shrink-0 z-20 ${
                isPinned ? 'opacity-100 text-accent' : 'text-semi-muted'
              }`
            }
            aria-label={isPinned ? 'Unpin' : 'Pin'}>
            <Pin className={`size-3 ${isPinned ? 'fill-accent' : ''}`} />
          </button>
        </div>
      </button>
    );
  };

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

  const handleContextMenu = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      const selText = window.getSelection()?.toString().trim() || '';

      const hasMessages = messages.length > 0;
      const hasNewChat = !!currentCard?.onlineConfig?.newChat || currentCardId === 'unified';

      if (!selText && !hasMessages && !hasNewChat) {
        return;
      }

      e.preventDefault();
      setSelectionText(selText);
      setMenuPosition({x: e.clientX, y: e.clientY});
      setIsMenuOpen(true);
    },
    [messages.length, currentCard, currentCardId],
  );

  const handleMenuAction = useCallback(
    async (key: any) => {
      setIsMenuOpen(false);

      switch (key) {
        case 'copy-selection':
          if (selectionText) {
            await navigator.clipboard.writeText(selectionText);
            topToast.success('Copied selection', {timeout: 1500});
          }
          break;
        case 'search-web':
          if (selectionText) {
            contextMenuIpc.send.chatBridgeAction('float-chat', 'search-web', selectionText);
          }
          break;
        case 'start-chat-with-selection':
          if (selectionText) {
            setInputText(selectionText);
            handleNewChat();
          }
          break;
        case 'new-chat':
          handleNewChat();
          break;
        case 'copy-markdown':
          void handleCopyToClipboard('markdown');
          break;
        case 'copy-text':
          void handleCopyToClipboard('text');
          break;
        case 'save-markdown':
          void handleSaveToFile('markdown');
          break;
        case 'save-text':
          void handleSaveToFile('text');
          break;
      }
    },
    [selectionText, handleNewChat, handleCopyToClipboard, handleSaveToFile],
  );

  const isLoginRequired = useMemo(() => {
    // If card is loaded but we have no messages and no history, they need to log in
    return isPageLoaded && messages.length === 0 && chatHistory.length === 0;
  }, [isPageLoaded, messages, chatHistory]);

  const prevIsLoginRequired = useRef<boolean | null>(null);

  // Automatically switch to login step if login is required, or transition to chat on login completion
  useEffect(() => {
    if (!hasSetInitialStep) return;

    if (isLoginRequired) {
      setStep('login');
    } else if (prevIsLoginRequired.current === true) {
      // Transitioned from login required to not login required -> switch to chat
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

  return (
    <div
      onContextMenu={handleContextMenu}
      className={'flex flex-col h-screen w-screen bg-surface overflow-hidden select-none font-Nunito text-foreground'}>
      {/* Header bar */}
      <div className={'flex flex-row items-center justify-between py-3 px-4 gap-x-2 draggable'}>
        <div className="flex flex-row items-center flex-1 gap-x-2">
          <ChatRound className="text-semi-muted size-5 shrink-0 mb-0.5" />
          {step === 'chat' ? (
            <InputGroup variant="secondary" className=" rounded-2xl notDraggable" fullWidth>
              <InputGroup.TextArea
                placeholder={
                  isLoginRequired
                    ? `Login required for ${currentCard?.title || 'AI'}`
                    : `Message ${currentCard?.title || 'AI'}...`
                }
                rows={1}
                value={inputText}
                className="max-h-32"
                onKeyDown={handleKeyDown}
                onChange={e => setInputText(e.target.value)}
                autoFocus
              />
            </InputGroup>
          ) : activeCard ? (
            <span className="text-[0.9rem] font-semibold">{activeCard.title}</span>
          ) : null}
        </div>

        <div className="flex flex-row items-center gap-x-2 notDraggable">
          {activeCard && step === 'chat' && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary">
                  {activeCard.logoUrl ? (
                    <img alt="" className="size-4" src={activeCard.logoUrl} />
                  ) : activeCard.title === 'Unified Chat' ? (
                    <ChatRound className="size-4" />
                  ) : (
                    <div className="hidden" />
                  )}
                  {activeCard.title}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover className="bg-surface-secondary notDraggable">
                <Dropdown.Menu aria-label="AI Selector">
                  {onlineCards.map(card => (
                    <Dropdown.Item
                      onPress={() => {
                        setActiveCardId(card.id);
                        floatChatIpc.setActiveCard(card.id);
                      }}
                      key={card.id}
                      className="flex flex-row items-center text-xs">
                      <div className="flex items-center gap-x-2">
                        {card.logoUrl ? (
                          <img alt="" src={card.logoUrl} className="size-4" />
                        ) : card.title === 'Unified Chat' ? (
                          <ChatRound className="size-4" />
                        ) : (
                          <div className="hidden" />
                        )}
                        {card.title}
                      </div>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          {activeCard && activeCardId !== 'unified' && (
            <div className="flex flex-row items-center gap-x-1.5">
              {step === 'login' && (
                <Button
                  onPress={() => {
                    if (currentCardId) {
                      browserIpc.send.reload(`online-bg-${currentCardId}`);
                    }
                  }}
                  size="sm"
                  variant="secondary"
                  isIconOnly>
                  <Restart className="size-4 text-semi-muted" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setStep(prev => (prev === 'chat' ? 'login' : 'chat'))}
                isIconOnly>
                {step === 'chat' ? (
                  <Earth className="size-4 text-semi-muted" />
                ) : (
                  <ChatRound className="size-4 text-semi-muted" />
                )}
              </Button>
            </div>
          )}

          <CloseButton onPress={() => floatChatIpc.closeFloatChat()} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Sidebar for Recents */}
        {step !== 'login' && (
          <div
            className={
              'flex flex-col shrink-0 draggable bg-surface-secondary overflow-hidden ' +
              'relative border-r border-border/10 transition-[width] duration-200 ease-in-out ' +
              `select-none focus:outline-none ${
                isSidebarCollapsed ? 'h-fit rounded-r-2xl mt-4' : 'rounded-tr-2xl h-full'
              }`
            }
            tabIndex={0}
            ref={floatSidebarRef}
            onKeyDown={handleSidebarKeyDown}
            style={{width: isSidebarCollapsed ? 52 : sidebarWidth}}>
            {isSidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2.5 pt-3 pb-2 px-2 shrink-0 notDraggable">
                {activeCardId === 'unified' ? (
                  <Dropdown>
                    <Dropdown.Trigger>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="New Chat"
                        className="size-7 notDraggable shrink-0"
                        isIconOnly>
                        <Plus className="size-3.5" />
                      </Button>
                    </Dropdown.Trigger>
                    <Dropdown.Popover placement="right top" className="min-w-44 bg-surface-secondary border-border">
                      <Dropdown.Menu
                        onAction={key => {
                          handleNewChat(String(key));
                        }}>
                        {onlineCards
                          .filter(c => c.id !== 'unified')
                          .map(c => (
                            <Dropdown.Item id={c.id} key={c.id} textValue={`New Chat on ${c.title}`}>
                              <div className="flex items-center gap-x-2">
                                {c.logoUrl && <img alt="" src={c.logoUrl} className="size-4 rounded shrink-0" />}
                                <span className="text-xs">{c.title}</span>
                              </div>
                            </Dropdown.Item>
                          ))}
                      </Dropdown.Menu>
                    </Dropdown.Popover>
                  </Dropdown>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="New Chat"
                    onPress={() => handleNewChat()}
                    className="notDraggable size-7 shrink-0"
                    isIconOnly>
                    <Plus className="size-3.5" />
                  </Button>
                )}

                <Button
                  onPress={() => {
                    setIsSidebarCollapsed(false);
                    storageIpc.update('app', {floatChatSidebarCollapsed: false});
                  }}
                  size="sm"
                  variant="ghost"
                  aria-label="Expand sidebar"
                  className="notDraggable size-7 shrink-0"
                  isIconOnly>
                  <AltArrowRight className="size-4 text-semi-muted" />
                </Button>
              </div>
            ) : (
              <>
                <div className={'flex items-center justify-between px-3 py-2 bg-surface/50 draggable shrink-0'}>
                  <span className="text-[8pt] font-bold text-semi-muted tracking-wider uppercase">Recents</span>
                  <div className="flex items-center gap-1">
                    {activeCardId === 'unified' ? (
                      <Dropdown>
                        <Dropdown.Trigger>
                          <Button size="sm" variant="ghost" className="size-7 notDraggable" isIconOnly>
                            <Plus className="size-3.5" />
                          </Button>
                        </Dropdown.Trigger>
                        <Dropdown.Popover
                          placement="bottom end"
                          className="min-w-44 bg-surface-secondary border-border">
                          <Dropdown.Menu
                            onAction={key => {
                              handleNewChat(String(key));
                            }}>
                            {onlineCards
                              .filter(c => c.id !== 'unified')
                              .map(c => (
                                <Dropdown.Item id={c.id} key={c.id} textValue={`New Chat on ${c.title}`}>
                                  <div className="flex items-center gap-x-2">
                                    {c.logoUrl && <img alt="" src={c.logoUrl} className="size-4 rounded shrink-0" />}
                                    <span className="text-xs">{c.title}</span>
                                  </div>
                                </Dropdown.Item>
                              ))}
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="notDraggable size-7"
                        onPress={() => handleNewChat()}
                        isIconOnly>
                        <Plus className="size-3.5" />
                      </Button>
                    )}

                    <Button
                      onPress={() => {
                        setIsSidebarCollapsed(true);
                        storageIpc.update('app', {floatChatSidebarCollapsed: true});
                      }}
                      size="sm"
                      variant="ghost"
                      aria-label="Collapse sidebar"
                      className="notDraggable size-7 shrink-0"
                      isIconOnly>
                      <AltArrowLeft className="size-4 text-semi-muted" />
                    </Button>
                  </div>
                </div>

                {/* Search Input in Float Sidebar */}
                <SearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  aria-label="Search chats"
                  className="notDraggable p-1">
                  <SearchField.Group>
                    <SearchField.SearchIcon />
                    <SearchField.Input placeholder="Search chats..." />
                    {searchQuery && <SearchField.ClearButton className="absolute right-0" />}
                  </SearchField.Group>
                </SearchField>

                <ScrollShadow className="flex-1 py-2 px-1 overflow-y-auto">
                  {filteredHistory.length === 0 ? (
                    <div className="text-center py-8 text-xs text-semi-muted draggable">No chats found</div>
                  ) : (
                    <div className="notDraggable size-full flex flex-col gap-y-2">
                      {/* Pinned Section */}
                      {groupedHistory.pinned.length > 0 && (
                        <div className="flex flex-col gap-y-0.5">
                          <div className="px-2 pb-1 text-[8px] font-bold text-accent uppercase tracking-wider">
                            Pinned
                          </div>
                          {groupedHistory.pinned.map(item => renderThreadItem(item))}
                        </div>
                      )}

                      {/* Recents / Groups Section */}
                      {activeCardId === 'unified' ? (
                        onlineCards
                          .filter(c => c.id !== 'unified')
                          .map(card => {
                            const providerItems = groupedHistory.groups[card.id] || [];
                            if (providerItems.length === 0) return null;

                            const isCollapsed = collapsedProviders[card.id] ?? false;

                            return (
                              <div key={card.id} className="flex flex-col gap-y-0.5">
                                <button
                                  className={
                                    'flex items-center justify-between px-2 py-1 text-[8px] font-bold text-muted ' +
                                    'hover:text-foreground uppercase tracking-wider ' +
                                    'cursor-pointer w-full text-left font-Nunito'
                                  }
                                  onClick={() => toggleProviderCollapse(card.id)}>
                                  <div className="flex items-center gap-1.5">
                                    {card.logoUrl && (
                                      <img alt="" src={card.logoUrl} className="size-3 rounded-sm shrink-0" />
                                    )}
                                    <span>{card.title}</span>
                                  </div>
                                  {isCollapsed ? (
                                    <AltArrowRight className="size-3" />
                                  ) : (
                                    <AltArrowDown className="size-3" />
                                  )}
                                </button>
                                {!isCollapsed && providerItems.map(item => renderThreadItem(item))}
                              </div>
                            );
                          })
                      ) : (
                        <div className="flex flex-col gap-y-0.5">
                          {groupedHistory.pinned.length > 0 && groupedHistory.unpinned.length > 0 && (
                            <div className="px-2 pb-1 text-[8px] font-bold text-muted uppercase tracking-wider">
                              Recents
                            </div>
                          )}
                          {groupedHistory.unpinned.map(item => renderThreadItem(item))}
                        </div>
                      )}
                    </div>
                  )}
                </ScrollShadow>

                {/* Resize Drag Handle */}
                <div
                  className={
                    'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/40 ' +
                    'active:bg-accent transition-colors z-30 notDraggable'
                  }
                  onMouseDown={handleMouseDown}
                />
              </>
            )}
          </div>
        )}

        {/* Chat History View */}
        <div className="flex-1 flex flex-col overflow-hidden relative draggable">
          {step === 'login' ? (
            <div className="flex size-full flex-col overflow-hidden bg-white notDraggable">
              <div className="flex-1 relative w-full bg-white">
                {moduleState?.activeWindow === 'main' ? (
                  <div
                    className={
                      'absolute inset-0 flex flex-col items-center ' +
                      'justify-center p-6 bg-surface text-center draggable'
                    }>
                    <Earth className="size-12 text-semi-muted mb-4 animate-pulse notDraggable" />
                    <h3 className="text-base font-semibold mb-2 draggable">Webview is Active in Main Window</h3>
                    <p className="text-xs text-semi-muted max-w-sm mb-6 draggable">
                      The interactive webview for this AI module is currently active in the main app window.
                    </p>
                    <Button
                      onPress={() => {
                        if (currentCardId) {
                          browserIpc.send.setVisible(`online-bg-${currentCardId}`, true);
                        }
                      }}
                      size="sm"
                      variant="primary"
                      className="notDraggable">
                      Bring Webview Here
                    </Button>
                  </div>
                ) : (
                  <BrowserViewPlaceholder />
                )}
              </div>
            </div>
          ) : isHistoryLoading ? (
            <div className="p-4 flex-1 overflow-hidden notDraggable">
              <ChatSkeleton />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 draggable">
              <span className="text-xs text-semi-muted">Ask {currentCard?.title || 'AI'} anything to get started</span>
            </div>
          ) : (
            <ScrollShadow ref={scrollRef} onScroll={handleScroll} className="flex-1 w-full notDraggable">
              <div
                className={`${
                  chatBridgeMaxWidth === 'small'
                    ? 'max-w-2xl'
                    : chatBridgeMaxWidth === 'wide'
                      ? 'max-w-6xl'
                      : chatBridgeMaxWidth === 'full'
                        ? 'max-w-full'
                        : 'max-w-4xl'
                } mx-auto w-full flex flex-col gap-y-3 flex-1 p-4`}
                ref={contentRef}>
                <div className="space-y-4 flex-1">
                  {messages.map((msg, index) => (
                    <ChatBubble
                      key={index}
                      message={msg}
                      isGenerating={isGenerating}
                      isLast={index === messages.length - 1}
                    />
                  ))}
                  {isGenerating && messages[messages.length - 1]?.sender === 'user' && <TypingIndicatorBubble />}
                </div>
                <div ref={messagesEndRef} />
              </div>
            </ScrollShadow>
          )}
        </div>
      </div>
      {menuPosition && (
        <div
          style={{
            position: 'absolute',
            left: menuPosition.x,
            top: menuPosition.y,
          }}
          className="size-px pointer-events-none opacity-0">
          <Dropdown isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Dropdown.Trigger>
              <button aria-label="Context Menu Trigger" className="pointer-events-none size-px" />
            </Dropdown.Trigger>
            <Dropdown.Popover className="bg-surface-secondary border-border min-w-56 notDraggable">
              <Dropdown.Menu onAction={handleMenuAction} aria-label="Chat Context Menu">
                {selectionText ? (
                  <Dropdown.Section>
                    <Dropdown.Item id="copy-selection" textValue="Copy Selection">
                      <div className="flex items-center gap-x-2 text-xs">
                        <Copy className="size-4 shrink-0" />
                        <span>Copy Selection</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="search-web" textValue="Search Web">
                      <div className="flex items-center gap-x-2 text-xs">
                        <Earth className="size-4 shrink-0" />
                        <span>Search Web</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="start-chat-with-selection" textValue="Start New Chat with Selection">
                      <div className="flex items-center gap-x-2 text-xs">
                        <ChatRound className="size-4 text-accent shrink-0" />
                        <span>Start New Chat with Selection</span>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Section>
                ) : (
                  <Dropdown.Section>
                    {((currentCardId !== 'unified' && !!currentCard?.onlineConfig?.newChat) ||
                      currentCardId === 'unified') && (
                      <Dropdown.Item id="new-chat" textValue="New Chat">
                        <div className="flex items-center gap-x-2 text-xs">
                          <ChatRound className="size-4 text-accent shrink-0" />
                          <span>New Chat</span>
                        </div>
                      </Dropdown.Item>
                    )}
                  </Dropdown.Section>
                )}

                {messages.length > 0 && (
                  <Dropdown.Section>
                    <Dropdown.Item id="copy-markdown" textValue="Copy as Markdown">
                      <div className="flex items-center gap-x-2 text-xs">
                        <Copy className="size-4 text-muted shrink-0" />
                        <span>Copy as Markdown</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="copy-text" textValue="Copy as Plain Text">
                      <div className="flex items-center gap-x-2 text-xs">
                        <Copy className="size-4 text-muted shrink-0" />
                        <span>Copy as Plain Text</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="save-markdown" textValue="Save as Markdown (.md)">
                      <div className="flex items-center gap-x-2 text-xs">
                        <FileDownload className="size-4 text-muted shrink-0" />
                        <span>Save as Markdown (.md)</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item id="save-text" textValue="Save as Plain Text (.txt)">
                      <div className="flex items-center gap-x-2 text-xs">
                        <FileDownload className="size-4 text-muted shrink-0" />
                        <span>Save as Plain Text (.txt)</span>
                      </div>
                    </Dropdown.Item>
                  </Dropdown.Section>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      )}
      <ToastProviders />
    </div>
  );
}
