import {Button, Dropdown, Input, ScrollShadow, Spinner} from '@heroui/react';
import spotlightChatIpc from '@lynx_shared/ipc/spotlightChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {AddCircle, ArrowRight, UserId} from '@solar-icons/react-perf/BoldDuotone';
import {CloseCircle, Magnifier} from '@solar-icons/react-perf/Linear';
import {KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState} from 'react';

export default function SpotlightApp() {
  const [onlineCards, setOnlineCards] = useState<any[]>([]);
  const [activeCardId, setActiveCardId] = useState<string>('chatgpt');
  const [inputText, setInputText] = useState('');
  const [syncedState, setSyncedState] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync Theme
  useEffect(() => {
    storageIpc.get('app').then(app => {
      if (app?.darkMode) {
        const isDark =
          app.darkMode === 'dark' ||
          (app.darkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    });
  }, []);

  // Fetch initial caches & set up listeners
  useEffect(() => {
    spotlightChatIpc.getOnlineCards().then(cards => {
      console.log('App.tsx: getOnlineCards returned:', cards);
      if (cards && cards.length > 0) {
        setOnlineCards(cards);
        setActiveCardId(prev => {
          const next = cards.some(c => c.id === prev) ? prev : cards[0].id;
          spotlightChatIpc.setActiveCard(next);
          return next;
        });
      }
    });

    spotlightChatIpc.getCachedState().then(state => {
      console.log('App.tsx: getCachedState returned:', state);
      if (state) setSyncedState(state);
    });

    const offCards = spotlightChatIpc.onSetOnlineCards(cards => {
      console.log('App.tsx: onSetOnlineCards received:', cards);
      if (cards && cards.length > 0) {
        setOnlineCards(cards);
        setActiveCardId(prev => {
          const next = cards.some(c => c.id === prev) ? prev : cards[0].id;
          spotlightChatIpc.setActiveCard(next);
          return next;
        });
      }
    });

    const offState = spotlightChatIpc.onSyncState(state => {
      if (state) setSyncedState(state);
    });

    // Close on Escape pressed anywhere in window
    const handleGlobalKeyDown = (e: any) => {
      if (e.key === 'Escape') {
        spotlightChatIpc.closeSpotlight();
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
    if (activeCardId !== 'universal') return activeCardId;
    if (syncedState?.activeUniversalCardId) return syncedState.activeUniversalCardId;
    const firstNonUniversal = onlineCards.find(c => c.id !== 'universal');
    return firstNonUniversal ? firstNonUniversal.id : null;
  }, [activeCardId, syncedState?.activeUniversalCardId, onlineCards]);

  const currentCard = useMemo(() => {
    return onlineCards.find(c => c.id === currentCardId);
  }, [onlineCards, currentCardId]);

  const moduleState = useMemo(() => {
    return currentCardId ? syncedState?.modules?.[currentCardId] : null;
  }, [syncedState, currentCardId]);

  const messages = useMemo(() => {
    return moduleState?.messages || [];
  }, [moduleState]);

  const chatHistory = useMemo(() => {
    if (activeCardId !== 'universal') {
      const hist = moduleState?.chatHistory || [];
      return hist.map((item: any) => ({
        ...item,
        cardId: activeCardId,
      }));
    }

    // Universal Mode - merge history from all background-enabled modules
    const merged: any[] = [];
    const visibleModuleIds = syncedState?.visibleModuleIds || [];
    const activeUniversalCardId = syncedState?.activeUniversalCardId || null;
    const modules = syncedState?.modules || {};

    visibleModuleIds.forEach((cardId: string) => {
      const mod = modules[cardId];
      if (mod && mod.chatHistory) {
        mod.chatHistory.forEach((item: any) => {
          merged.push({
            ...item,
            cardId,
            active: item.active && activeUniversalCardId === cardId,
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

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSending || isGenerating || !currentCardId) return;
    spotlightChatIpc.sendMessage(currentCardId, inputText);
    setInputText('');
  }, [inputText, currentCardId, isSending, isGenerating]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSelectThread = useCallback(
    (index: number, cardId?: string) => {
      const targetCardId = cardId || activeCardId;
      spotlightChatIpc.selectThread(targetCardId, index);
    },
    [activeCardId],
  );

  const handleNewChat = useCallback(
    (cardId?: string) => {
      const targetCardId = cardId || currentCardId;
      if (targetCardId) spotlightChatIpc.newChat(targetCardId);
    },
    [currentCardId],
  );

  const handleOpenLogin = useCallback(() => {
    if (currentCardId) spotlightChatIpc.openLogin(currentCardId);
  }, [currentCardId]);

  const isLoginRequired = useMemo(() => {
    // If card is loaded but we have no messages and no history, they need to log in
    return isPageLoaded && messages.length === 0 && chatHistory.length === 0;
  }, [isPageLoaded, messages, chatHistory]);

  return (
    <div
      className={
        'flex flex-col h-screen w-screen bg-background border border-divider/50 ' +
        'rounded-2xl overflow-hidden select-none font-sans'
      }>
      {/* Header bar */}
      <div
        className={
          'flex flex-row items-center justify-between px-4 py-2 ' +
          'border-b border-divider/30 gap-x-2 bg-surface draggable'
        }>
        <div className="flex flex-row items-center flex-1 gap-x-2 notDraggable">
          <Magnifier className="text-muted-foreground size-5 shrink-0" />
          <Input
            placeholder={
              isLoginRequired
                ? `Login required for ${currentCard?.title || 'AI'}`
                : `Message ${currentCard?.title || 'AI'}...`
            }
            value={inputText}
            variant="secondary"
            aria-label="chat_input"
            onKeyDown={handleKeyDown}
            disabled={isLoginRequired || isSending}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 text-sm bg-transparent border-0 focus:outline-none"
          />
        </div>

        <div className="flex flex-row items-center gap-x-2 notDraggable">
          {activeCard && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary" className="px-3 py-1 font-semibold rounded-lg text-xs">
                  {activeCard.logoUrl && (
                    <img alt="" src={activeCard.logoUrl} className="size-3.5 rounded shrink-0 mr-1.5" />
                  )}
                  {activeCard.title}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover>
                <Dropdown.Menu aria-label="AI Selector">
                  {onlineCards.map(card => (
                    <Dropdown.Item
                      onPress={() => {
                        setActiveCardId(card.id);
                        spotlightChatIpc.setActiveCard(card.id);
                      }}
                      key={card.id}
                      className="flex flex-row items-center text-xs">
                      <div className="flex items-center gap-x-2">
                        {card.logoUrl && <img alt="" src={card.logoUrl} className="size-4 rounded" />}
                        <span>{card.title}</span>
                      </div>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          <Button size="sm" variant="ghost" onPress={() => spotlightChatIpc.closeSpotlight()} isIconOnly>
            <CloseCircle className="text-muted-foreground size-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-row flex-1 overflow-hidden bg-background">
        {/* Sidebar for Recents */}
        <div className="w-[200px] border-r border-divider/20 flex flex-col shrink-0 bg-surface/30 draggable">
          <div
            className={
              'flex items-center justify-between px-3 py-2 ' + 'border-b border-divider/10 bg-surface/50 notDraggable'
            }>
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Recents</span>
            {activeCardId === 'universal' ? (
              <Dropdown>
                <Dropdown.Trigger>
                  <Button size="sm" variant="ghost" className="h-6 w-6" isIconOnly>
                    <AddCircle className="size-4 text-primary" />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom end" className="min-w-44 bg-surface-secondary border-border">
                  <Dropdown.Menu
                    onAction={key => {
                      handleNewChat(String(key));
                    }}>
                    {onlineCards
                      .filter(c => c.id !== 'universal')
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
              <Button size="sm" variant="ghost" className="h-6 w-6" onPress={() => handleNewChat()} isIconOnly>
                <AddCircle className="size-4 text-primary" />
              </Button>
            )}
          </div>

          <ScrollShadow className="flex-1 p-1.5 gap-y-1">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8 notDraggable">
                <Spinner size="sm" />
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground notDraggable">No recent chats</div>
            ) : (
              chatHistory.map((item: any) => {
                const card = onlineCards.find(c => c.id === item.cardId);
                return (
                  <button
                    className={
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all ' +
                      `flex flex-row items-center gap-x-2 group notDraggable ${
                        item.active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'hover:bg-content2 text-foreground/80'
                      }`
                    }
                    key={`${item.cardId}-${item.index}`}
                    onClick={() => handleSelectThread(item.index, item.cardId)}>
                    {activeCardId === 'universal' && card?.logoUrl && (
                      <img alt="" src={card.logoUrl} className="size-3.5 rounded shrink-0" />
                    )}
                    <span className="truncate flex-1 pr-1">{item.title || 'Untitled Chat'}</span>
                  </button>
                );
              })
            )}
          </ScrollShadow>
        </div>

        {/* Chat History View */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {isLoginRequired ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-background">
              <div className="p-4 rounded-full bg-primary/5 mb-4">
                <UserId className="size-10 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Authentication Required</h3>
              <p className="text-xs text-muted-foreground max-w-xs mb-4">
                Please log in to your {currentCard?.title || 'AI'} account in LynxHub to enable chat access.
              </p>
              <Button size="sm" variant="primary" className="font-semibold" onPress={handleOpenLogin}>
                Login in LynxHub
                <ArrowRight className="size-3.5 ml-1" />
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
              <span className="text-xs text-muted-foreground">
                Ask {currentCard?.title || 'AI'} anything to get started
              </span>
            </div>
          ) : (
            <ScrollShadow className="flex-1 p-4 flex flex-col gap-y-3">
              {messages.map((msg, index) => (
                <div
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                  key={index}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-none'
                        : 'bg-content2 text-foreground border border-divider/10 rounded-tl-none'
                    }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isGenerating && (
                <div className="flex flex-col self-start items-start max-w-[85%]">
                  <div
                    className={
                      'px-3 py-2 rounded-2xl bg-content2 text-foreground border ' +
                      'border-divider/10 rounded-tl-none flex items-center gap-x-2'
                    }>
                    <Spinner size="sm" color="current" />
                    <span className="text-[10px] text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </ScrollShadow>
          )}
        </div>
      </div>
    </div>
  );
}
