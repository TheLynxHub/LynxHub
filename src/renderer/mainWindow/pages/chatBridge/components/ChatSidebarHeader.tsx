import {Avatar, Button, Checkbox, Dropdown, Label, Popover, SearchField} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRoundIcon, FilterIcon} from '@solar-icons/react/bold-duotone';
import {AltArrowLeftIcon, AltArrowRightIcon} from '@solar-icons/react/linear';
import {Plus} from 'lucide-react';
import {memo} from 'react';

interface ChatSidebarHeaderProps {
  isCollapsed: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCard: any;
  onlineCards: any[];
  onNewChat?: (cardId?: string) => void;
  visibleModuleIds: string[];
  onSetVisibleModuleIds: (ids: string[]) => void;
  onToggleSidebar?: () => void;
}

export const ChatSidebarHeader = memo(
  ({
    isCollapsed,
    searchQuery,
    onSearchChange,
    selectedCard,
    onlineCards,
    onNewChat,
    visibleModuleIds,
    onSetVisibleModuleIds,
    onToggleSidebar,
  }: ChatSidebarHeaderProps) => {
    if (isCollapsed) {
      return (
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
              <AltArrowRightIcon className="size-4 text-semi-muted" />
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="px-2 pt-2 pb-1 flex items-center gap-x-1 shrink-0">
        {/* Search input field */}
        <SearchField
          variant="secondary"
          value={searchQuery}
          onChange={onSearchChange}
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
            <ChatRoundIcon className="size-5 text-accent" />
            <span className="font-bold text-foreground text-sm">Recents</span>
          </div>
        )}

        {selectedCard?.id === 'unified' && (
          <Popover>
            <Popover.Trigger>
              <Button size="sm" variant="tertiary" className="shrink-0" aria-label="Filter AIs" isIconOnly>
                <FilterIcon className="size-4 text-semi-muted" />
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

        {onToggleSidebar && (
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onPress={onToggleSidebar}
            aria-label="Collapse sidebar"
            isIconOnly>
            <AltArrowLeftIcon className="size-4 text-semi-muted" />
          </Button>
        )}
      </div>
    );
  },
);

ChatSidebarHeader.displayName = 'ChatSidebarHeader';
