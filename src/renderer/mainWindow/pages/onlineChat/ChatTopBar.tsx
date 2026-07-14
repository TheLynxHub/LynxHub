import {Button} from '@heroui/react';
import {ChatRound, Earth} from '@solar-icons/react-perf/BoldDuotone';
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
}

const ChatTopBar = memo(
  ({step, selectedCard, isPageLoaded, onBackToSelect, onShowWebpage, onGoToChat}: ChatTopBarProps) => {
    return (
      <div className="h-12 inset-x-0 top-0 absolute bg-surface flex pl-4 pr-2 py-1 items-center justify-between z-10">
        {step === 'select_module' ? (
          <div className="flex items-center gap-x-2">
            <ChatRound className="size-5" />
            <span className="font-bold text-foreground text-sm">Online Chat</span>
          </div>
        ) : (
          <div className="flex items-center gap-x-2">
            <Button size="sm" variant="ghost" className="shrink-0" onPress={onBackToSelect} isIconOnly>
              <AltArrowLeft className="size-5" />
            </Button>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none">
                <span className="font-bold text-foreground text-sm">{selectedCard?.title}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {step === 'login' && !isPageLoaded && <span className="text-xs text-muted">Loading website...</span>}

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
