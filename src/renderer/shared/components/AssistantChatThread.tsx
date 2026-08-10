import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import {MarkdownTextPrimitive, unstable_memoizeMarkdownComponents} from '@assistant-ui/react-markdown';
import {Button, ScrollShadow} from '@heroui/react';
import {ChatSkeleton, TypingIndicatorBubble} from '@lynx_shared/components/ChatBubble';
import {SyntaxHighlighter} from '@lynx_shared/components/SyntaxHighlighter';
import {ChatRoundIcon, CopyIcon, EarthIcon, Plane2Icon, StopIcon} from '@solar-icons/react/bold-duotone';
import {memo, RefObject, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSupersub from 'remark-supersub';

const defaultComponents = unstable_memoizeMarkdownComponents({
  SyntaxHighlighter: SyntaxHighlighter,
});

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
}

const maxWidthMap: Record<string, {messages: string; input: string}> = {
  small: {messages: 'max-w-2xl', input: 'max-w-xl'},
  default: {messages: 'max-w-4xl', input: 'max-w-3xl'},
  wide: {messages: 'max-w-6xl', input: 'max-w-5xl'},
  full: {messages: 'max-w-full', input: 'max-w-full'},
};

function isRtlText(text: string): boolean {
  const ltrRtlPattern = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return ltrRtlPattern.test(text);
}

interface AssistantChatThreadProps {
  selectedCard?: any;
  activeCard?: any;
  messages: Message[];
  isSending?: boolean;
  isGenerating?: boolean;
  onSendMessage: (messageText: string) => void;
  isHistoryLoading?: boolean;
  initialInput?: string;
  onConsumedInitialInput?: () => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
  contentRef?: RefObject<HTMLDivElement | null>;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  handleScroll?: () => void;
  chatAreaRef?: RefObject<{
    scrollToTop: () => void;
    scrollToBottom: () => void;
  } | null>;
  onSyncScroll?: (scrollRatio?: number | null, forceTop?: boolean) => void;
  scrollRatio?: number | null;
  step?: string;
  moduleState?: any;
  currentCardId?: string | null;
  onBringWebview?: () => void;
  chatBridgeMaxWidth?: string;
}

const AssistantMessageItem = memo(
  ({msg, isLast, isGenerating}: {msg: Message; isLast: boolean; isGenerating: boolean}) => {
    const [copied, setCopied] = useState(false);
    const isUser = msg.sender === 'user';
    const isRtl = isRtlText(msg.text);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(msg.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, [msg.text]);

    return (
      <div className={`flex flex-col group ${isUser ? 'items-end' : 'items-start'} my-2`}>
        <div
          className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm transition-all ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-xs'
              : 'bg-content2 text-foreground rounded-bl-xs shadow-xs'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}>
          <MessagePrimitive.Parts>
            {({part}) =>
              part.type === 'text' ? (
                <MarkdownTextPrimitive
                  components={defaultComponents}
                  remarkPlugins={[remarkGfm, remarkMath, remarkSupersub]}
                  className="prose dark:prose-invert max-w-none text-sm break-words leading-relaxed"
                />
              ) : null
            }
          </MessagePrimitive.Parts>
        </div>

        <div
          className={
            'flex items-center gap-x-2 mt-1 opacity-0 ' +
            `group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`
          }>
          <button
            className={
              'p-1 rounded-md text-xs text-muted hover:text-foreground ' +
              'hover:bg-content3 transition-colors flex items-center gap-x-1'
            }
            type="button"
            onClick={handleCopy}
            title="Copy message">
            <CopyIcon className="size-3.5" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {!isUser && isLast && isGenerating && <TypingIndicatorBubble />}
      </div>
    );
  },
);

AssistantMessageItem.displayName = 'AssistantMessageItem';

export const AssistantChatThread = memo(
  ({
    selectedCard,
    activeCard,
    messages,
    isSending = false,
    isGenerating = false,
    onSendMessage,
    isHistoryLoading = false,
    initialInput,
    onConsumedInitialInput,
    scrollRef: externalScrollRef,
    contentRef: externalContentRef,
    messagesEndRef: externalMessagesEndRef,
    handleScroll: externalHandleScroll,
    chatAreaRef,
    onSyncScroll: _onSyncScroll,
    step = 'chat',
    moduleState,
    currentCardId: _currentCardId,
    onBringWebview,
    chatBridgeMaxWidth = 'default',
  }: AssistantChatThreadProps) => {
    const internalScrollRef = useRef<HTMLDivElement>(null);
    const internalContentRef = useRef<HTMLDivElement>(null);
    const internalMessagesEndRef = useRef<HTMLDivElement>(null);

    const scrollRef = externalScrollRef || internalScrollRef;
    const contentRef = externalContentRef || internalContentRef;
    const messagesEndRef = externalMessagesEndRef || internalMessagesEndRef;

    const [inputText, setInputText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const widthClasses = useMemo(() => maxWidthMap[chatBridgeMaxWidth] || maxWidthMap.default, [chatBridgeMaxWidth]);

    useEffect(() => {
      if (initialInput) {
        setInputText(initialInput);
        onConsumedInitialInput?.();
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      }
    }, [initialInput, onConsumedInitialInput]);

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
    }, [chatAreaRef, scrollRef]);

    const handleSend = useCallback(() => {
      if (!inputText.trim() || isSending || isGenerating) return;
      onSendMessage(inputText);
      setInputText('');
    }, [inputText, isSending, isGenerating, onSendMessage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const runtime = useExternalStoreRuntime({
      messages,
      isRunning: isGenerating || isSending,
      convertMessage: (msg: Message, index: number) => {
        const isUser = msg.sender === 'user';
        return {
          id: `msg-${index}`,
          role: isUser ? ('user' as const) : ('assistant' as const),
          content: [{type: 'text' as const, text: msg.text}],
          ...(isUser ? {} : {status: {type: 'complete' as const, reason: 'stop' as const}}),
          createdAt: new Date(),
        };
      },
      onNew: async appendMessage => {
        const textPart = appendMessage.content.find((p): p is {type: 'text'; text: string} => p.type === 'text');
        if (textPart?.text) {
          onSendMessage(textPart.text);
        }
      },
    });

    if (step === 'login') {
      return (
        <div className="flex size-full flex-col overflow-hidden bg-white notDraggable">
          <div className="flex-1 relative w-full bg-white">
            {moduleState?.activeWindow === 'main' ? (
              <div
                className={
                  'absolute inset-0 flex flex-col items-center ' + 'justify-center p-6 bg-surface text-center draggable'
                }>
                <EarthIcon className="size-12 text-semi-muted mb-4 animate-pulse notDraggable" />
                <h3 className="text-base font-semibold mb-2 draggable">Webview is Active in Main Window</h3>
                <p className="text-xs text-semi-muted max-w-sm mb-6 draggable">
                  The interactive webview for this AI module is currently active in the main app window.
                </p>
                <Button size="sm" variant="primary" onPress={onBringWebview} className="notDraggable">
                  Bring Webview Here
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ThreadPrimitive.Root className="flex size-full flex-col overflow-hidden bg-surface">
          <ScrollShadow ref={scrollRef} onScroll={externalHandleScroll} className="flex-1 w-full notDraggable">
            <div ref={contentRef} className={`${widthClasses.messages} mx-auto w-full min-h-full flex flex-col p-6`}>
              {isHistoryLoading ? (
                <ChatSkeleton />
              ) : messages.length === 0 ? (
                <ThreadPrimitive.Empty>
                  <div
                    className={
                      'flex flex-col text-semi-muted items-center ' +
                      'justify-center flex-1 text-center gap-y-2 my-auto'
                    }>
                    <ChatRoundIcon className="size-12" />
                    {selectedCard?.id === 'unified' && !activeCard ? (
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
                </ThreadPrimitive.Empty>
              ) : (
                <ThreadPrimitive.Viewport className="space-y-4 flex-1">
                  <ThreadPrimitive.Messages>
                    {({message}) => {
                      const msgIndex = messages.findIndex((_, idx) => `msg-${idx}` === message.id);
                      const originalMsg = messages[msgIndex] || {
                        sender: message.role === 'user' ? 'user' : 'assistant',
                        text: '',
                      };
                      return (
                        <MessagePrimitive.Root>
                          <AssistantMessageItem
                            msg={originalMsg}
                            isGenerating={isGenerating}
                            isLast={msgIndex === messages.length - 1}
                          />
                        </MessagePrimitive.Root>
                      );
                    }}
                  </ThreadPrimitive.Messages>
                  {isGenerating && messages[messages.length - 1]?.sender === 'user' && <TypingIndicatorBubble />}
                </ThreadPrimitive.Viewport>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollShadow>

          <ComposerPrimitive.Root className="p-4 bg-surface shrink-0 notDraggable">
            <div className={`${widthClasses.input} mx-auto w-full`}>
              <div
                className={
                  'flex items-end gap-x-2 p-2 rounded-2xl bg-content2/70 ' +
                  'border border-content3/60 focus-within:border-primary/50 ' +
                  'focus-within:bg-content2 shadow-xs transition-all duration-200'
                }>
                <ComposerPrimitive.Input
                  placeholder={
                    activeCard
                      ? `Message ${activeCard.title}...`
                      : selectedCard
                        ? `Message ${selectedCard.title}...`
                        : 'Message...'
                  }
                  className={
                    'flex-1 min-h-[40px] max-h-36 px-3 py-2 bg-transparent text-sm ' +
                    'text-foreground placeholder:text-muted outline-none focus:outline-none ' +
                    'resize-none border-none ring-0 leading-relaxed'
                  }
                  rows={1}
                  ref={textareaRef}
                  value={inputText}
                  onKeyDown={handleKeyDown}
                  onChange={e => setInputText(e.target.value)}
                  autoFocus
                />
                <AuiIf condition={({thread}) => !thread.isRunning}>
                  <ComposerPrimitive.Send asChild>
                    <Button
                      size="sm"
                      variant="primary"
                      onPress={handleSend}
                      className="shrink-0 mb-0.5 rounded-full"
                      isDisabled={!inputText.trim() || isSending || isGenerating}
                      isIconOnly>
                      <Plane2Icon className="size-4" />
                    </Button>
                  </ComposerPrimitive.Send>
                </AuiIf>
                <AuiIf condition={({thread}) => thread.isRunning}>
                  <ComposerPrimitive.Cancel asChild>
                    <Button size="sm" variant="danger-soft" className="shrink-0 mb-0.5 rounded-full" isIconOnly>
                      <StopIcon className="size-4" />
                    </Button>
                  </ComposerPrimitive.Cancel>
                </AuiIf>
              </div>
            </div>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.Root>
      </AssistantRuntimeProvider>
    );
  },
);

AssistantChatThread.displayName = 'AssistantChatThread';

export default AssistantChatThread;
