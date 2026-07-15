import {Avatar, Button} from '@heroui/react';
import {getCacheUrl, getFallbackString} from '@lynx_common/utils';
import {ChatRound, Earth, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {AltArrowLeft} from '@solar-icons/react-perf/Linear';
import {memo} from 'react';

import {ChatStep} from './useOnlineChat';

interface ChatTopBarProps {
  step: ChatStep;
  selectedCard: any;
  isPageLoaded: boolean;
  onBackToSelect: () => void;
  onShowWebpage: () => void;
  onGoToChat: () => void;
  onRefresh: () => void;
}

const ChatTopBar = memo(
  ({step, selectedCard, isPageLoaded, onBackToSelect, onShowWebpage, onGoToChat, onRefresh}: ChatTopBarProps) => {
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
