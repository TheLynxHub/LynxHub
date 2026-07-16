import {Button, Dropdown, InputGroup, Label, Link, ScrollShadow, TextField} from '@heroui/react';
import {ChatRound, CodeFile, Copy, DocumentText} from '@solar-icons/react-perf/BoldDuotone';
import {Send} from 'lucide-react';
import {KeyboardEvent, memo, useCallback, useEffect, useRef, useState} from 'react';
import ReactMarkdown, {Components} from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {topToast} from '../../layouts/ToastProviders';
import {Message} from './useOnlineChat';

interface ChatAreaProps {
  selectedCard: any;
  messages: Message[];
  isSending: boolean;
  onSendMessage: (messageText: string) => void;
}

/** Unicode ranges for strong RTL scripts (Hebrew, Arabic, Syriac, Thaana, N'Ko, etc.). */
const STRONG_RTL = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
/** Latin and related strong LTR letters. */
const STRONG_LTR = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

/**
 * Detect paragraph direction from the first strong directional character.
 * Code fences/inline code are stripped so language tags don't force LTR.
 */
function getTextDirection(text: string): 'rtl' | 'ltr' {
  const stripped = text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');

  for (const char of stripped) {
    if (STRONG_RTL.test(char)) return 'rtl';
    if (STRONG_LTR.test(char)) return 'ltr';
  }

  return 'ltr';
}

/** Best-effort markdown → plain text for the "Copy text" action. */
function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, block => block.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/([*_])(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function copyToClipboard(value: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(value);
    topToast.success(successMessage, {timeout: 1500});
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    topToast.danger('Failed to copy', {timeout: 2000});
  }
}

interface MessageCopyDropdownProps {
  markdown: string;
  plainTextFallback: string;
}

const MessageCopyDropdown = memo(({markdown, plainTextFallback}: MessageCopyDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyMarkdown = useCallback(() => {
    void copyToClipboard(markdown, 'Copied markdown');
  }, [markdown]);

  const handleCopyText = useCallback(() => {
    void copyToClipboard(plainTextFallback || markdownToPlainText(markdown), 'Copied text');
  }, [markdown, plainTextFallback]);

  return (
    <div
      className={`shrink-0 self-center transition-opacity duration-150 ${
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto' +
            ' focus-within:opacity-100 focus-within:pointer-events-auto'
      }`}>
      <Dropdown isOpen={isOpen} onOpenChange={setIsOpen}>
        <Dropdown.Trigger>
          <Button size="sm" variant="ghost" aria-label="Copy message" isIconOnly>
            <Copy className="size-3.5" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-44 bg-surface-secondary border-border">
          <Dropdown.Menu
            onAction={key => {
              if (key === 'markdown') handleCopyMarkdown();
              if (key === 'text') handleCopyText();
            }}>
            <Dropdown.Item id="markdown" textValue="Copy markdown">
              <CodeFile className="size-4 text-muted" />
              <Label>Copy markdown</Label>
            </Dropdown.Item>
            <Dropdown.Item id="text" textValue="Copy text">
              <DocumentText className="size-4 text-muted" />
              <Label>Copy text</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
});

MessageCopyDropdown.displayName = 'MessageCopyDropdown';

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
          dir="ltr"
          {...props}>
          {children}
        </code>
      );
    }

    return (
      <code dir="ltr" className={`${match ? className : ''} text-sm font-JetBrainsMono`} {...props}>
        {children}
      </code>
    );
  },
  pre({children, ...props}) {
    return (
      <pre
        dir="ltr"
        className={'overflow-x-auto rounded-lg bg-gray-100 p-4 ' + 'dark:bg-gray-800 text-sm font-JetBrainsMono my-2'}
        {...props}>
        {children}
      </pre>
    );
  },
  ul({children, ...props}) {
    return (
      <ul className="list-disc ps-5 my-1.5 space-y-0.5" {...props}>
        {children}
      </ul>
    );
  },
  ol({children, ...props}) {
    return (
      <ol className="list-decimal ps-5 my-1.5 space-y-0.5" {...props}>
        {children}
      </ol>
    );
  },
  li({children, ...props}) {
    return (
      <li className="my-1 py-0 ps-0 leading-normal" {...props}>
        {children}
      </li>
    );
  },
  a({href, children, ...props}) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="link no-underline text-accent" {...props}>
        {children}
        <Link.Icon className="link__icon" />
      </a>
    );
  },
};

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble = memo(({message}: ChatBubbleProps) => {
  const isUser = message.sender === 'user';
  const dir = getTextDirection(message.text);
  const contentRef = useRef<HTMLDivElement>(null);
  const [plainText, setPlainText] = useState(() => markdownToPlainText(message.text));

  // Keep plain-text copy in sync with rendered content (handles markdown formatting).
  useEffect(() => {
    const rendered = contentRef.current?.innerText?.trim();
    setPlainText(rendered || markdownToPlainText(message.text));
  }, [message.text]);

  return (
    <div className={`group/msg flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={`rounded-3xl px-4 py-3 shadow-surface text-sm ${
            isUser ? 'bg-surface-secondary rounded-tr-md' : 'bg-surface-tertiary rounded-tl-md'
          } transition-all duration-200`}
          dir={dir}>
          <div
            className={
              'prose dark:prose-invert max-w-none text-sm ' + 'wrap-break-word leading-relaxed text-start select-text'
            }
            ref={contentRef}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.text}
            </ReactMarkdown>
          </div>
        </div>

        {/* User (right): bottom-left · Assistant (left): bottom-right */}
        <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
          <MessageCopyDropdown markdown={message.text} plainTextFallback={plainText} />
        </div>
      </div>
    </div>
  );
});

ChatBubble.displayName = 'ChatBubble';

const ChatArea = memo(({selectedCard, messages, isSending, onSendMessage}: ChatAreaProps) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef<number>(0);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({behavior: 'instant'});
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
      <ScrollShadow className="flex-1 w-full">
        <div className="max-w-6xl mx-auto w-full min-h-full flex flex-col p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col text-semi-muted items-center justify-center flex-1 text-center gap-y-2">
              <ChatRound className="size-12" />
              <div className="font-semibold">Start a new conversation</div>
              <div className="text-xs text-muted">Your chat history will sync here automatically.</div>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {messages.map((msg, index) => (
                <ChatBubble key={index} message={msg} />
              ))}
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
              rows={1}
              value={inputText}
              className="max-h-32 "
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
