import {Button, InputGroup, ScrollShadow, TextField} from '@heroui/react';
import {ChatRound} from '@solar-icons/react-perf/BoldDuotone';
import {Send} from 'lucide-react';
import {KeyboardEvent, memo, useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown, {Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {Message} from './useOnlineChat';

interface ChatAreaProps {
  selectedCard: any;
  messages: Message[];
  isSending: boolean;
  onSendMessage: (messageText: string) => void;
}

const markdownComponents: Components = {
  code({node, inline, className, children, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = inline ?? !className;

    if (isInline) {
      return (
        <code
          className={
            'rounded bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 text-xs ' +
            'font-JetBrainsMono text-foreground before:content-none after:content-none'
          }
          {...props}>
          {children}
        </code>
      );
    }

    return (
      <code className={`${match ? className : ''} text-sm font-JetBrainsMono`} {...props}>
        {children}
      </code>
    );
  },
  pre({children, ...props}) {
    return (
      <pre
        className={'overflow-x-auto rounded-lg bg-gray-100 p-4 ' + 'dark:bg-gray-800 text-sm font-JetBrainsMono my-2'}
        {...props}>
        {children}
      </pre>
    );
  },
};

const ChatArea = memo(({selectedCard, messages, isSending, onSendMessage}: ChatAreaProps) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, []);

  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      scrollToBottom();
    }
    prevMessagesCount.current = messages.length;
  }, [messages, scrollToBottom]);

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
      <ScrollShadow className="flex-1 p-6 gap-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col text-semi-muted items-center justify-center h-full text-center gap-y-2">
            <ChatRound className="size-12" />
            <div className="font-semibold">Start a new conversation</div>
            <div className="text-xs text-muted">Your chat history will sync here automatically.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={index} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-surface border text-sm ${
                      isUser ? 'bg-accent/10 border-accent/25 rounded-tr-sm' : 'bg-surface border-border rounded-tl-sm'
                    } transition-all duration-200`}>
                    <div className="prose dark:prose-invert max-w-none text-sm wrap-break-word leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollShadow>

      {/* Message Input Box */}
      <div className="p-4 bg-surface shrink-0">
        <TextField name="message" aria-label="Message input" className="max-w-4xl mx-auto w-full">
          <InputGroup className="p-2" variant="secondary" fullWidth>
            <InputGroup.TextArea
              rows={1}
              value={inputText}
              className="max-h-32"
              onKeyDown={handleKeyDown}
              onChange={e => setInputText(e.target.value)}
              placeholder={selectedCard ? `Message ${selectedCard.title}...` : 'Message...'}
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
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;
