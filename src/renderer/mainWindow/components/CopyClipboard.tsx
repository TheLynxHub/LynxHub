import {Button} from '@heroui/react';
import {CopyIcon} from '@solar-icons/react/bold-duotone';
import {CheckReadIcon} from '@solar-icons/react/line-duotone';
import {memo, useCallback, useEffect, useRef, useState} from 'react';

import LynxTooltip from './LynxTooltip';

type Props = {
  /** Optional custom tooltip text */
  tooltipTitle?: string;
  /** Whether to show the tooltip. Defaults to true */
  showTooltip?: boolean;
  /** The text content to copy to clipboard */
  contentToCopy?: string;
  /** Optional className for the button */
  className?: string;
  /** Optional callback when copy is performed. If provided, overrides default clipboard action */
  onCopy?: () => void;
};

/**
 * A reusable button component that copies text to clipboard and shows a success state.
 */
const CopyClipboard = memo(({showTooltip = true, tooltipTitle, contentToCopy, className, onCopy}: Props) => {
  const [copied, setCopied] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy();
    } else {
      if (contentToCopy) {
        navigator.clipboard.writeText(contentToCopy).catch(e => {
          console.error('Failed to copy to clipboard:', e);
        });
      }
    }

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 1000);
  }, [contentToCopy, onCopy]);

  return (
    <LynxTooltip
      delay={500}
      isDisabled={!showTooltip}
      content={copied ? 'Copied!' : tooltipTitle || 'Copy to clipboard'}>
      <Button size="sm" variant="ghost" onPress={handleCopy} className={className} isIconOnly>
        {copied ? (
          <CheckReadIcon className="size-5 animate-appearance-in" />
        ) : (
          <CopyIcon className="size-4 animate-appearance-in" />
        )}
      </Button>
    </LynxTooltip>
  );
});

export default CopyClipboard;
