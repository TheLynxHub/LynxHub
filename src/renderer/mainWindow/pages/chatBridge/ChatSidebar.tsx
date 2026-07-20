import {Avatar, ScrollShadow} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {AltArrowDown, AltArrowRight} from '@solar-icons/react-perf/Linear';
import {memo, useCallback, useEffect, useRef} from 'react';

import {ChatSidebarHeader} from './components/ChatSidebarHeader';
import {ChatThreadItem} from './components/ChatThreadItem';
import {ChatHistoryItem, useSidebarNavigation} from './hooks/useSidebarNavigation';

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
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarWidthRef = useRef(sidebarWidth);
    useEffect(() => {
      sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    const {
      searchQuery,
      setSearchQuery,
      collapsedProviders,
      focusedIndex,
      filteredHistory,
      groupedHistory,
      visibleItemsFlat,
      handleKeyDown,
      toggleProviderCollapse,
    } = useSidebarNavigation({
      chatHistory,
      selectedCard,
      onlineCards,
      pinnedThreads,
      onSelectHistoryItem,
    });

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
        <ChatSidebarHeader
          onNewChat={onNewChat}
          isCollapsed={isCollapsed}
          searchQuery={searchQuery}
          onlineCards={onlineCards}
          selectedCard={selectedCard}
          onSearchChange={setSearchQuery}
          onToggleSidebar={onToggleSidebar}
          visibleModuleIds={visibleModuleIds}
          onSetVisibleModuleIds={onSetVisibleModuleIds}
        />

        {!isCollapsed && (
          <>
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
                      {groupedHistory.pinned.map(item => (
                        <ChatThreadItem
                          item={item}
                          onlineCards={onlineCards}
                          onTogglePin={onTogglePin}
                          selectedCard={selectedCard}
                          focusedIndex={focusedIndex}
                          pinnedThreads={pinnedThreads}
                          visibleItemsFlat={visibleItemsFlat}
                          onSelectHistoryItem={onSelectHistoryItem}
                          key={`${item.cardId || selectedCard?.id}-${item.index}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Recents / Groups Section */}
                  {selectedCard?.id === 'unified' ? (
                    onlineCards
                      .filter(c => c.id !== 'unified')
                      .map(card => {
                        const providerItems = groupedHistory.groups[card.id] || [];
                        if (providerItems.length === 0) return null;

                        const isProviderCollapsed = collapsedProviders[card.id] ?? false;

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
                              {isProviderCollapsed ? (
                                <AltArrowRight className="size-3" />
                              ) : (
                                <AltArrowDown className="size-3" />
                              )}
                            </button>

                            {!isProviderCollapsed &&
                              providerItems.map(item => (
                                <ChatThreadItem
                                  item={item}
                                  onlineCards={onlineCards}
                                  onTogglePin={onTogglePin}
                                  selectedCard={selectedCard}
                                  focusedIndex={focusedIndex}
                                  pinnedThreads={pinnedThreads}
                                  visibleItemsFlat={visibleItemsFlat}
                                  onSelectHistoryItem={onSelectHistoryItem}
                                  key={`${item.cardId || card.id}-${item.index}`}
                                />
                              ))}
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
                      {groupedHistory.unpinned.map(item => (
                        <ChatThreadItem
                          item={item}
                          onlineCards={onlineCards}
                          onTogglePin={onTogglePin}
                          selectedCard={selectedCard}
                          focusedIndex={focusedIndex}
                          pinnedThreads={pinnedThreads}
                          visibleItemsFlat={visibleItemsFlat}
                          onSelectHistoryItem={onSelectHistoryItem}
                          key={`${item.cardId || selectedCard?.id}-${item.index}`}
                        />
                      ))}
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
