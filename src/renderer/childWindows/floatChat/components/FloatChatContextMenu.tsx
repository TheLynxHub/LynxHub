import {Dropdown} from '@heroui/react';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {ChatRound, Copy, Earth, FileDownload} from '@solar-icons/react-perf/BoldDuotone';
import {memo, MouseEvent, useCallback, useState} from 'react';

interface FloatChatContextMenuProps {
  messages: any[];
  currentCard: any;
  currentCardId: string | null;
  setInputText: (text: string) => void;
  handleNewChat: (cardId?: string) => void;
  handleCopyToClipboard: (format: 'markdown' | 'text') => Promise<void>;
  handleSaveToFile: (format: 'markdown' | 'text') => Promise<void>;
  children: (onContextMenu: (e: MouseEvent<HTMLDivElement>) => void) => React.ReactNode;
}

export const FloatChatContextMenu = memo(
  ({
    messages,
    currentCard,
    currentCardId,
    setInputText,
    handleNewChat,
    handleCopyToClipboard,
    handleSaveToFile,
    children,
  }: FloatChatContextMenuProps) => {
    const [menuPosition, setMenuPosition] = useState<{x: number; y: number} | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectionText, setSelectionText] = useState('');

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
      [selectionText, setInputText, handleNewChat, handleCopyToClipboard, handleSaveToFile],
    );

    return (
      <>
        {children(handleContextMenu)}
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
      </>
    );
  },
);

FloatChatContextMenu.displayName = 'FloatChatContextMenu';
