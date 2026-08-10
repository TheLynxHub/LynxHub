import {Avatar, Button, Dropdown, Label} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
<<<<<<< HEAD
import {ChatRound, Copy, Diskette, Earth, FileDownload, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowDown, AltArrowUp} from '@solar-icons/react-perf/Linear';
import {AltArrowLeft} from '@solar-icons/react-perf/LineDuotone';
=======
import {
  ChatRoundIcon,
  CopyIcon,
  DisketteIcon,
  EarthIcon,
  FileDownloadIcon,
  RestartIcon,
} from '@solar-icons/react/bold-duotone';
import {AltArrowLeftIcon, CheckReadIcon} from '@solar-icons/react/line-duotone';
import {AltArrowDownIcon, AltArrowUpIcon} from '@solar-icons/react/linear';
>>>>>>> a4ea0969 (refactor(icons): migrate solar icons to v2)
import {memo} from 'react';

import AnimateChild from '../../components/AnimateChild';
import LynxTooltip from '../../components/LynxTooltip';
import {ChatStep, Message} from './useChatBridge';

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
  showScrollTop?: boolean;
  showScrollBottom?: boolean;
  onScrollTop?: () => void;
  onScrollBottom?: () => void;
  activeUnifiedCardId?: string | null;
  onlineCards?: any[];
  bgChatEnabledCards?: string[];
  onSelectActiveCard?: (id: string | null) => void;
  showBackButton?: boolean;
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
    showScrollTop,
    showScrollBottom,
    onScrollTop,
    onScrollBottom,
    activeUnifiedCardId,
    onlineCards,
    bgChatEnabledCards = [],
    onSelectActiveCard,
    showBackButton = true,
  }: ChatTopBarProps) => {
    const activeCard =
      selectedCard?.id === 'unified' ? onlineCards?.find(c => c.id === activeUnifiedCardId) : selectedCard;

    const activeCardPill =
      selectedCard?.id === 'unified' && activeCard ? (
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              className={
                'h-7 px-2.5 border border-border bg-foreground/5 rounded-full ' +
                'flex items-center gap-x-1.5 hover:bg-foreground/10 text-muted ' +
                'font-semibold text-[10px] leading-none shrink-0'
              }
              size="sm"
              variant="ghost"
              aria-label="Select Active AI">
              <Avatar className="size-4 shrink-0 rounded-md">
                <Avatar.Image alt={activeCard.title} src={getCacheUrl(activeCard.logoUrl)} />
                <Avatar.Fallback className="text-[8px]">{getFallbackString(activeCard.title)}</Avatar.Fallback>
              </Avatar>
              <span>{activeCard.title}</span>
              <AltArrowDownIcon className="size-3.5 opacity-60 shrink-0" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-44 bg-surface-secondary border-border">
            <Dropdown.Menu
              onAction={key => {
                if (onSelectActiveCard && key) {
                  onSelectActiveCard(String(key));
                }
              }}>
              {onlineCards
                ?.filter(c => c.id !== 'unified' && bgChatEnabledCards.includes(c.id))
                .map(c => (
                  <Dropdown.Item id={c.id} key={c.id} textValue={c.title}>
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
      ) : null;

<<<<<<< HEAD
=======
    const baseModels = availableModels.filter((m: any) => !m.isExtended && !m.title.toLowerCase().includes('extended'));
    const extendedModels = availableModels.filter(
      (m: any) => m.isExtended || m.title.toLowerCase().includes('extended'),
    );

    const modelPickerPill =
      step === 'chat' && activeCard && availableModels && availableModels.length > 0 ? (
        <Dropdown>
          <Dropdown.Trigger>
            <Button
              className={
                'h-7 px-2.5 border border-border bg-foreground/5 rounded-full ' +
                'flex items-center gap-x-1.5 hover:bg-foreground/10 text-foreground ' +
                'font-semibold text-[10px] leading-none shrink-0'
              }
              size="sm"
              variant="ghost"
              aria-label="Select Model">
              <span className="text-accent text-xs">✦</span>
              <span className="truncate max-w-28">
                {activeModel || baseModels.find((m: any) => m.active)?.title || availableModels[0]?.title}
              </span>
              <AltArrowDownIcon className="size-3.5 opacity-60 shrink-0" />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Popover placement="bottom start" className="min-w-48 bg-surface-secondary border-border">
            <Dropdown.Menu
              onAction={key => {
                if (onSelectModel && key) {
                  onSelectModel(String(key), activeCard.id);
                }
              }}>
              {baseModels.map((m: any) => {
                const isItemActive = Boolean(
                  m.active ||
                  (activeModel &&
                    (activeModel.toLowerCase() === m.title.toLowerCase() ||
                      activeModel.toLowerCase().startsWith(m.title.toLowerCase()) ||
                      m.title.toLowerCase().startsWith(
                        activeModel
                          .toLowerCase()
                          .replace(/\s*\([^)]*\)$/i, '')
                          .trim(),
                      ))),
                );
                return (
                  <Dropdown.Item
                    id={m.title}
                    key={m.title}
                    textValue={m.title}
                    className={isItemActive ? 'bg-accent/10' : ''}>
                    <div className="flex items-center justify-between w-full gap-x-3 py-0.5">
                      <div className="flex flex-col min-w-0">
                        <Label className={isItemActive ? 'font-bold text-accent' : 'font-medium text-foreground'}>
                          {m.title}
                        </Label>
                        {m.description && (
                          <span className="text-[10px] text-muted-foreground opacity-80 font-normal">
                            {m.description}
                          </span>
                        )}
                      </div>
                      {isItemActive && <CheckReadIcon className="size-4 text-accent shrink-0" />}
                    </div>
                  </Dropdown.Item>
                );
              })}

              {extendedModels.length > 0 && <Separator className="my-1 border-t border-border/60" />}

              {extendedModels.map((m: any) => {
                const isItemActive = Boolean(
                  m.active ||
                  (activeModel &&
                    (activeModel.toLowerCase() === m.title.toLowerCase() ||
                      activeModel.toLowerCase().includes('extended') ||
                      activeModel.toLowerCase().includes('thinking'))),
                );
                return (
                  <Dropdown.Item
                    id={m.title}
                    key={m.title}
                    textValue={m.title}
                    className={isItemActive ? 'bg-accent/10' : ''}>
                    <div className="flex items-center justify-between w-full gap-x-3 py-0.5">
                      <div className="flex flex-col min-w-0">
                        <Label className={isItemActive ? 'font-bold text-accent' : 'font-medium text-foreground'}>
                          {m.title}
                        </Label>
                        {m.description && (
                          <span className="text-[10px] text-muted-foreground opacity-80 font-normal">
                            {m.description}
                          </span>
                        )}
                      </div>
                      {isItemActive && <CheckReadIcon className="size-4 text-accent shrink-0" />}
                    </div>
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      ) : null;

>>>>>>> a4ea0969 (refactor(icons): migrate solar icons to v2)
    return (
      <div className="h-12 inset-x-0 top-0 absolute bg-surface flex pl-4 pr-2 py-1 items-center justify-between z-10">
        {step === 'select_module' ? (
          <div className="flex items-center gap-x-2">
            <ChatRoundIcon className="size-5" />
            <span className="font-bold text-foreground text-sm">Chat Bridge</span>
          </div>
        ) : (
          <div className="flex items-center gap-x-1">
            {showBackButton && (
              <Button size="sm" variant="ghost" className="shrink-0" onPress={onBackToSelect} isIconOnly>
                <AltArrowLeftIcon className="size-5" />
              </Button>
            )}
            <div className="flex items-center gap-x-3">
              {selectedCard.id === 'unified' ? (
                <div className="flex items-center gap-x-2">
                  <div className="p-1.5 bg-surface-tertiary rounded-lg">
                    <ChatRoundIcon className="size-4 text-white" />
                  </div>
                  <span className="font-extrabold text-foreground text-sm leading-none">Unified Chat</span>
                </div>
              ) : (
                <div className="flex items-center gap-x-2">
                  <Avatar className="size-9 shrink-0">
                    <Avatar.Image alt={selectedCard.title} src={getCacheUrl(selectedCard.logoUrl)} />
                    <Avatar.Fallback>{getFallbackString(selectedCard.title)}</Avatar.Fallback>
                  </Avatar>
                  <span className="font-bold text-foreground text-sm leading-none">{selectedCard?.title}</span>
                </div>
              )}

              {activeCardPill}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {step === 'login' && !isPageLoaded && <span className="text-xs text-muted">Loading website...</span>}

          {step === 'login' && (
            <Button size="sm" variant="ghost" onPress={onRefresh} aria-label="Reload page" isIconOnly>
              <RestartIcon className="size-4" />
            </Button>
          )}

          {step === 'chat' && messages.length > 0 && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="ghost" className="shrink-0" aria-label="Export chat" isIconOnly>
                  <DisketteIcon className="size-4" />
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
                    <CopyIcon className="size-4 text-muted" />
                    <Label>Copy as Markdown</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="copy-text" textValue="Copy as Plain Text">
                    <CopyIcon className="size-4 text-muted" />
                    <Label>Copy as Plain Text</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="save-markdown" textValue="Save as Markdown (.md)">
                    <FileDownloadIcon className="size-4 text-muted" />
                    <Label>Save as Markdown (.md)</Label>
                  </Dropdown.Item>
                  <Dropdown.Item id="save-text" textValue="Save as Plain Text (.txt)">
                    <FileDownloadIcon className="size-4 text-muted" />
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
                    <AltArrowUpIcon className="size-4" />
                  </Button>
                </LynxTooltip>
              </AnimateChild>

              <AnimateChild show={!!showScrollBottom}>
                <LynxTooltip delay={500} content="Scroll to bottom">
                  <Button size="sm" variant="ghost" onPress={onScrollBottom} aria-label="Scroll to bottom" isIconOnly>
                    <AltArrowDownIcon className="size-4" />
                  </Button>
                </LynxTooltip>
              </AnimateChild>
            </>
          )}

          {step !== 'select_module' && (selectedCard.id !== 'unified' || activeCard) && (
            <Button
              size="sm"
              onPress={step === 'chat' ? onShowWebpage : onGoToChat}
              className="w-18 bg-accent-soft hover:bg-accent/30 text-accent-soft-foreground">
              {step === 'chat' ? <EarthIcon className="size-4" /> : <ChatRoundIcon className="size-4" />}
            </Button>
          )}
        </div>
      </div>
    );
  },
);

ChatTopBar.displayName = 'ChatTopBar';

export default ChatTopBar;
