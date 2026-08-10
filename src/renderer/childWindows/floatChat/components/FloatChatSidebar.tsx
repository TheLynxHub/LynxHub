import {Button, Dropdown, ScrollShadow, SearchField} from '@heroui/react';
import storageIpc from '@lynx_shared/ipc/storage';
import {ChatRoundIcon, PinIcon} from '@solar-icons/react/bold-duotone';
import {AltArrowDownIcon, AltArrowLeftIcon, AltArrowRightIcon} from '@solar-icons/react/line-duotone';
import {Plus} from 'lucide-react';
import {Dispatch, memo, SetStateAction, useCallback, useEffect, useMemo, useRef} from 'react';

interface FloatChatSidebarProps {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  sidebarWidth: number;
  setSidebarWidth: Dispatch<SetStateAction<number>>;
  activeCardId: string;
  onlineCards: any[];
  chatHistory: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  pinnedThreads: string[];
  collapsedProviders: Record<string, boolean>;
  setCollapsedProviders: Dispatch<SetStateAction<Record<string, boolean>>>;
  focusedIndex: number;
  setFocusedIndex: Dispatch<SetStateAction<number>>;
  handleSelectThread: (index: number, cardId?: string) => void;
  handleNewChat: (cardId?: string) => void;
  handleTogglePin: (cardId: string, title: string) => void;
}

export const FloatChatSidebar = memo(
  ({
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    sidebarWidth,
    setSidebarWidth,
    activeCardId,
    onlineCards,
    chatHistory,
    searchQuery,
    setSearchQuery,
    pinnedThreads,
    collapsedProviders,
    setCollapsedProviders,
    focusedIndex,
    setFocusedIndex,
    handleSelectThread,
    handleNewChat,
    handleTogglePin,
  }: FloatChatSidebarProps) => {
    const floatSidebarRef = useRef<HTMLDivElement>(null);
    const sidebarWidthRef = useRef(sidebarWidth);

    useEffect(() => {
      sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
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
      },
      [setSidebarWidth],
    );

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
      [visibleItemsFlat, focusedIndex, handleSelectThread, setFocusedIndex],
    );

    const toggleProviderCollapse = useCallback(
      (cardId: string) => {
        setCollapsedProviders(prev => ({...prev, [cardId]: !prev[cardId]}));
      },
      [setCollapsedProviders],
    );

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
              <ChatRoundIcon className={`size-3.5 shrink-0 ${isSelected ? 'text-accent' : 'text-muted'}`} />
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
              <PinIcon className={`size-3 ${isPinned ? 'fill-accent' : ''}`} />
            </button>
          </div>
        </button>
      );
    };

    return (
      <div
        className={
          'flex flex-col shrink-0 draggable bg-surface-secondary overflow-hidden ' +
          'relative border-r border-border/10 transition-[width] duration-200 ease-in-out ' +
          `select-none focus:outline-none ${isSidebarCollapsed ? 'h-fit rounded-r-2xl mt-4' : 'rounded-tr-2xl h-full'}`
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
              <AltArrowRightIcon className="size-4 text-semi-muted" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 bg-surface/50 draggable shrink-0">
              <span className="text-[8pt] font-bold text-semi-muted tracking-wider uppercase">Recents</span>
              <div className="flex items-center gap-1">
                {activeCardId === 'unified' ? (
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
                  <AltArrowLeftIcon className="size-4 text-semi-muted" />
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
                      <div className="px-2 pb-1 text-[8px] font-bold text-accent uppercase tracking-wider">Pinned</div>
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
                                <AltArrowRightIcon className="size-3" />
                              ) : (
                                <AltArrowDownIcon className="size-3" />
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
    );
  },
);

FloatChatSidebar.displayName = 'FloatChatSidebar';
