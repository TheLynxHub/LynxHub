import 'katex/dist/katex.min.css';

import {ScrollShadow, Spinner} from '@heroui/react';
import EmptyStateCard from '@lynx/components/EmptyStateCard';
import {extractGitUrl} from '@lynx_common/utils';
import {LinkIcon} from '@solar-icons/react/bold-duotone';
import {isEmpty} from 'lodash-es';
import {
  Children,
  CSSProperties,
  HTMLAttributes,
  isValidElement,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ReactMarkdown, {Components} from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
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

type MarkdownViewerProps = {
  url: string;
  rounded?: boolean;
  showBackground?: boolean;
  urlType?: 'repository' | 'raw';
};

type CustomDivProps = HTMLAttributes<HTMLDivElement> & {
  'data-align'?: string;
};

type CustomCodeProps = HTMLAttributes<HTMLElement> & {
  'data-inline'?: boolean;
};

/**
 * Custom hook to fetch markdown content.
 */
const useMarkdownContent = (url: string, urlType: MarkdownViewerProps['urlType']) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const repository = useMemo(() => {
    if (urlType === 'raw' || !url) return '';
    const {repo, owner} = extractGitUrl(url);
    return `${owner}/${repo}`;
  }, [url, urlType]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setContent('');

    const controller = new AbortController();

    const fetchContent = async () => {
      try {
        let urlToFetch: string | undefined;
        const fetchOptions: RequestInit = {signal: controller.signal};
        let notFoundMessage = 'Content is not accessible.';

        if (urlType === 'raw') {
          urlToFetch = url;
        } else if (!isEmpty(repository)) {
          urlToFetch = `https://api.github.com/repos/${repository}/readme`;
          fetchOptions.headers = {
            Accept: 'application/vnd.github.raw+json',
          };
          notFoundMessage = 'README is not accessible.';
        }

        if (!urlToFetch) {
          setLoading(false);
          return;
        }

        const response = await fetch(urlToFetch, fetchOptions);

        if (!response.ok) {
          setError(notFoundMessage);
          return;
        }

        const data = await response.text();
        setContent(data);
      } catch (err) {
        // Ignore abort errors when component unmounts
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Handle network errors gracefully
        if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
          setError('Unable to connect. Please check your internet connection.');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
      } finally {
        setLoading(false);
      }
    };

    void fetchContent();

    return () => controller.abort();
  }, [url, urlType, repository]);

  return {content, loading, error, repository};
};

/**
 * Renders a markdown viewer with syntax highlighting, raw HTML support, and GitHub integration.
 */
const MarkdownViewer = ({url, rounded = true, showBackground, urlType}: MarkdownViewerProps) => {
  const {content, loading, error, repository} = useMarkdownContent(url, urlType);
  const normalizedContent = useMemo(() => normalizeListIndentation(content), [content]);

  const transformImageUrl = useCallback(
    (src: string) => {
      if (src.startsWith('http')) {
        return src;
      }

      if (urlType === 'raw' && url) {
        try {
          // Resolve relative paths against the full URL of the markdown file
          return new URL(src, url).href;
        } catch (e) {
          console.error('Failed to construct image URL', e);
          return src; // Fallback to original src if URL parsing fails
        }
      }

      if (repository) {
        const cleanPath = src.replace(/^\.?\//, '');
        return `https://raw.githubusercontent.com/${repository}/HEAD/${cleanPath}`;
      }

      return src;
    },
    [repository, urlType, url],
  );

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const href = e.currentTarget.getAttribute('href');
    if (href?.startsWith('#')) {
      e.preventDefault();
      const element = document.getElementById(href.slice(1));
      if (element) {
        element.scrollIntoView({behavior: 'smooth'});
      }
    }
  };

  const components: Components = useMemo(
    () => ({
      img: ({src, alt, height, width, ...props}) => {
        const style: CSSProperties = {};

        if (height) {
          style.height = `${height}px`;
          style.objectFit = 'contain';
        }

        if (width) {
          style.width = `${width}px`;
        }

        return (
          <img
            onError={e => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('/HEAD/')) {
                target.src = target.src.replace('/HEAD/', '/master/');
              }
            }}
            style={style}
            loading="lazy"
            alt={alt || ''}
            className="mx-1 inline-block"
            src={transformImageUrl(src || '')}
            {...props}
          />
        );
      },
      a: ({href, children, 'data-footnote-ref': isFnRef, 'data-footnote-backref': isFnBackRef, ...props}: any) => {
        if (href?.startsWith('#') || isFnRef || isFnBackRef) {
          if (isFnRef) {
            return (
              <sup className="ms-0.5">
                <a
                  className={
                    'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ' +
                    'font-mono text-xs font-semibold px-0.5 no-underline'
                  }
                  href={href}
                  onClick={handleLinkClick}
                  {...props}>
                  {children}
                </a>
              </sup>
            );
          }
          if (isFnBackRef) {
            return (
              <a
                className={
                  'text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ' +
                  'no-underline font-mono text-xs px-1 ms-1 inline-block'
                }
                href={href}
                onClick={handleLinkClick}
                title="Jump back to footnote"
                {...props}>
                ↩
              </a>
            );
          }
          return (
            <a
              href={href}
              onClick={handleLinkClick}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              {...props}>
              {children}
            </a>
          );
        }
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            {...props}>
            {children}
          </a>
        );
      },
      code: ({className, children, 'data-inline': inline, ...props}: CustomCodeProps) => {
        const language = /language-(\w+)/.exec(className || '');

        if (inline) {
          return (
            <code
              className={
                'rounded bg-gray-100 dark:bg-gray-800 px-1 py-0.5 text-semi-muted ' +
                'text-sm font-JetBrainsMono before:content-none after:content-none'
              }
              {...props}>
              {children}
            </code>
          );
        }

        return (
          <code className={`${language ? className : ''} text-semi-muted font-JetBrainsMono`} {...props}>
            {children}
          </code>
        );
      },
      pre: ({children, ...props}) => (
        <pre
          className="overflow-x-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-800 text-sm font-JetBrainsMono"
          {...props}>
          {children}
        </pre>
      ),
      ul: ({children, className, ...props}: any) => {
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
      ol: ({children, className, ...props}: any) => (
        <ol className="list-decimal ps-5 my-1.5 space-y-0.5 [&_ol]:my-0.5 [&_ol]:ps-5" {...props}>
          {children}
        </ol>
      ),
      li: ({children, className, ...props}: any) => {
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
      input: ({type, checked, disabled, ...props}: any) => {
        if (type === 'checkbox') {
          return (
            <span
              aria-hidden="true"
              className="inline-flex items-center justify-center shrink-0 me-1.5 mt-0.5 select-none">
              <span
                className={`size-4 rounded border flex items-center justify-center transition-colors ${
                  checked
                    ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-transparent'
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
      blockquote: ({children, ...props}: any) => (
        <blockquote
          className={
            'my-4 border-s-4 border-blue-500/80 dark:border-blue-400/80 ps-4 py-0.5 italic text-gray-700 ' +
            'dark:text-gray-300 [&>p]:before:content-none [&>p]:after:content-none [&>blockquote]:my-2'
          }
          {...props}>
          {children}
        </blockquote>
      ),
      del: ({children, ...props}: any) => (
        <del className="line-through opacity-80" {...props}>
          {children}
        </del>
      ),
      mark: ({children, ...props}: any) => (
        <mark className="bg-amber-400/30 text-amber-900 dark:text-amber-100 px-1 py-0.5 rounded font-medium" {...props}>
          {children}
        </mark>
      ),
      sub: ({children, ...props}: any) => (
        <sub className="text-[0.75em] leading-none align-baseline relative -bottom-[0.2em]" {...props}>
          {children}
        </sub>
      ),
      sup: ({children, ...props}: any) => (
        <sup className="text-[0.75em] leading-none align-baseline relative -top-[0.4em]" {...props}>
          {children}
        </sup>
      ),
      hr: ({...props}: any) => <hr className="my-6 border-t border-gray-200 dark:border-gray-700" {...props} />,
      section: ({node, 'data-footnotes': isFootnotes, className, children, ...props}: any) => {
        if (isFootnotes || className?.includes('footnotes')) {
          return (
            <section
              className={
                'mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs ' +
                'text-gray-600 dark:text-gray-400 [&_ol]:ps-4 [&_li]:my-1'
              }
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
      div: ({className, 'data-align': align, children, ...props}: CustomDivProps) => (
        <div
          className={`${className || ''} ${
            align === 'center' ? 'flex flex-wrap items-center justify-center gap-2 text-center' : ''
          }`}
          {...props}>
          {children}
        </div>
      ),
      p: ({children, ...props}) => {
        const childArray = Children.toArray(children);
        const hasOnlyImages = childArray.every(child => isValidElement(child) && child.type === 'img');
        const hasMultipleImages = childArray.filter(child => isValidElement(child) && child.type === 'img').length > 1;

        return (
          <p
            className={
              ` ${hasOnlyImages ? 'flex flex-wrap gap-2' : ''} ` +
              ` ${hasMultipleImages ? 'flex-col items-start' : 'items-center'} `
            }
            {...props}>
            {children}
          </p>
        );
      },
      kbd: ({...props}) => <kbd {...props} />,
      details: ({...props}) => <details className="my-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50" {...props} />,
      summary: ({...props}) => <summary className="cursor-pointer font-medium" {...props} />,
    }),
    [transformImageUrl],
  );

  return loading ? (
    <div className="flex flex-col items-center gap-2 size-full justify-center py-4">
      <Spinner size="lg" color="accent" />
      <span className="text-xs text-muted">Please wait...</span>
    </div>
  ) : error ? (
    <EmptyStateCard
      title={error}
      bodyClassName="py-8"
      className="mt-8 mx-16"
      icon={<LinkIcon size={45} className="text-warning" />}
      description="Please check your internet connection and try again."
    />
  ) : (
    <ScrollShadow className={`size-full ${rounded && 'rounded-xl'}`}>
      <div
        className={
          'prose prose-slate mr-4 max-w-none rounded-xl p-8 ' +
          'prose-blockquote:before:content-none prose-blockquote:after:content-none ' +
          `dark:prose-invert ${showBackground && 'bg-white dark:bg-[#0d1117]'}`
        }>
        <ReactMarkdown
          components={components}
          rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw, rehypeSlug]}
          remarkPlugins={[remarkGfm, remarkMath, remarkSupersub, remarkHighlightMarks]}>
          {normalizedContent}
        </ReactMarkdown>
      </div>
    </ScrollShadow>
  );
};

export default MarkdownViewer;
