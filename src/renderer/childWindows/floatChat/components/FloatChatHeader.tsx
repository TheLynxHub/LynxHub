import {Button, CloseButton, Dropdown, InputGroup} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import floatChatIpc from '@lynx_shared/ipc/floatChat';
import {ChatRound, Earth, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {Dispatch, KeyboardEvent, memo, SetStateAction} from 'react';

interface FloatChatHeaderProps {
  step: 'chat' | 'login';
  setStep: Dispatch<SetStateAction<'chat' | 'login'>>;
  isLoginRequired: boolean;
  currentCard: any;
  currentCardId: string | null;
  activeCard: any;
  activeCardId: string;
  setActiveCardId: Dispatch<SetStateAction<string>>;
  onlineCards: any[];
  inputText: string;
  setInputText: (text: string) => void;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  hasMessages?: boolean;
}

export const FloatChatHeader = memo(
  ({
    step,
    setStep,
    isLoginRequired,
    currentCard,
    currentCardId,
    activeCard,
    activeCardId,
    setActiveCardId,
    onlineCards,
    inputText,
    setInputText,
    handleKeyDown,
    hasMessages = false,
  }: FloatChatHeaderProps) => {
    return (
      <div className="flex flex-row items-center justify-between py-3 px-4 gap-x-2 draggable">
        <div className="flex flex-row items-center flex-1 gap-x-2">
          <ChatRound className="text-semi-muted size-5 shrink-0 mb-0.5" />
          {step === 'chat' ? (
            !hasMessages ? (
              <InputGroup variant="secondary" className="rounded-2xl notDraggable" fullWidth>
                <InputGroup.TextArea
                  placeholder={
                    isLoginRequired
                      ? `Login required for ${currentCard?.title || 'AI'}`
                      : `Message ${currentCard?.title || 'AI'}...`
                  }
                  rows={1}
                  value={inputText}
                  className="max-h-32"
                  onKeyDown={handleKeyDown}
                  onChange={e => setInputText(e.target.value)}
                  autoFocus
                />
              </InputGroup>
            ) : (
              <span className="text-[0.9rem] font-semibold">{currentCard?.title || activeCard?.title || 'AI'}</span>
            )
          ) : activeCard ? (
            <span className="text-[0.9rem] font-semibold">{activeCard.title}</span>
          ) : null}
        </div>

        <div className="flex flex-row items-center gap-x-2 notDraggable">
          {activeCard && step === 'chat' && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary">
                  {activeCard.logoUrl ? (
                    <img alt="" className="size-4" src={activeCard.logoUrl} />
                  ) : activeCard.title === 'Unified Chat' ? (
                    <ChatRound className="size-4" />
                  ) : (
                    <div className="hidden" />
                  )}
                  {activeCard.title}
                </Button>
              </Dropdown.Trigger>
              <Dropdown.Popover className="bg-surface-secondary notDraggable">
                <Dropdown.Menu aria-label="AI Selector">
                  {onlineCards.map(card => (
                    <Dropdown.Item
                      onPress={() => {
                        setActiveCardId(card.id);
                        floatChatIpc.setActiveCard(card.id);
                      }}
                      key={card.id}
                      className="flex flex-row items-center text-xs">
                      <div className="flex items-center gap-x-2">
                        {card.logoUrl ? (
                          <img alt="" src={card.logoUrl} className="size-4" />
                        ) : card.title === 'Unified Chat' ? (
                          <ChatRound className="size-4" />
                        ) : (
                          <div className="hidden" />
                        )}
                        {card.title}
                      </div>
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}

          {activeCard && activeCardId !== 'unified' && (
            <div className="flex flex-row items-center gap-x-1.5">
              {step === 'login' && (
                <Button
                  onPress={() => {
                    if (currentCardId) {
                      browserIpc.send.reload(`online-bg-${currentCardId}`);
                    }
                  }}
                  size="sm"
                  variant="secondary"
                  isIconOnly>
                  <Restart className="size-4 text-semi-muted" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setStep(prev => (prev === 'chat' ? 'login' : 'chat'))}
                isIconOnly>
                {step === 'chat' ? (
                  <Earth className="size-4 text-semi-muted" />
                ) : (
                  <ChatRound className="size-4 text-semi-muted" />
                )}
              </Button>
            </div>
          )}

          <CloseButton onPress={() => floatChatIpc.closeFloatChat()} />
        </div>
      </div>
    );
  },
);

FloatChatHeader.displayName = 'FloatChatHeader';
