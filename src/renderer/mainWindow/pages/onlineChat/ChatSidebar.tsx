import {Avatar, Button, Checkbox, Dropdown, Label, Popover, ScrollShadow} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound, Filter, Pen2} from '@solar-icons/react-perf/BoldDuotone';
import {motion} from 'framer-motion';
import {memo} from 'react';

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
  }: ChatSidebarProps) => {
    return (
      <div className="w-60 h-full bg-background/50 flex flex-col shrink-0 rounded-tr-2xl">
        <div className="px-3.5 pt-3 pb-1 flex items-center justify-between gap-2 shrink-0">
          <div className="flex-1">
            {selectedCard?.id === 'universal' ? (
              <Dropdown>
                <Dropdown.Trigger>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 font-medium">
                    <Pen2 className="size-4" />
                    <span>New Chat</span>
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom start" className="min-w-44 bg-surface-secondary border-border">
                  <Dropdown.Menu
                    onAction={key => {
                      if (onNewChat) onNewChat(String(key));
                    }}>
                    {onlineCards
                      .filter(c => c.id !== 'universal')
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
                variant="secondary"
                onPress={() => onNewChat()}
                className="w-full flex items-center justify-center gap-2 font-medium">
                <Pen2 className="size-4" />
                <span>New Chat</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2 py-1.5">
                <ChatRound className="size-5 text-accent" />
                <span className="font-bold text-foreground text-sm">Recents</span>
              </div>
            )}
          </div>

          {selectedCard?.id === 'universal' && (
            <Popover>
              <Popover.Trigger>
                <Button size="sm" variant="ghost" className="shrink-0" aria-label="Filter AIs" isIconOnly>
                  <Filter className="size-4 text-semi-muted" />
                </Button>
              </Popover.Trigger>
              <Popover.Content>
                <Popover.Dialog className="w-56 flex flex-col gap-2.5">
                  <div className="text-xs font-bold text-muted border-b border-border pb-1">Filter AIs</div>
                  {onlineCards
                    .filter(c => c.id !== 'universal')
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
                                <Avatar.Fallback className="text-[8px]">{getFallbackString(c.title)}</Avatar.Fallback>
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
        </div>
        <ScrollShadow className="flex-1 p-2 flex flex-col gap-y-1 overflow-y-auto">
          {chatHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-6 text-center h-40">
              <span className="text-xs text-muted">No recent chats found</span>
            </div>
          ) : (
            chatHistory.map(item => {
              const isSelected = item.active;
              const card = onlineCards.find(c => c.id === item.cardId);

              return (
                <button
                  className={
                    'relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left shrink-0 ' +
                    'transition duration-200 cursor-pointer overflow-hidden group focus-visible:outline-none'
                  }
                  key={`${item.cardId}-${item.index}`}
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

                  <div className="relative z-10 flex items-center gap-2 w-full">
                    {selectedCard?.id === 'universal' && card ? (
                      <Avatar className="size-4 shrink-0 rounded-md">
                        <Avatar.Image alt={card.title} src={getCacheUrl(card.logoUrl)} />
                        <Avatar.Fallback className="text-[8px]">{getFallbackString(card.title)}</Avatar.Fallback>
                      </Avatar>
                    ) : (
                      <ChatRound
                        className={`size-4 shrink-0 ${isSelected ? 'text-accent-soft-foreground' : 'text-muted'}`}
                      />
                    )}
                    <span
                      className={
                        'text-xs font-medium truncate transition-colors duration-150 flex-1 ' +
                        `${isSelected ? 'text-accent-soft-foreground' : 'text-foreground'}`
                      }>
                      {item.title}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </ScrollShadow>
      </div>
    );
  },
);

ChatSidebar.displayName = 'ChatSidebar';

export default ChatSidebar;
