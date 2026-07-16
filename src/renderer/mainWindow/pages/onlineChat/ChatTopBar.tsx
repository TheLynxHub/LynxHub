import {Avatar, Button, Dropdown, Label} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound, Copy, Earth, FileDownload, Pen2, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowDown, AltArrowUp} from '@solar-icons/react-perf/Linear';
import {AltArrowLeft, ArrowRightUp} from '@solar-icons/react-perf/LineDuotone';
import {memo} from 'react';

import AnimateChild from '../../components/AnimateChild';
import LynxTooltip from '../../components/LynxTooltip';
import {ChatStep, Message} from './useOnlineChat';

interface ChatTopBarProps {
  step: ChatStep;
  selectedCard: any;
  isPageLoaded: boolean;
  onBackToSelect: () => void;
  onShowWebpage: () => void;
  onGoToChat: () => void;
  onRefresh: () => void;
  messages: Message[];
  onCopyToClipboard: (format: 'markdown' | 'text') => void;
  onSaveToFile: (format: 'markdown' | 'text') => void;
  onNewChat?: () => void;
  showScrollTop?: boolean;
  showScrollBottom?: boolean;
  onScrollTop?: () => void;
  onScrollBottom?: () => void;
}

const ChatTopBar = memo(
  ({
    step,
    selectedCard,
    isPageLoaded,
    onBackToSelect,
    onShowWebpage,
    onGoToChat,
    onRefresh,
    messages,
    onCopyToClipboard,
    onSaveToFile,
    onNewChat,
    showScrollTop,
    showScrollBottom,
    onScrollTop,
    onScrollBottom,
  }: ChatTopBarProps) => {
    return (
      <div className="h-12 inset-x-0 top-0 absolute bg-surface flex pl-4 pr-2 py-1 items-center justify-between z-10">
        {step === 'select_module' ? (
          <div className="flex items-center gap-x-2">
            <ChatRound className="size-5" />
            <span className="font-bold text-foreground text-sm">Online Chat</span>
          </div>
        ) : (
          <div className="flex items-center gap-x-1">
            <Button size="sm" variant="ghost" className="shrink-0" onPress={onBackToSelect} isIconOnly>
              <AltArrowLeft className="size-5" />
            </Button>
            <div className="flex items-center gap-x-2">
              <Avatar className="size-9 shrink-0">
                <Avatar.Image alt={selectedCard.title} src={getCacheUrl(selectedCard.logoUrl)} />
                <Avatar.Fallback>{getFallbackString(selectedCard.title)}</Avatar.Fallback>
              </Avatar>
              <div className="flex items-center gap-2 leading-none">
                <span className="font-bold text-foreground text-sm">{selectedCard?.title}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {step === 'login' && !isPageLoaded && <span className="text-xs text-muted">Loading website...</span>}

          {step === 'login' && (
            <Button size="sm" variant="ghost" onPress={onRefresh} aria-label="Reload page" isIconOnly>
              <Restart className="size-4" />
            </Button>
          )}

          {step === 'chat' && selectedCard?.onlineConfig?.newChat && (
            <Button size="sm" variant="ghost" onPress={onNewChat} aria-label="Start new chat" isIconOnly>
              <Pen2 className="size-4" />
            </Button>
          )}

          {step === 'chat' && messages.length > 0 && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="ghost" className="shrink-0" aria-label="Export chat" isIconOnly>
                  <ArrowRightUp className="size-4" />
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="min-w-48 bg-surface-secondary border-border">
                <Dropdown.Menu
                  onAction={key => {
                    if (key === 'copy-markdown') onCopyToClipboard('markdown');
                    if (key === 'copy-text') onCopyToClipboard('text');
                    if (key === 'save-markdown') onSaveToFile('markdown');
                    if (key === 'save-text') onSaveToFile('text');
                  }}>
                  <Dropdown.Item id="copy-markdown" textValue="Copy as Markdown">
                    <Copy className="size-4 text-muted" />
                    <Label>Copy as Markdown</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="copy-text" textValue="Copy as Plain Text">
                    <Copy className="size-4 text-muted" />
                    <Label>Copy as Plain Text</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="save-markdown" textValue="Save as Markdown (.md)">
                    <FileDownload className="size-4 text-muted" />
                    <Label>Save as Markdown (.md)</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="save-text" textValue="Save as Plain Text (.txt)">
                    <FileDownload className="size-4 text-muted" />
                    <Label>Save as Plain Text (.txt)</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          {step === 'chat' && (
            <>
              <AnimateChild show={!!showScrollTop}>
                <LynxTooltip delay={500} content="Scroll to top">
                  <Button size="sm" variant="ghost" onPress={onScrollTop} aria-label="Scroll to top" isIconOnly>
                    <AltArrowUp className="size-4" />
                  </Button>
                </LynxTooltip>
              </AnimateChild>

              <AnimateChild show={!!showScrollBottom}>
                <LynxTooltip delay={500} content="Scroll to bottom">
                  <Button size="sm" variant="ghost" onPress={onScrollBottom} aria-label="Scroll to bottom" isIconOnly>
                    <AltArrowDown className="size-4" />
                  </Button>
                </LynxTooltip>
              </AnimateChild>
            </>
          )}

          {step !== 'select_module' && (
            <Button
              size="sm"
              onPress={step === 'chat' ? onShowWebpage : onGoToChat}
              className="w-18 bg-accent-soft hover:bg-accent/30 text-accent-soft-foreground">
              {step === 'chat' ? <Earth className="size-4" /> : <ChatRound className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

ChatTopBar.displayName = 'ChatTopBar';

export default ChatTopBar;
