import {Button, CloseButton, Dropdown, Input, ScrollShadow, Spinner} from '@heroui/react';
import spotlightChatIpc from '@lynx_shared/ipc/spotlightChat';
import storageIpc from '@lynx_shared/ipc/storage';
import {ArrowRight, ChatRound, UserId} from '@solar-icons/react-perf/BoldDuotone';
import {Plus} from 'lucide-react';
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
      className={'flex flex-col h-screen w-screen bg-surface overflow-hidden select-none font-Nunito text-foreground'}>
      {/* Header bar */}
      <div className={'flex flex-row items-center justify-between py-3 px-4 gap-x-2 draggable'}>
        <div className="flex flex-row items-center flex-1 gap-x-2">
          <ChatRound className="text-semi-muted size-5 shrink-0" />
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
            className="flex-1 notDraggable"
            disabled={isLoginRequired || isSending}
            onChange={e => setInputText(e.target.value)}
          />
        </div>

        <div className="flex flex-row items-center gap-x-2 notDraggable">
          {activeCard && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary">
                  {activeCard.logoUrl && <img alt="" src={activeCard.logoUrl} className="size-3.5 shrink-0" />}
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
                        {card.logoUrl && <img alt="" src={card.logoUrl} className="size-4" />}
                        <span>{card.title}</span>
                      </div>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          <CloseButton onPress={() => spotlightChatIpc.closeSpotlight()} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Sidebar for Recents */}
        <div className="w-50 flex flex-col shrink-0 draggable bg-surface-secondary rounded-tr-2xl overflow-hidden">
          <div className={'flex items-center justify-between px-3 py-2 bg-surface/50 draggable'}>
            <span className="text-[8pt] font-bold text-semi-muted tracking-wider uppercase">Recents</span>
            {activeCardId === 'universal' ? (
              <Dropdown>
                <Dropdown.Trigger>
                  <Button size="sm" variant="ghost" className="size-7 notDraggable" isIconOnly>
                    <Plus className="size-3.5" />
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
              <Button
                size="sm"
                variant="ghost"
                className="notDraggable size-7"
                onPress={() => handleNewChat()}
                isIconOnly>
                <Plus className="size-3.5" />
              </Button>
            )}
          </div>

          <ScrollShadow className="flex-1 py-2 px-0.5 flex flex-col gap-y-0.5">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center py-8 draggable">
                <Spinner size="md" />
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-semi-muted draggable">No recent chats</div>
            ) : (
              chatHistory.map((item: any) => {
                const card = onlineCards.find(c => c.id === item.cardId);
                return (
                  <Button
                    className={
                      'justify-start text-xs transition-all h-7 shrink-0 rounded-xl ' +
                      `group notDraggable ${item.active ? 'bg-accent/10 text-accent font-semibold' : ''}`
                    }
                    size="sm"
                    variant="ghost"
                    key={`${item.cardId}-${item.index}`}
                    onPress={() => handleSelectThread(item.index, item.cardId)}
                    fullWidth>
                    {activeCardId === 'universal' && card?.logoUrl && (
                      <img alt="" src={card.logoUrl} className="size-3.5 rounded shrink-0" />
                    )}
                    {item.title || 'Untitled Chat'}
                  </Button>
                );
              })
            )}
          </ScrollShadow>
        </div>

        {/* Chat History View */}
        <div className="flex-1 flex flex-col overflow-hidden relative draggable">
          {isLoginRequired ? (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <div className="p-4 rounded-full bg-accent/5 mb-4">
                <UserId className="size-10 text-accent" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Authentication Required</h3>
              <p className="text-xs text-semi-muted max-w-xs mb-4">
                Please log in to your {currentCard?.title || 'AI'} account in LynxHub to enable chat access.
              </p>
              <Button size="sm" variant="primary" onPress={handleOpenLogin} className="font-semibold notDraggable">
                Login in LynxHub
                <ArrowRight />
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-8 draggable">
              <span className="text-xs text-semi-muted">Ask {currentCard?.title || 'AI'} anything to get started</span>
            </div>
          ) : (
            <ScrollShadow className="flex-1 p-4 flex flex-col gap-y-3">
              {messages.map((msg, index) => (
                <div
                  className={`flex flex-col max-w-[85%] notDraggable select-text ${
                    msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                  }`}
                  key={index}>
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user' ? 'bg-surface-secondary rounded-tr-md' : 'bg-content2 rounded-tl-md'
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
                    <span className="text-[10px] text-semi-muted">Thinking...</span>
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
