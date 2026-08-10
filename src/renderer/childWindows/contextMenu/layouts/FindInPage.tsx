import {Button, Chip, Label, SearchField, Switch} from '@heroui/react';
import {Circle_Icon} from '@lynx_assets/icons';
import browserIpc from '@lynx_shared/ipc/browser';
import {AltArrowDownIcon, AltArrowUpIcon} from '@solar-icons/react/bold';
import {isEmpty} from 'lodash-es';
import {X} from 'lucide-react';
import {type KeyboardEvent, memo, useCallback, useEffect, useRef, useState} from 'react';

import {useContextState} from '../redux/reducer';
import {hideContextWindow} from './Shared';

type FindResult = {
  activeMatchOrdinal: number;
  matches: number;
  finalUpdate: boolean;
};

/**
 * FindInPage Component
 * Allows users to search for text within the current browser page.
 */
const FindInPage = memo(function FindInPage() {
  const id = useContextState('targetID');
  const selectedText = useContextState('selectedText');
  const [searchValue, setSearchValue] = useState<string>('');
  const [result, setResult] = useState<FindResult | null>(null);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [matchCase, setMatchCase] = useState<boolean>(false);

  // Set initial search value from selected text
  useEffect(() => {
    if (selectedText) {
      setSearchValue(selectedText);
    }
  }, [selectedText]);

  useEffect(() => {
    if (searchValue) {
      browserIpc.send.findInPage(id, searchValue, {findNext: true, matchCase});
    } else {
      browserIpc.send.stopFindInPage(id, 'clearSelection');
      setResult(null);
    }

    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => inputRef?.focus(), 0);
  }, [searchValue, id, inputRef, matchCase]);

  // Listen for find results from main process
  useEffect(() => {
    const unsubscribe = browserIpc.on.foundInPage(findResult => {
      if (findResult.finalUpdate) {
        setResult(findResult);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const next = useCallback(() => {
    browserIpc.send.findInPage(id, searchValue, {findNext: false, forward: true, matchCase});
  }, [id, searchValue, matchCase]);

  const back = useCallback(() => {
    browserIpc.send.findInPage(id, searchValue, {findNext: false, forward: false, matchCase});
  }, [id, searchValue, matchCase]);

  const clear = useCallback(() => {
    setSearchValue('');
    setResult(null);
    browserIpc.send.stopFindInPage(id, 'clearSelection');
    // Refocus input after clearing
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    focusTimeoutRef.current = setTimeout(() => inputRef?.focus(), 0);
  }, [id, inputRef]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (isEmpty(searchValue)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          back();
        } else {
          next();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        back();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clear();
        hideContextWindow();
      }
    },
    [searchValue, back, next, clear],
  );

  // Clear search when window closes
  useEffect(() => {
    const handleWindowBlur = () => {
      setSearchValue(currentValue => {
        if (currentValue) {
          browserIpc.send.stopFindInPage(id, 'clearSelection');
        }
        return '';
      });
      setResult(null);
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [id]);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    };
  }, []);

  const hasResults = result && result.matches > 0;
  const noResults = searchValue && result && result.matches === 0;

  return (
    <div className="flex w-65 flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle_Icon aria-hidden="true" className="size-5 text-muted" />
          <span className="text-sm font-semibold text-muted">Find in Page</span>
        </div>
        {hasResults && (
          <Chip size="sm" variant="soft">
            {result.activeMatchOrdinal} of {result.matches}
          </Chip>
        )}
      </div>

      <SearchField
        name="search"
        value={searchValue}
        variant="secondary"
        aria-label="Find in page"
        onChange={setSearchValue}
        onKeyDown={handleKeyDown}
        autoFocus>
        <Label>Search</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input ref={setInputRef} placeholder="Search..." />
        </SearchField.Group>
      </SearchField>

      {/* Status Message */}
      {searchValue && (
        <div aria-live="polite" className="flex items-center justify-center rounded-xl bg-surface-secondary py-2">
          {noResults ? (
            <span role="alert" className="text-sm text-danger">
              No matches found
            </span>
          ) : hasResults ? (
            <span className="text-sm text-semi-muted">
              Match {result.activeMatchOrdinal} of {result.matches}
            </span>
          ) : (
            <span className="text-sm text-muted">Searching...</span>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-1">
        <Button
          size="sm"
          onPress={back}
          className="flex-1"
          variant="secondary"
          isDisabled={isEmpty(searchValue) || !hasResults}
          aria-label="Previous match (Shift+Enter or Up Arrow)">
          <AltArrowUpIcon className="size-4" />
          Previous
        </Button>
        <Button
          size="sm"
          onPress={next}
          className="flex-1"
          variant="secondary"
          aria-label="Next match (Enter or Down Arrow)"
          isDisabled={isEmpty(searchValue) || !hasResults}>
          <AltArrowDownIcon className="size-4" />
          Next
        </Button>
        <Button
          size="sm"
          onPress={clear}
          variant="danger-soft"
          isDisabled={isEmpty(searchValue)}
          aria-label="Clear search (Escape)"
          isIconOnly>
          <X className="size-4" />
        </Button>
      </div>

      <Switch isSelected={matchCase} onChange={setMatchCase}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          Match Case
        </Switch.Content>
      </Switch>

      {/* Keyboard Shortcuts Help */}
      <div className="flex flex-col gap-1 rounded-2xl bg-surface-secondary p-3 text-xs text-muted">
        <div className="flex justify-between">
          <span>Next match:</span>
          <span className="font-medium text-semi-muted">Enter or ↓</span>
        </div>
        <div className="flex justify-between">
          <span>Previous match:</span>
          <span className="font-medium text-semi-muted">Shift+Enter or ↑</span>
        </div>
        <div className="flex justify-between">
          <span>Close:</span>
          <span className="font-medium text-semi-muted">Esc</span>
        </div>
      </div>
    </div>
  );
});

export default FindInPage;
