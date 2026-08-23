import {Button, Popover, SearchField, Switch} from '@heroui/react';
import useHotkeyPress from '@lynx/hooks/hotkeys';
import {useIsActiveTab} from '@lynx/layouts/tabs/utils';
import {useHotkeysState} from '@lynx/redux/reducers/hotkeys';
import {formatHotkey} from '@lynx/utils';
import {Hotkey_Names} from '@lynx_common/consts/hotkeys';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {AltArrowDownIcon, AltArrowUpIcon, MagnifierIcon} from '@solar-icons/react/bold-duotone';
import {ISearchOptions, SearchAddon} from '@xterm/addon-search';
import {AnimatePresence, motion} from 'framer-motion';
import {isEmpty} from 'lodash-es';
import {X} from 'lucide-react';
import {KeyboardEvent, memo, useCallback, useEffect, useMemo, useState} from 'react';

import LynxTooltip from '../../../../components/LynxTooltip';

type Props = {
  /**
   * The search addon for xterm.js.
   */
  searchAddon: SearchAddon;
  /**
   * The ID of the tab.
   */
  tabId: string;
};

/**
 * A search input for the terminal.
 */
const TerminalSearchText = memo(({searchAddon, tabId}: Props) => {
  const [searchText, setSearchText] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const hotkeys = useHotkeysState('hotkeys');
  const isActiveTab = useIsActiveTab(tabId);

  const findInPageHotkey = hotkeys.find(item => item.name === Hotkey_Names.findInPage) ?? null;
  const hotkeyLabel = formatHotkey(findInPageHotkey ?? null);
  const hasHotkey = hotkeyLabel !== 'Not Set';

  const [foundAny, setFoundAny] = useState<boolean>(false);

  const [enabledRegex, setEnabledRegex] = useState<boolean>(false);
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [matchWord, setMatchWord] = useState<boolean>(false);

  const searchOptions: ISearchOptions = useMemo(
    () => ({caseSensitive: matchCase, regex: enabledRegex, wholeWord: matchWord}),
    [enabledRegex, matchCase, matchWord],
  );

  useEffect(() => {
    return () => {
      setSearchText('');
      try {
        searchAddon.clearDecorations();
      } catch {
        // Ignore if addon is not loaded or already detached
      }
    };
  }, [isOpen, searchAddon]);

  const findNext = useCallback(() => {
    try {
      const isFound = searchAddon.findNext(searchText, searchOptions);
      setFoundAny(isFound);
    } catch {
      setFoundAny(false);
    }
  }, [searchAddon, searchText, searchOptions]);
  const findPrev = useCallback(() => {
    try {
      const isFound = searchAddon.findPrevious(searchText, searchOptions);
      setFoundAny(isFound);
    } catch {
      setFoundAny(false);
    }
  }, [searchAddon, searchText, searchOptions]);

  const handleFindNext = useCallback(() => {
    AddBreadcrumb_Renderer('Terminal: Find next in page');
    findNext();
  }, [findNext]);

  const handleFindPrev = useCallback(() => {
    AddBreadcrumb_Renderer('Terminal: Find previous in page');
    findPrev();
  }, [findPrev]);

  useEffect(() => {
    if (searchText) findNext();
  }, [findNext]);

  const onInputKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') {
        AddBreadcrumb_Renderer('Terminal: Find next in page via ArrowDown');
        findNext();
      } else if (e.code === 'ArrowUp') {
        AddBreadcrumb_Renderer('Terminal: Find previous in page via ArrowUp');
        findPrev();
      }
    },
    [findNext, findPrev],
  );

  useHotkeyPress([
    {
      name: Hotkey_Names.findInPage,
      method: isActiveTab
        ? () => {
            AddBreadcrumb_Renderer('Terminal: Open search input');
            setIsOpen(true);
          }
        : null,
    },
  ]);

  const onInputValueChange = useCallback(
    (value: string) => {
      try {
        searchAddon.findNext(value, searchOptions);
      } catch {
        // Ignore if addon is not loaded
      }
      setSearchText(value);
    },
    [searchAddon, searchOptions],
  );

  const clear = () => {
    AddBreadcrumb_Renderer('Terminal: Clear search text');
    setSearchText('');
    try {
      searchAddon.findNext('');
      searchAddon.clearDecorations();
    } catch {
      // Ignore if addon is not loaded
    }
    setFoundAny(false);
  };

  const handleToggleRegex = useCallback((val: boolean) => {
    AddBreadcrumb_Renderer(`Terminal: Toggle search regex: ${val}`);
    setEnabledRegex(val);
  }, []);

  const handleToggleMatchCase = useCallback((val: boolean) => {
    AddBreadcrumb_Renderer(`Terminal: Toggle search match case: ${val}`);
    setMatchCase(val);
  }, []);

  const handleToggleMatchWord = useCallback((val: boolean) => {
    AddBreadcrumb_Renderer(`Terminal: Toggle search match whole word: ${val}`);
    setMatchWord(val);
  }, []);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <LynxTooltip
          content={
            hasHotkey ? (
              <div className="flex flex-row items-center gap-x-1">
                <span>Search for text</span>
                <span
                  className={
                    'h-4 font-semibold text-xs rounded-sm bg-surface-secondary p-1 flex items-center justify-center'
                  }>
                  {hotkeyLabel}
                </span>
              </div>
            ) : (
              'Search for text'
            )
          }
          delay={500}>
          <Button size="sm" variant="ghost" aria-label="Search for text" isIconOnly>
            <MagnifierIcon className="size-3.5" />
          </Button>
        </LynxTooltip>
      </Popover.Trigger>

      <Popover.Content>
        <Popover.Dialog className="gap-y-4 flex flex-col">
          <Popover.Heading>Search</Popover.Heading>
          <SearchField
            name="search"
            spellCheck="false"
            value={searchText}
            variant="secondary"
            onKeyUp={onInputKeyUp}
            onChange={onInputValueChange}
            autoFocus
            fullWidth>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search for..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          <AnimatePresence>
            {searchText && !foundAny && (
              <motion.div
                aria-live="polite"
                transition={{duration: 0.1}}
                exit={{translateY: 5, opacity: 0}}
                initial={{translateY: 5, opacity: 0}}
                animate={{translateY: 0, opacity: 1}}
                className="flex items-center justify-center rounded-lg bg-surface-secondary py-2 w-full">
                <span role="alert" className="text-sm text-danger">
                  No matches found
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-x-2">
            <Button
              size="sm"
              className="w-23"
              variant="tertiary"
              onPress={handleFindNext}
              isDisabled={isEmpty(searchText)}>
              <AltArrowDownIcon className="size-4 shrink-0" />
              Next
            </Button>
            <Button
              size="sm"
              className="w-23"
              variant="tertiary"
              onPress={handleFindPrev}
              isDisabled={isEmpty(searchText)}>
              <AltArrowUpIcon className="size-4 shrink-0" />
              Previous
            </Button>
            <Button
              size="sm"
              onPress={clear}
              variant="danger-soft"
              isDisabled={isEmpty(searchText)}
              aria-label="Clear search (Escape)"
              isIconOnly>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex flex-col w-full gap-y-2">
            <Switch isSelected={enabledRegex} onChange={handleToggleRegex}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Regex
              </Switch.Content>
            </Switch>

            <Switch isSelected={matchCase} onChange={handleToggleMatchCase}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Match Case
              </Switch.Content>
            </Switch>

            <Switch isSelected={matchWord} onChange={handleToggleMatchWord}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                Match whole word
              </Switch.Content>
            </Switch>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
});

TerminalSearchText.displayName = 'TerminalSearchText';

export default TerminalSearchText;
