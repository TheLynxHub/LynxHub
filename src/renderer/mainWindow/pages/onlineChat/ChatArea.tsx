import 'flowtoken/dist/styles.css';

import {Button, InputGroup, ScrollShadow, TextField} from '@heroui/react';
import {ChatBubble, ChatSkeleton, TypingIndicatorBubble} from '@lynx_shared/components/ChatBubble';
import {ChatRound} from '@solar-icons/react-perf/BoldDuotone';
import {Send} from 'lucide-react';
import {KeyboardEvent, memo, useCallback, useEffect, useRef, useState} from 'react';

import {Message} from './useOnlineChat';

interface ChatAreaProps {
  selectedCard: any;
  messages: Message[];
  isSending: boolean;
  isGenerating: boolean;
  onSendMessage: (messageText: string) => void;
  chatAreaRef?: React.RefObject<{
    scrollToTop: () => void;
    scrollToBottom: () => void;
  } | null>;
  onScrollStateChange?: (showTop: boolean, showBottom: boolean) => void;
  isHistoryLoading?: boolean;
  initialInput?: string;
  onConsumedInitialInput?: () => void;
  activeCard?: any;
}

const ChatArea = memo(
  ({
    selectedCard,
    messages,
    isSending,
    isGenerating,
    onSendMessage,
    chatAreaRef,
    onScrollStateChange,
    isHistoryLoading = false,
    initialInput,
    onConsumedInitialInput,
    activeCard,
  }: ChatAreaProps) => {
    const [inputText, setInputText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (initialInput) {
        setInputText(initialInput);
        onConsumedInitialInput?.();
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    }, [initialInput, onConsumedInitialInput]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const prevMessagesCount = useRef<number>(0);
    const isNearBottomRef = useRef<boolean>(true);

    const updateScrollState = useCallback(() => {
      const el = scrollRef.current;
      if (!el) return;
      const {scrollTop, scrollHeight, clientHeight} = el;
      const isScrollable = scrollHeight > clientHeight;
      const atTop = scrollTop <= 10;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 20;

      onScrollStateChange?.(isScrollable && !atTop, isScrollable && !atBottom);
    }, [onScrollStateChange]);

    const scrollToBottom = useCallback(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({behavior: 'instant'});
      }
    }, []);

    useEffect(() => {
      if (chatAreaRef) {
        chatAreaRef.current = {
          scrollToTop: () => {
            scrollRef.current?.scrollTo({top: 0, behavior: 'smooth'});
          },
          scrollToBottom: () => {
            const el = scrollRef.current;
            if (el) {
              el.scrollTo({top: el.scrollHeight, behavior: 'smooth'});
            }
          },
        };
      }
      return () => {
        if (chatAreaRef) {
          chatAreaRef.current = null;
        }
      };
    }, [chatAreaRef]);

    const handleScroll = useCallback(() => {
      const el = scrollRef.current;
      if (el) {
        const {scrollTop, scrollHeight, clientHeight} = el;
        // User is near bottom if scroll position is within 100px of maximum
        isNearBottomRef.current = scrollTop + clientHeight >= scrollHeight - 100;
      }
      updateScrollState();
    }, [updateScrollState]);

    useEffect(() => {
      const scrollEl = scrollRef.current;
      const contentEl = contentRef.current;
      if (!scrollEl || !contentEl) return;

      const resizeObserver = new ResizeObserver(() => {
        updateScrollState();
        if (isNearBottomRef.current) {
          scrollEl.scrollTop = scrollEl.scrollHeight;
        }
      });
      resizeObserver.observe(contentEl);

      return () => {
        resizeObserver.disconnect();
      };
    }, [updateScrollState]);

    useEffect(() => {
      if (messages.length > prevMessagesCount.current) {
        scrollToBottom();
      }
      prevMessagesCount.current = messages.length;

      const timer = setTimeout(() => {
        updateScrollState();
      }, 50);
      return () => clearTimeout(timer);
    }, [messages, scrollToBottom, updateScrollState]);

    const handleSend = useCallback(() => {
      if (!inputText.trim() || isSending) return;
      onSendMessage(inputText);
      setInputText('');
    }, [inputText, isSending, onSendMessage]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <div className="flex size-full flex-col overflow-hidden bg-surface">
        {/* Chat Messages */}
        <ScrollShadow ref={scrollRef} onScroll={handleScroll} className="flex-1 w-full">
          <div ref={contentRef} className="max-w-6xl mx-auto w-full min-h-full flex flex-col p-6">
            {isHistoryLoading ? (
              <ChatSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex flex-col text-semi-muted items-center justify-center flex-1 text-center gap-y-2">
                <ChatRound className="size-12" />
                {selectedCard?.id === 'universal' && !activeCard ? (
                  <>
                    <div className="font-semibold">No background AIs active</div>
                    <div className="text-xs text-muted max-w-sm">
                      Please enable background run for AIs in the selection screen, then start a chat.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">Start a new conversation</div>
                    <div className="text-xs text-muted">Your chat history will sync here automatically.</div>
                  </>
                )}
              </div>
            ) : (
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
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollShadow>

        {/* Message Input Box */}
        <div className="p-4 bg-surface shrink-0">
          <TextField name="message" aria-label="Message input" className="max-w-4xl mx-auto w-full">
            <InputGroup variant="secondary" className="p-2 rounded-2xl" fullWidth>
              <InputGroup.TextArea
                placeholder={
                  activeCard
                    ? `Message ${activeCard.title}...`
                    : selectedCard
                      ? `Message ${selectedCard.title}...`
                      : 'Message...'
                }
                rows={1}
                ref={textareaRef}
                value={inputText}
                className="max-h-32 "
                onKeyDown={handleKeyDown}
                onChange={e => setInputText(e.target.value)}
              />
              <InputGroup.Suffix className="p-0.5 shrink-0 self-end">
                <Button
                  variant="primary"
                  className="shrink-0"
                  onPress={handleSend}
                  isDisabled={!inputText.trim() || isSending}
                  isIconOnly>
                  <Send />
                </Button>
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
        </div>
      </div>
    );
  },
);

ChatArea.displayName = 'ChatArea';

export default ChatArea;
