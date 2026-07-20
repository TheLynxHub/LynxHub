import {Button, InputGroup, ScrollShadow, TextField} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {ChatBubble, ChatSkeleton, TypingIndicatorBubble} from '@lynx_shared/components/ChatBubble';
import browserIpc from '@lynx_shared/ipc/browser';
import {Earth} from '@solar-icons/react-perf/BoldDuotone';
import {Send} from 'lucide-react';
import {Dispatch, KeyboardEvent, memo, RefObject, SetStateAction, useMemo} from 'react';

const maxWidthMap: Record<string, {messages: string; input: string}> = {
  small: {messages: 'max-w-2xl', input: 'max-w-xl'},
  default: {messages: 'max-w-4xl', input: 'max-w-3xl'},
  wide: {messages: 'max-w-6xl', input: 'max-w-5xl'},
  full: {messages: 'max-w-full', input: 'max-w-full'},
};

interface FloatChatAreaProps {
  step: 'chat' | 'login';
  moduleState: any;
  currentCardId: string | null;
  currentCard: any;
  isHistoryLoading: boolean;
  messages: any[];
  isGenerating: boolean;
  isSending?: boolean;
  chatBridgeMaxWidth: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
  inputText?: string;
  setInputText?: Dispatch<SetStateAction<string>> | ((text: string) => void);
  handleKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSend?: () => void;
}

export const FloatChatArea = memo(
  ({
    step,
    moduleState,
    currentCardId,
    currentCard,
    isHistoryLoading,
    messages,
    isGenerating,
    isSending = false,
    chatBridgeMaxWidth,
    scrollRef,
    contentRef,
    messagesEndRef,
    handleScroll,
    inputText,
    setInputText,
    handleKeyDown,
    handleSend,
  }: FloatChatAreaProps) => {
    const widthClasses = useMemo(() => maxWidthMap[chatBridgeMaxWidth] || maxWidthMap.default, [chatBridgeMaxWidth]);

    return (
      <div className="flex-1 flex flex-col overflow-hidden relative draggable">
        {step === 'login' ? (
          <div className="flex size-full flex-col overflow-hidden bg-white notDraggable">
            <div className="flex-1 relative w-full bg-white">
              {moduleState?.activeWindow === 'main' ? (
                <div
                  className={
                    'absolute inset-0 flex flex-col items-center ' +
                    'justify-center p-6 bg-surface text-center draggable'
                  }>
                  <Earth className="size-12 text-semi-muted mb-4 animate-pulse notDraggable" />
                  <h3 className="text-base font-semibold mb-2 draggable">Webview is Active in Main Window</h3>
                  <p className="text-xs text-semi-muted max-w-sm mb-6 draggable">
                    The interactive webview for this AI module is currently active in the main app window.
                  </p>
                  <Button
                    onPress={() => {
                      if (currentCardId) {
                        browserIpc.send.setVisible(`online-bg-${currentCardId}`, true);
                      }
                    }}
                    size="sm"
                    variant="primary"
                    className="notDraggable">
                    Bring Webview Here
                  </Button>
                </div>
              ) : (
                <BrowserViewPlaceholder />
              )}
            </div>
          </div>
        ) : isHistoryLoading ? (
          <div className="p-4 flex-1 overflow-hidden notDraggable">
            <ChatSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center p-8 draggable">
            <span className="text-xs text-semi-muted">Ask {currentCard?.title || 'AI'} anything to get started</span>
          </div>
        ) : (
          <>
            <ScrollShadow ref={scrollRef} onScroll={handleScroll} className="flex-1 w-full notDraggable">
              <div
                ref={contentRef}
                className={`${widthClasses.messages} mx-auto w-full flex flex-col gap-y-3 flex-1 p-4`}>
                <div className="space-y-4 flex-1">
                  {messages.map((msg, index) => (
                    <ChatBubble
                      key={index}
                      message={msg}
                      isGenerating={isGenerating}
                      isLast={index === messages.length - 1}
                    />
                  ))}
                  {isGenerating && messages[messages.length - 1]?.sender === 'user' && <TypingIndicatorBubble />}
                </div>
                <div ref={messagesEndRef} />
              </div>
            </ScrollShadow>

            {inputText !== undefined && setInputText && handleKeyDown && (
              <div className="p-4 bg-surface shrink-0 notDraggable">
                <TextField name="message" aria-label="Message input" className={`${widthClasses.input} mx-auto w-full`}>
                  <InputGroup variant="secondary" className="p-2 rounded-2xl" fullWidth>
                    <InputGroup.TextArea
                      rows={1}
                      value={inputText}
                      className="max-h-32"
                      onKeyDown={handleKeyDown}
                      onChange={e => setInputText(e.target.value)}
                      placeholder={currentCard ? `Message ${currentCard.title}...` : 'Message...'}
                      autoFocus
                    />
                    {handleSend && (
                      <InputGroup.Suffix className="p-0.5 shrink-0 self-end">
                        <Button
                          variant="primary"
                          className="shrink-0"
                          onPress={handleSend}
                          isDisabled={!inputText.trim() || isSending || isGenerating}
                          isIconOnly>
                          <Send />
                        </Button>
                      </InputGroup.Suffix>
                    )}
                  </InputGroup>
                </TextField>
              </div>
            )}
          </>
        )}
      </div>
    );
  },
);

FloatChatArea.displayName = 'FloatChatArea';
