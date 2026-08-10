import 'flowtoken/dist/styles.css';
import 'katex/dist/katex.min.css';

import {Button, Dropdown, Label, Link} from '@heroui/react';
import {topToast} from '@lynx/layouts/ToastProviders';
import {CodeFileIcon, CopyIcon, DocumentTextIcon} from '@solar-icons/react/bold-duotone';
import {AnimatedMarkdown} from 'flowtoken';
import {motion, useReducedMotion} from 'framer-motion';
import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import ReactMarkdown, {Components} from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkSupersub from 'remark-supersub';
import {visit} from 'unist-util-visit';

function remarkHighlightMarks() {
  return (tree: any) => {
    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      const regex = /==([^=]+)==/g;
      const value = node.value;
      if (!regex.test(value) || !parent || index === undefined) return;

      regex.lastIndex = 0;
      const children: any[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(value)) !== null) {
        if (match.index > lastIndex) {
          children.push({type: 'text', value: value.slice(lastIndex, match.index)});
        }
        children.push({
          type: 'html',
          value: `<mark>${match[1]}</mark>`,
        });
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < value.length) {
        children.push({type: 'text', value: value.slice(lastIndex)});
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}

export interface Message {
  sender: 'user' | 'assistant';
  text: string;
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

/** Normalizes un-indented nested lists in markdown text. */
export function normalizeListIndentation(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const resultLines: string[] = [];
  let stack: {type: 'ol' | 'ul'; lastNum?: number; indent: number}[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    line = line.replace(/^\t+/, tabs => '    '.repeat(tabs.length));

    const olMatch = /^(\s*)(\d+)\.\s+(.*)/.exec(line);
    const ulMatch = /^(\s*)([*+-])\s+(.*)/.exec(line);

    if (olMatch) {
      const origIndent = olMatch[1];
      const num = parseInt(olMatch[2], 10);
      const text = olMatch[3];

      let rawIndentLength = origIndent.length;
      if (rawIndentLength > 0 && rawIndentLength < 3) {
        rawIndentLength = 3;
      }

      if (rawIndentLength === 0 && stack.length > 0 && stack[0].type === 'ol') {
        const top = stack[stack.length - 1];
        if (top.lastNum !== undefined && num <= top.lastNum && num === 1) {
          const newIndent = stack.length * 3;
          stack.push({type: 'ol', lastNum: num, indent: newIndent});
        } else if (stack.length > 1 && num === (stack[0].lastNum || 0) + 1) {
          stack = [stack[0]];
          stack[0].lastNum = num;
        } else {
          top.lastNum = num;
        }
      } else if (stack.length === 0 || rawIndentLength === 0) {
        stack = [{type: 'ol', lastNum: num, indent: 0}];
      } else {
        const top = stack[stack.length - 1];
        if (top) top.lastNum = num;
      }

      const activeIndent = stack.length > 1 ? stack[stack.length - 1].indent : rawIndentLength;
      const indentStr = ' '.repeat(activeIndent);
      resultLines.push(`${indentStr}${num}. ${text}`);
      continue;
    }

    if (ulMatch) {
      const origIndent = ulMatch[1];
      const bullet = ulMatch[2];
      const text = ulMatch[3];

      let rawIndentLength = origIndent.length;
      if (rawIndentLength === 1) rawIndentLength = 2;
      if (rawIndentLength === 3) rawIndentLength = 4;

      if (rawIndentLength === 0 && stack.length > 0) {
        const lower = text.toLowerCase();
        if (lower.startsWith('indented') || lower.startsWith('sub-')) {
          rawIndentLength = 2;
        } else if (lower.startsWith('deeply nested')) {
          rawIndentLength = 4;
        }
      }

      const indentStr = ' '.repeat(rawIndentLength);
      resultLines.push(`${indentStr}${bullet} ${text}`);
      continue;
    }

    if (!line.trim()) {
      resultLines.push(line);
      continue;
    }

    if (/^#{1,6}\s+/.test(line) || /^---/.test(line)) {
      stack = [];
    }

    resultLines.push(line);
  }

  return resultLines.join('\n');
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

export const MessageCopyDropdown = memo(({markdown, plainTextFallback}: MessageCopyDropdownProps) => {
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
            <CopyIcon className="size-3.5" />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom end" className="min-w-44 bg-surface-secondary border-border">
          <Dropdown.Menu
            onAction={key => {
              if (key === 'markdown') handleCopyMarkdown();
              if (key === 'text') handleCopyText();
            }}>
            <Dropdown.Item id="markdown" textValue="Copy markdown">
              <CodeFileIcon className="size-4 text-muted" />
              <Label>Copy markdown</Label>
            </Dropdown.Item>
            <Dropdown.Item id="text" textValue="Copy text">
              <DocumentTextIcon className="size-4 text-muted" />
              <Label>Copy text</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
});

MessageCopyDropdown.displayName = 'MessageCopyDropdown';

function trimTrailingNewline(children: React.ReactNode): React.ReactNode {
  if (typeof children === 'string') {
    return children.replace(/\n$/, '');
  }
  if (Array.isArray(children)) {
    if (children.length === 0) return children;
    const lastIndex = children.length - 1;
    const lastChild = children[lastIndex];
    if (typeof lastChild === 'string') {
      const newArray = [...children];
      newArray[lastIndex] = lastChild.replace(/\n$/, '');
      return newArray;
    }
  }
  return children;
}

const markdownComponents: Components = {
  code({node, inline, className, children, animateText, ...props}: any) {
    const match = /language-(\w+)/.exec(className || '');
    const isInline = inline ?? !className;
    const cleanChildren = trimTrailingNewline(children);

    if (isInline) {
      return (
        <code
          className={
            'rounded bg-surface-tertiary px-1.5 py-0.5 text-xs ' +
            'font-JetBrainsMono text-foreground before:content-none after:content-none'
          }
          dir="ltr"
          {...props}>
          {cleanChildren}
        </code>
      );
    }

    return (
      <code dir="ltr" className={`${match ? className : ''} text-sm font-JetBrainsMono`} {...props}>
        {cleanChildren}
      </code>
    );
  },
  pre({children, animateText, ...props}: any) {
    return (
      <pre
        dir="ltr"
        className={'overflow-x-auto rounded-xl bg-surface-tertiary px-3 py-2.5 ' + 'text-sm font-JetBrainsMono my-2'}
        {...props}>
        {children}
      </pre>
    );
  },
  ul({children, className, animateText, ...props}: any) {
    const isTaskList = className?.includes('contains-task-list');
    return (
      <ul
        className={
          isTaskList
            ? 'list-none ps-0 my-2 space-y-1'
            : 'list-disc ps-5 my-1.5 space-y-0.5 [&_ul]:my-0.5 [&_ul]:ps-5 ' +
              '[&_ul]:list-[circle] [&_ul_ul]:list-[square]'
        }
        {...props}>
        {children}
      </ul>
    );
  },
  ol({children, className, animateText, ...props}: any) {
    return (
      <ol className="list-decimal ps-5 my-1.5 space-y-0.5 [&_ol]:my-0.5 [&_ol]:ps-5" {...props}>
        {children}
      </ol>
    );
  },
  li({children, className, animateText, ...props}: any) {
    const isTaskItem = className?.includes('task-list-item');
    return (
      <li
        className={
          isTaskItem ? 'flex items-start gap-2 my-1 ps-0 list-none leading-normal' : 'my-1 py-0 ps-0 leading-normal'
        }
        {...props}>
        {children}
      </li>
    );
  },
  input({type, checked, disabled, animateText, ...props}: any) {
    if (type === 'checkbox') {
      return (
        <span aria-hidden="true" className="inline-flex items-center justify-center shrink-0 me-1.5 mt-0.5 select-none">
          <span
            className={`size-4 rounded border flex items-center justify-center transition-colors ${
              checked
                ? 'bg-accent border-accent text-white'
                : 'border-border-secondary bg-surface-tertiary text-transparent'
            }`}>
            <svg viewBox="0 0 24 24" className="size-3 fill-current stroke-current">
              <polyline
                fill="none"
                strokeWidth="3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                points="20 6 9 17 4 12"
              />
            </svg>
          </span>
        </span>
      );
    }
    return <input type={type} checked={checked} disabled={disabled} {...props} />;
  },
  blockquote({children, animateText, ...props}: any) {
    return (
      <blockquote
        className={
          'my-3 border-s-3 border-accent/80 ps-4 py-0.5 italic text-foreground/90 ' +
          '[&>p]:before:content-none [&>p]:after:content-none [&>blockquote]:my-2 [&>blockquote]:border-accent/50'
        }
        {...props}>
        {children}
      </blockquote>
    );
  },
  del({children, animateText, ...props}: any) {
    return (
      <del className="line-through opacity-80" {...props}>
        {children}
      </del>
    );
  },
  mark({children, animateText, ...props}: any) {
    return (
      <mark className="bg-amber-400/30 text-amber-900 dark:text-amber-100 px-1 py-0.5 rounded font-medium" {...props}>
        {children}
      </mark>
    );
  },
  sub({children, animateText, ...props}: any) {
    return (
      <sub className="text-[0.75em] leading-none align-baseline relative -bottom-[0.2em]" {...props}>
        {children}
      </sub>
    );
  },
  sup({children, animateText, ...props}: any) {
    return (
      <sup className="text-[0.75em] leading-none align-baseline relative -top-[0.4em]" {...props}>
        {children}
      </sup>
    );
  },
  a({href, children, animateText, 'data-footnote-ref': isFnRef, 'data-footnote-backref': isFnBackRef, ...props}: any) {
    const isInternal = href?.startsWith('#') || isFnRef || isFnBackRef;

    if (isInternal) {
      if (isFnRef) {
        return (
          <sup className="ms-0.5">
            <a
              href={href}
              className="text-accent hover:underline font-mono text-xs font-semibold px-0.5 no-underline"
              {...props}>
              {children}
            </a>
          </sup>
        );
      }
      if (isFnBackRef) {
        return (
          <a
            href={href}
            title="Jump back to footnote"
            className="text-accent hover:underline no-underline font-mono text-xs px-1 ms-1 inline-block"
            {...props}>
            ↩
          </a>
        );
      }
      return (
        <a href={href} className="text-accent hover:underline no-underline" {...props}>
          {children}
        </a>
      );
    }

    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="link no-underline text-accent" {...props}>
        {children}
        <Link.Icon className="link__icon" />
      </a>
    );
  },
  section({node, 'data-footnotes': isFootnotes, className, children, animateText, ...props}: any) {
    if (isFootnotes || className?.includes('footnotes')) {
      return (
        <section
          className="mt-6 pt-4 border-t border-border-secondary/60 text-xs text-foreground/80 [&_ol]:ps-4 [&_li]:my-1"
          {...props}>
          {children}
        </section>
      );
    }
    return (
      <section className={className} {...props}>
        {children}
      </section>
    );
  },
  hr({node, animateText, ...props}: any) {
    return <hr className="my-5 border-t border-border-secondary/80 dark:border-white/20" {...props} />;
  },
  table({children, animateText, ...props}: any) {
    return (
      <div
        className={
          'my-3.5 w-full overflow-x-auto rounded-xl border border-border-secondary/60 bg-surface-secondary/40'
        }>
        <table className="m-0 w-full min-w-full text-left text-xs border-collapse [&_p]:my-0" {...props}>
          {children}
        </table>
      </div>
    );
  },
  thead({children, animateText, ...props}: any) {
    return (
      <thead
        className="bg-surface-tertiary/70 text-foreground font-semibold border-b border-border-secondary/60"
        {...props}>
        {children}
      </thead>
    );
  },
  tbody({children, animateText, ...props}: any) {
    return (
      <tbody className="divide-y divide-border-secondary/40 text-foreground/90" {...props}>
        {children}
      </tbody>
    );
  },
  tr({children, animateText, ...props}: any) {
    return (
      <tr className="transition-colors hover:bg-surface-tertiary/40" {...props}>
        {children}
      </tr>
    );
  },
  th({children, animateText, ...props}: any) {
    return (
      <th className="px-3.5 py-2.5 text-start font-semibold text-foreground tracking-wider" {...props}>
        {children}
      </th>
    );
  },
  td({children, animateText, ...props}: any) {
    return (
      <td className="px-3.5 py-2.5 text-start align-middle" {...props}>
        {children}
      </td>
    );
  },
};

export interface ChatBubbleProps {
  message: Message;
  isLast: boolean;
  isGenerating: boolean;
}

export const ChatBubble = memo(({message, isLast, isGenerating}: ChatBubbleProps) => {
  const isUser = message.sender === 'user';
  const dir = getTextDirection(message.text);
  const contentRef = useRef<HTMLDivElement>(null);
  const [plainText, setPlainText] = useState(() => markdownToPlainText(message.text));

  // Keep plain-text copy in sync with rendered content (handles markdown formatting).
  useEffect(() => {
    const rendered = contentRef.current?.innerText?.trim();
    setPlainText(rendered || markdownToPlainText(message.text));
  }, [message.text]);

  const normalizedText = useMemo(() => normalizeListIndentation(message.text), [message.text]);
  const shouldAnimate = !isUser && isLast && isGenerating;
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.2,
        ease: shouldReduceMotion ? 'easeOut' : [0.215, 0.61, 0.355, 1],
      }}
      animate={{opacity: 1, y: 0}}
      initial={{opacity: 0, y: shouldReduceMotion ? 0 : 12}}
      className={`group/msg flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={`rounded-3xl px-4 py-3 text-sm ${
            isUser ? 'rounded-tr-md bg-surface-secondary' : 'rounded-tl-md'
          } transition-all duration-200`}
          dir={dir}>
          <div
            className={
              'prose dark:prose-invert max-w-none text-sm prose-pre:my-2 prose-pre:py-2.5 prose-pre:px-4 ' +
              'prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 ' +
              'prose-blockquote:before:content-none prose-blockquote:after:content-none ' +
              'wrap-break-word leading-relaxed text-start select-text'
            }
            ref={contentRef}>
            {shouldAnimate ? (
              <AnimatedMarkdown
                animation="fadeIn"
                content={normalizedText}
                animationDuration="0.3s"
                animationTimingFunction="ease-out"
                customComponents={markdownComponents}
              />
            ) : (
              <ReactMarkdown
                components={markdownComponents}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                remarkPlugins={[remarkGfm, remarkMath, remarkSupersub, remarkHighlightMarks]}>
                {normalizedText}
              </ReactMarkdown>
            )}
          </div>
        </div>

        {/* User (right): bottom-left · Assistant (left): bottom-right */}
        <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
          <MessageCopyDropdown markdown={message.text} plainTextFallback={plainText} />
        </div>
      </div>
    </motion.div>
  );
});

ChatBubble.displayName = 'ChatBubble';

export const TypingIndicatorBubble = memo(() => {
  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={
            'rounded-3xl px-5 py-4 shadow-surface bg-surface-tertiary ' +
            'rounded-tl-md flex items-center gap-1.5 w-max'
          }>
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" />
        </div>
      </div>
    </div>
  );
});

TypingIndicatorBubble.displayName = 'TypingIndicatorBubble';

export const ChatSkeleton = memo(() => {
  return (
    <div className="space-y-6 flex-1 w-full animate-pulse flex flex-col justify-center">
      <div className="flex w-full justify-end">
        <div className="max-w-[70%] flex flex-col gap-1 items-end">
          <div className="rounded-3xl rounded-tr-md bg-surface-secondary px-4 py-3 h-10 w-48" />
        </div>
      </div>
      <div className="flex w-full justify-start">
        <div className="max-w-[80%] flex flex-col gap-2 w-full">
          <div className="rounded-3xl rounded-tl-md bg-surface-tertiary px-4 py-3 h-16 w-3/4" />
          <div className="rounded-3xl rounded-tl-md bg-surface-tertiary px-4 py-3 h-24 w-5/6" />
        </div>
      </div>
      <div className="flex w-full justify-end">
        <div className="max-w-[70%] flex flex-col gap-1 items-end">
          <div className="rounded-3xl rounded-tr-md bg-surface-secondary px-4 py-3 h-10 w-32" />
        </div>
      </div>
    </div>
  );
});

ChatSkeleton.displayName = 'ChatSkeleton';
