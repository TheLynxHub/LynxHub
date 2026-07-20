import {Button, ScrollShadow} from '@heroui/react';
import BrowserViewPlaceholder from '@lynx/features/session/browser/BrowserViewPlaceholder';
import {ChatBubble, ChatSkeleton, TypingIndicatorBubble} from '@lynx_shared/components/ChatBubble';
import browserIpc from '@lynx_shared/ipc/browser';
import {Earth} from '@solar-icons/react-perf/BoldDuotone';
import {memo, RefObject} from 'react';

interface FloatChatAreaProps {
  step: 'chat' | 'login';
  moduleState: any;
  currentCardId: string | null;
  currentCard: any;
  isHistoryLoading: boolean;
  messages: any[];
  isGenerating: boolean;
  chatBridgeMaxWidth: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
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
    chatBridgeMaxWidth,
    scrollRef,
    contentRef,
    messagesEndRef,
    handleScroll,
  }: FloatChatAreaProps) => {
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
          <ScrollShadow ref={scrollRef} onScroll={handleScroll} className="flex-1 w-full notDraggable">
            <div
              className={`${
                chatBridgeMaxWidth === 'small'
                  ? 'max-w-2xl'
                  : chatBridgeMaxWidth === 'wide'
                    ? 'max-w-6xl'
                    : chatBridgeMaxWidth === 'full'
                      ? 'max-w-full'
                      : 'max-w-4xl'
              } mx-auto w-full flex flex-col gap-y-3 flex-1 p-4`}
              ref={contentRef}>
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
        )}
      </div>
    );
  },
);

FloatChatArea.displayName = 'FloatChatArea';
