import {Button, CloseButton, Dropdown, InputGroup} from '@heroui/react';
import browserIpc from '@lynx_shared/ipc/browser';
import floatChatIpc from '@lynx_shared/ipc/floatChat';
<<<<<<< HEAD
import {ChatRound, Earth, Restart} from '@solar-icons/react-perf/BoldDuotone';
import {Dispatch, KeyboardEvent, memo, SetStateAction} from 'react';
=======
import {ChatRoundIcon, EarthIcon, RestartIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {AltArrowDownIcon} from '@solar-icons/react/linear';
import {Dispatch, KeyboardEvent, memo, RefObject, SetStateAction} from 'react';
>>>>>>> a4ea0969 (refactor(icons): migrate solar icons to v2)

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
          <ChatRoundIcon className="text-semi-muted size-5 shrink-0 mb-0.5" />
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
<<<<<<< HEAD
=======
          {activeCard &&
            step === 'chat' &&
            availableModels &&
            availableModels.length > 0 &&
            (() => {
              const baseModels = availableModels.filter(
                (m: any) => !m.isExtended && !m.title.toLowerCase().includes('extended'),
              );
              const extendedModels = availableModels.filter(
                (m: any) => m.isExtended || m.title.toLowerCase().includes('extended'),
              );

              return (
                <Dropdown>
                  <Dropdown.Trigger>
                    <Button size="sm" variant="secondary" className="gap-x-1 font-semibold text-xs h-8">
                      <span className="text-accent text-xs">✦</span>
                      <span className="truncate max-w-28">
                        {activeModel || baseModels.find((m: any) => m.active)?.title || availableModels[0]?.title}
                      </span>
                      <AltArrowDownIcon className="size-3.5 opacity-60 shrink-0" />
                    </Button>
                  </Dropdown.Trigger>
                  <Dropdown.Popover className="bg-surface-secondary notDraggable min-w-44 border border-border">
                    <Dropdown.Menu
                      onAction={key => {
                        if (onSelectModel && key) {
                          onSelectModel(String(key), currentCardId || activeCardId);
                        }
                      }}
                      aria-label="Model Selector">
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
                                <Label
                                  className={isItemActive ? 'font-bold text-accent' : 'font-medium text-foreground'}>
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
                                <Label
                                  className={isItemActive ? 'font-bold text-accent' : 'font-medium text-foreground'}>
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
              );
            })()}

>>>>>>> a4ea0969 (refactor(icons): migrate solar icons to v2)
          {activeCard && step === 'chat' && (
            <Dropdown>
              <Dropdown.Trigger>
                <Button size="sm" variant="secondary">
                  {activeCard.logoUrl ? (
                    <img alt="" className="size-4" src={activeCard.logoUrl} />
                  ) : activeCard.title === 'Unified Chat' ? (
                    <ChatRoundIcon className="size-4" />
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
                          <ChatRoundIcon className="size-4" />
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
                  <RestartIcon className="size-4 text-semi-muted" />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onPress={() => setStep(prev => (prev === 'chat' ? 'login' : 'chat'))}
                isIconOnly>
                {step === 'chat' ? (
                  <EarthIcon className="size-4 text-semi-muted" />
                ) : (
                  <ChatRoundIcon className="size-4 text-semi-muted" />
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
