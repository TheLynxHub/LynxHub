import type {SyntaxHighlighterProps} from '@assistant-ui/react-markdown';
import {Button} from '@heroui/react';
import {useDocumentDarkMode} from '@lynx_shared/hooks';
import {CopyIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {memo, useCallback, useState} from 'react';
import {Prism as PrismHighlighter} from 'react-syntax-highlighter';
import {oneDark, oneLight} from 'react-syntax-highlighter/dist/esm/styles/prism';

function detectLanguage(code: string, givenLang?: string): string {
  if (givenLang && givenLang !== 'unknown' && givenLang !== 'text') {
    const norm = givenLang.toLowerCase().trim();
    if (norm === 'js') return 'javascript';
    if (norm === 'ts') return 'typescript';
    if (norm === 'py') return 'python';
    if (norm === 'sh' || norm === 'shell' || norm === 'zsh') return 'bash';
    if (norm === 'yml') return 'yaml';
    return norm;
  }

  const trimmed = code.trim();

  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    if (/"[^"]+"\s*:/m.test(trimmed)) return 'json';
  }

  // Python detection
  if (/\b(def\s+\w+\(|import\s+\w+|from\s+\w+\s+import|print\(|if\s+__name__|elif\b)/m.test(trimmed)) {
    return 'python';
  }

  // JS / TS detection
  if (
    /\b(function\s+\w*\(|const\s+\w+|let\s+\w+|var\s+\w+|console\.log\(|import\s+.*from|export\s+)/m.test(trimmed) ||
    /=>\s*[\{\(]/m.test(trimmed)
  ) {
    return 'javascript';
  }

  // Shell / Bash detection
  if (/^(npm|npx|yarn|pnpm|git|cd|mkdir|pip|sudo|curl|wget|echo)\s+/m.test(trimmed)) {
    return 'bash';
  }

  // HTML / XML detection
  if (/^<(!DOCTYPE|html|div|span|p|a|ul|ol|table|script|style)/i.test(trimmed)) {
    return 'html';
  }

  // CSS detection
  if (/[\.\#]\w+\s*\{[^}]*\}/m.test(trimmed) && /(color|background|display|flex|margin|padding)\s*:/m.test(trimmed)) {
    return 'css';
  }

  return 'text';
}

export const SyntaxHighlighter = memo(({code, language}: SyntaxHighlighterProps) => {
  const [copied, setCopied] = useState(false);
  const isDarkMode = useDocumentDarkMode();

  const handleCopy = useCallback(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  const activeLanguage = detectLanguage(code, language);

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border-secondary/60 bg-surface-tertiary shadow-xs">
      <div
        className={
          'flex items-center justify-between px-3.5 py-1.5 bg-surface-secondary/80 ' +
          'border-b border-border-secondary/50 text-xs font-JetBrainsMono text-muted select-none'
        }>
        <span className="font-semibold uppercase tracking-wider text-[10px] text-foreground/70">{activeLanguage}</span>
        <Button
          size="sm"
          variant="ghost"
          onPress={handleCopy}
          aria-label="Copy code"
          className="h-6 min-w-0 px-2 text-xs text-muted hover:text-foreground">
          {copied ? (
            <>
              <CheckReadIcon className="size-3.5 text-success" />
              <span className="text-success font-medium">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="overflow-x-auto text-xs leading-relaxed font-JetBrainsMono dir-ltr text-start">
        <PrismHighlighter
          codeTagProps={{
            className: 'font-JetBrainsMono',
          }}
          customStyle={{
            margin: 0,
            padding: '0.875rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.6',
          }}
          language={activeLanguage}
          style={isDarkMode ? oneDark : oneLight}>
          {code.trim()}
        </PrismHighlighter>
      </div>
    </div>
  );
});

SyntaxHighlighter.displayName = 'SyntaxHighlighter';

export default SyntaxHighlighter;
