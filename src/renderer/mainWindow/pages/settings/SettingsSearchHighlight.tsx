import {useSettingsState} from '@lynx/redux/reducers/settings';
import {memo} from 'react';
import Highlighter from 'react-highlight-words';

/** Props for the SettingsSearchHighlight component */
export type SettingsSearchHighlightProps = {
  /** Explicit text to highlight */
  text?: string;
  /** Children element resolving to text string */
  children?: string;
  /** Wrapper class name if no highlight matches, or parent wrapper class */
  className?: string;
  /** Specific class applied to fully highlighted matches */
  highlightClassName?: string;
};

/**
 * Renders text matching the active settings search terminology with a highlight wrapper.
 * Will render text minimally without highlights if empty or no text provided.
 */
const SettingsSearchHighlight = ({text, children, className, highlightClassName}: SettingsSearchHighlightProps) => {
  const searchWords = useSettingsState('searchWords');
  const content = text ?? children ?? '';

  if (!content) {
    return null;
  }

  if (!searchWords || !searchWords.length) {
    return <span className={className}>{content}</span>;
  }

  const lowerContent = content.toLowerCase();
  const hasMatch = searchWords.some(word => word && lowerContent.includes(word.toLowerCase()));

  if (!hasMatch) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Highlighter
      className={className}
      searchWords={searchWords}
      textToHighlight={content}
      highlightClassName={highlightClassName ?? 'bg-warning/40 rounded-sm px-0.5'}
      autoEscape
    />
  );
};

export default memo(SettingsSearchHighlight);
