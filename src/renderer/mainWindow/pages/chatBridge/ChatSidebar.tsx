import {Avatar, Button, Checkbox, Dropdown, Label, Popover, ScrollShadow, SearchField} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound, Filter, Pin} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowDown, AltArrowLeft, AltArrowRight} from '@solar-icons/react-perf/Linear';
import {motion} from 'framer-motion';
import {Plus} from 'lucide-react';
import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';

interface ChatHistoryItem {
  index: number;
  title: string;
  active: boolean;
  cardId?: string;
}

interface ChatSidebarProps {
  chatHistory: ChatHistoryItem[];
  onSelectHistoryItem: (index: number, cardId?: string) => void;
  onNewChat?: (cardId?: string) => void;
  selectedCard: any;
  onlineCards: any[];
  visibleModuleIds: string[];
  onSetVisibleModuleIds: (ids: string[]) => void;
  isCollapsed: boolean;
  onToggleSidebar?: () => void;
  sidebarWidth: number;
  onResize: (newWidth: number) => void;
  pinnedThreads: string[];
  onTogglePin: (cardId: string, title: string) => void;
}

const ChatSidebar = memo(
  ({
    chatHistory,
    onSelectHistoryItem,
    onNewChat,
    selectedCard,
    onlineCards,
    visibleModuleIds,
    onSetVisibleModuleIds,
    isCollapsed,
    onToggleSidebar,
    sidebarWidth,
    onResize,
    pinnedThreads,
    onTogglePin,
  }: ChatSidebarProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedProviders, setCollapsedProviders] = useState<Record<string, boolean>>({});
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarWidthRef = useRef(sidebarWidth);
    useEffect(() => {
      sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    // Resizing implementation
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidthRef.current;

        const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const newWidth = Math.max(160, Math.min(450, startWidth + deltaX));
          if (sidebarRef.current) {
            sidebarRef.current.style.width = `${newWidth}px`;
            sidebarRef.current.style.transition = 'none';
          }
        };

        const handleMouseUp = (upEvent: globalThis.MouseEvent) => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);

          const deltaX = upEvent.clientX - startX;
          const finalWidth = Math.max(160, Math.min(450, startWidth + deltaX));

          if (sidebarRef.current) {
            sidebarRef.current.style.transition = '';
          }
          onResize(finalWidth);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },
      [onResize],
    );

    // Search and grouping logic
    const filteredHistory = useMemo(() => {
      if (!searchQuery.trim()) return chatHistory;
      const q = searchQuery.toLowerCase();
      return chatHistory.filter(item => item.title.toLowerCase().includes(q));
    }, [chatHistory, searchQuery]);

    const groupedHistory = useMemo(() => {
      const pinned: ChatHistoryItem[] = [];
      const unpinned: ChatHistoryItem[] = [];

      filteredHistory.forEach(item => {
        const cId = item.cardId || selectedCard?.id;
        const pinKey = `${cId}::${item.title}`;
        if (pinnedThreads.includes(pinKey)) {
          pinned.push(item);
        } else {
          unpinned.push(item);
        }
      });

      const groups: Record<string, ChatHistoryItem[]> = {};
      if (selectedCard?.id === 'unified') {
        unpinned.forEach(item => {
          const cId = item.cardId || 'unknown';
          if (!groups[cId]) groups[cId] = [];
          groups[cId].push(item);
        });
      }

      return {pinned, unpinned, groups};
    }, [filteredHistory, selectedCard, pinnedThreads]);

    // Flat list of display items for keyboard navigation index mapping
    const visibleItemsFlat = useMemo(() => {
      const flat: ChatHistoryItem[] = [];
      groupedHistory.pinned.forEach(item => flat.push(item));
      if (selectedCard?.id === 'unified') {
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
    }, [groupedHistory, selectedCard, onlineCards, collapsedProviders]);

    // Sync focusedIndex focus to DOM element
    useEffect(() => {
      if (focusedIndex >= 0 && focusedIndex < visibleItemsFlat.length) {
        const item = visibleItemsFlat[focusedIndex];
        const cId = item.cardId || selectedCard?.id;
        const el = document.getElementById(`cb-thread-${cId}-${item.index}`);
        el?.focus({preventScroll: false});
      }
    }, [focusedIndex, visibleItemsFlat, selectedCard]);

    // Keyboard handlers
    const handleKeyDown = useCallback(
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
            onSelectHistoryItem(item.index, item.cardId);
          }
        }
      },
      [visibleItemsFlat, focusedIndex, onSelectHistoryItem],
    );

    const toggleProviderCollapse = useCallback((cardId: string) => {
      setCollapsedProviders(prev => ({...prev, [cardId]: !prev[cardId]}));
    }, []);

    const renderThreadItem = (item: ChatHistoryItem) => {
      const isSelected = item.active;
      const cId = item.cardId || selectedCard?.id;
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
            'relative w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left shrink-0 ' +
            'transition duration-200 cursor-pointer overflow-hidden group ' +
            'focus-visible:outline-none focus:outline-none ' +
            `${isFocused || isSelected ? 'ring-2 ring-accent/30' : ''}`
          }
          key={`${cId}-${item.index}`}
          id={`cb-thread-${cId}-${item.index}`}
          onClick={() => onSelectHistoryItem(item.index, item.cardId)}>
          {isSelected && (
            <motion.div
              layoutId="active_chat_indicator"
              className="absolute inset-0 bg-accent-soft z-0"
              transition={{duration: 0.35, type: 'spring', stiffness: 380, damping: 30}}
            />
          )}

          {!isSelected && (
            <div
              className={
                'absolute inset-0 bg-foreground/5 opacity-0 ' +
                'group-hover:opacity-100 transition-opacity duration-150 rounded-xl'
              }
            />
          )}

          <div className="relative z-10 flex items-center gap-2 w-full overflow-hidden">
            {selectedCard?.id === 'unified' && card ? (
              <Avatar className="size-4 shrink-0 rounded-md">
                <Avatar.Image alt={card.title} src={getCacheUrl(card.logoUrl)} />
                <Avatar.Fallback className="text-[8px]">{getFallbackString(card.title)}</Avatar.Fallback>
              </Avatar>
            ) : (
              <ChatRound className={`size-4 shrink-0 ${isSelected ? 'text-accent-soft-foreground' : 'text-muted'}`} />
            )}
            <span
              className={
                'text-xs font-medium truncate transition-colors duration-150 flex-1 ' +
                `${isSelected ? 'text-accent-soft-foreground' : 'text-foreground'}`
              }>
              {item.title}
            </span>

            {/* Pin Toggle Action on Hover */}
            <button
              onClick={e => {
                e.stopPropagation();
                onTogglePin(cId, item.title);
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

    return (
      <div
        className={
          'bg-background/50 flex flex-col shrink-0 relative ' +
          'border-r border-border/10 transition-[width] duration-200 ease-in-out ' +
          `select-none focus:outline-none ${isCollapsed ? 'h-fit rounded-r-2xl mt-4' : 'h-full rounded-tr-2xl'}`
        }
        tabIndex={0}
        ref={sidebarRef}
        onKeyDown={handleKeyDown}
        style={{width: isCollapsed ? 52 : sidebarWidth, overflow: 'hidden'}}>
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2.5 pt-3 pb-2 px-2 shrink-0">
            {selectedCard?.id === 'unified' ? (
              <Dropdown>
                <Dropdown.Trigger>
                  <Button size="sm" variant="ghost" className="shrink-0" aria-label="New Chat" isIconOnly>
                    <Plus className="size-4" />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="right top" className="min-w-44 bg-surface-secondary border-border">
                  <Dropdown.Menu
                    onAction={key => {
                      if (onNewChat) onNewChat(String(key));
                    }}>
                    {onlineCards
                      .filter(c => c.id !== 'unified')
                      .map(c => (
                        <Dropdown.Item id={c.id} key={c.id} textValue={`New Chat on ${c.title}`}>
                          <Avatar className="size-4 shrink-0 rounded-md">
                            <Avatar.Image alt={c.title} src={getCacheUrl(c.logoUrl)} />
                            <Avatar.Fallback className="text-[8px]">{getFallbackString(c.title)}</Avatar.Fallback>
                          </Avatar>
                          <Label className="ml-2">{c.title}</Label>
                        </Dropdown.Item>
                      ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            ) : onNewChat ? (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                aria-label="New Chat"
                onPress={() => onNewChat()}
                isIconOnly>
                <Plus className="size-4" />
              </Button>
            ) : null}

            {onToggleSidebar && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                onPress={onToggleSidebar}
                aria-label="Expand sidebar"
                isIconOnly>
                <AltArrowRight className="size-4 text-semi-muted" />
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="px-2 pt-2 pb-1 flex items-center gap-x-1 shrink-0">
              {/* Search input field */}
              <SearchField
                variant="secondary"
                value={searchQuery}
                onChange={setSearchQuery}
                aria-label="Search chats"
                fullWidth>
                <SearchField.Group>
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search chats..." />
                  {searchQuery && <SearchField.ClearButton />}
                </SearchField.Group>
              </SearchField>

              {selectedCard?.id === 'unified' ? (
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button size="sm" variant="ghost" className="shrink-0" fullWidth>
                      <Plus className="size-4" />
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement="bottom start" className="min-w-44 bg-surface-secondary border-border">
                    <Dropdown.Menu
                      onAction={key => {
                        if (onNewChat) onNewChat(String(key));
                      }}>
                      {onlineCards
                        .filter(c => c.id !== 'unified')
                        .map(c => (
                          <Dropdown.Item id={c.id} key={c.id} textValue={`New Chat on ${c.title}`}>
                            <Avatar className="size-4 shrink-0 rounded-md">
                              <Avatar.Image alt={c.title} src={getCacheUrl(c.logoUrl)} />
                              <Avatar.Fallback className="text-[8px]">{getFallbackString(c.title)}</Avatar.Fallback>
                            </Avatar>
                            <Label className="ml-2">{c.title}</Label>
                          </Dropdown.Item>
                        ))}
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              ) : onNewChat ? (
                <Button size="sm" variant="ghost" className="shrink-0" onPress={() => onNewChat()} isIconOnly>
                  <Plus className="size-4" />
                </Button>
              ) : (
                <div className="flex items-center gap-2 py-1.5">
                  <ChatRound className="size-5 text-accent" />
                  <span className="font-bold text-foreground text-sm">Recents</span>
                </div>
              )}

              {selectedCard?.id === 'unified' && (
                <Popover>
                  <Popover.Trigger>
                    <Button size="sm" variant="tertiary" className="shrink-0" aria-label="Filter AIs" isIconOnly>
                      <Filter className="size-4 text-semi-muted" />
                    </Button>
                  </Popover.Trigger>
                  <Popover.Content>
                    <Popover.Dialog className="w-56 flex flex-col gap-2.5">
                      <div className="text-xs font-bold text-muted border-b border-border pb-1">Filter AI</div>
                      {onlineCards
                        .filter(c => c.id !== 'unified')
                        .map(c => {
                          const isVisible = visibleModuleIds.includes(c.id);

                          return (
                            <Checkbox
                              onChange={() => {
                                if (isVisible) {
                                  onSetVisibleModuleIds(visibleModuleIds.filter(id => id !== c.id));
                                } else {
                                  onSetVisibleModuleIds([...visibleModuleIds, c.id]);
                                }
                              }}
                              key={c.id}
                              variant="secondary"
                              isSelected={isVisible}
                              id={`filter-toggle-${c.id}`}
                              aria-label={`Show chats of ${c.title}`}
                              className="w-full cursor-pointer select-none">
                              <Checkbox.Content className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <Avatar className="size-4 shrink-0 rounded-md">
                                    <Avatar.Image alt={c.title} src={getCacheUrl(c.logoUrl)} />
                                    <Avatar.Fallback className="text-[8px]">
                                      {getFallbackString(c.title)}
                                    </Avatar.Fallback>
                                  </Avatar>
                                  <span className="text-xs font-medium text-foreground">{c.title}</span>
                                </div>
                                <Checkbox.Control>
                                  <Checkbox.Indicator />
                                </Checkbox.Control>
                              </Checkbox.Content>
                            </Checkbox>
                          );
                        })}
                    </Popover.Dialog>
                  </Popover.Content>
                </Popover>
              )}

              {onToggleSidebar && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  onPress={onToggleSidebar}
                  aria-label="Collapse sidebar"
                  isIconOnly>
                  <AltArrowLeft className="size-4 text-semi-muted" />
                </Button>
              )}
            </div>

            <ScrollShadow className="flex-1 p-2 flex flex-col gap-y-2 overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center h-40">
                  <span className="text-xs text-muted">No chats found</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Pinned Section */}
                  {groupedHistory.pinned.length > 0 && (
                    <div className="flex flex-col gap-y-0.5">
                      <div className="px-2 pb-1 text-[9px] font-bold text-accent uppercase tracking-wider">Pinned</div>
                      {groupedHistory.pinned.map(item => renderThreadItem(item))}
                    </div>
                  )}

                  {/* Recents / Groups Section */}
                  {selectedCard?.id === 'unified' ? (
                    onlineCards
                      .filter(c => c.id !== 'unified')
                      .map(card => {
                        const providerItems = groupedHistory.groups[card.id] || [];
                        if (providerItems.length === 0) return null;

                        const isCollapsed = collapsedProviders[card.id] ?? false;

                        return (
                          <div key={card.id} className="flex flex-col gap-y-0.5">
                            {/* Collapsible Provider Header */}
                            <button
                              className={
                                'flex items-center justify-between px-2 py-1 text-[9px] font-bold text-muted ' +
                                'hover:text-foreground uppercase tracking-wider ' +
                                'cursor-pointer w-full text-left font-Nunito'
                              }
                              onClick={() => toggleProviderCollapse(card.id)}>
                              <div className="flex items-center gap-1.5">
                                <Avatar className="size-3.5 shrink-0 rounded-sm">
                                  <Avatar.Image alt={card.title} src={getCacheUrl(card.logoUrl)} />
                                  <Avatar.Fallback className="text-[6px]">
                                    {getFallbackString(card.title)}
                                  </Avatar.Fallback>
                                </Avatar>
                                <span>{card.title}</span>
                              </div>
                              {isCollapsed ? <AltArrowRight className="size-3" /> : <AltArrowDown className="size-3" />}
                            </button>

                            {!isCollapsed && providerItems.map(item => renderThreadItem(item))}
                          </div>
                        );
                      })
                  ) : (
                    <div className="flex flex-col gap-y-0.5">
                      {groupedHistory.pinned.length > 0 && groupedHistory.unpinned.length > 0 && (
                        <div className="px-2 pb-1 text-[9px] font-bold text-muted uppercase tracking-wider">
                          Recents
                        </div>
                      )}
                      {groupedHistory.unpinned.map(item => renderThreadItem(item))}
                    </div>
                  )}
                </div>
              )}
            </ScrollShadow>

            {/* Resize drag handle */}
            <div
              className={
                'absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-accent/40 ' +
                'active:bg-accent transition-colors z-30'
              }
              onMouseDown={handleMouseDown}
            />
          </>
        )}
      </div>
    );
  },
);

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
