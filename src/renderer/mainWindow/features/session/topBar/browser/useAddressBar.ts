import {formatWebAddress} from '@lynx_common/utils';
import browserIpc from '@lynx_shared/ipc/browser';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {isEmpty} from 'lodash-es';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {useBookmarks} from '../../../../features/bookmarks/useBookmarks';
import {cardsActions} from '../../../../redux/reducers/cards';
import {useTabsState} from '../../../../redux/reducers/tabs';
import {AppDispatch} from '../../../../redux/store';
import {RunningCard} from '../../../../types';

const findAutocomplete = (input: string, historyUrls: string[]): string => {
  if (!input || input.length < 2) return '';

  const lowerInput = input.toLowerCase();

  // Find the first URL that starts with the input (case-insensitive)
  for (const url of historyUrls) {
    const lowerUrl = url.toLowerCase();

    // Check if URL starts with input
    if (lowerUrl.startsWith(lowerInput)) {
      return url.slice(input.length);
    }

    // Check without protocol (http://, https://)
    const withoutProtocol = lowerUrl.replace(/^https?:\/\//, '');
    const inputWithoutProtocol = lowerInput.replace(/^https?:\/\//, '');

    if (withoutProtocol.startsWith(inputWithoutProtocol)) {
      const originalWithoutProtocol = url.replace(/^https?:\/\//, '');
      return originalWithoutProtocol.slice(inputWithoutProtocol.length);
    }

    // Check without www.
    const withoutWww = withoutProtocol.replace(/^www\./, '');
    const inputWithoutWww = inputWithoutProtocol.replace(/^www\./, '');

    if (withoutWww.startsWith(inputWithoutWww)) {
      const originalWithoutWww = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
      return originalWithoutWww.slice(inputWithoutWww.length);
    }
  }

  return '';
};

const parseAddressForDisplay = (address: string) => {
  if (!address) {
    return {prefix: '', domain: '', rest: ''};
  }
  const addressRegex = /^(https?:\/\/|file:\/\/\/|file:\/\/)?(www\.)?([^/?#]+)(.*)/i;
  const matches = address.match(addressRegex);

  if (!matches) {
    const mainPartRegex = /^[^/]+/i;
    const mainPartMatch = address.match(mainPartRegex);
    const domain = mainPartMatch ? mainPartMatch[0] : address;
    const rest = address.substring(domain.length);
    return {prefix: '', domain, rest};
  }

  const [, protocol = '', www = '', domain = '', rest = ''] = matches;
  const prefix = `${protocol}${www}`;

  return {prefix, domain, rest};
};

type UseAddressBarProps = {
  runningCard: RunningCard;
  setCustomAddress?: (address: string) => void;
};

export const useAddressBar = ({runningCard, setCustomAddress}: UseAddressBarProps) => {
  const {tabId, webUIAddress, customAddress, currentAddress, currentView, browserTitle} = runningCard;

  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [historyUrls, setHistoryUrls] = useState<string[]>([]);
  const [autocomplete, setAutocomplete] = useState('');
  const editableRef = useRef<HTMLDivElement>(null);

  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();
  const {all, addBookmark} = useBookmarks();

  const effectiveAddress = useMemo(() => {
    const addr = currentAddress || customAddress || webUIAddress || '';
    // Don't show "about:blank" in the address bar
    return addr === 'about:blank' ? '' : addr;
  }, [currentAddress, customAddress, webUIAddress]);

  useEffect(() => {
    const fetchBrowserData = async () => {
      const {historyAddress, recentAddress} = await storageUtilsIpc.invoke.getBrowserHistoryData();
      const bookmarkUrls = all.filter(b => b.type === 'bookmark' && b.url).map(b => b.url as string);
      const combined = [...new Set([...recentAddress, ...historyAddress, ...bookmarkUrls])];
      setHistoryUrls(combined);
    };
    fetchBrowserData();
  }, [all]);

  useEffect(() => {
    let displayValue = effectiveAddress;
    if (effectiveAddress.includes('error_page.html?errorCode')) {
      displayValue = 'Error loading target address...';
    }
    setInputValue(displayValue);

    if (editableRef.current && document.activeElement !== editableRef.current) {
      editableRef.current.textContent = displayValue;
    }
  }, [effectiveAddress]);

  useEffect(() => {
    if (tabId === activeTab && currentView === 'browser' && isEmpty(effectiveAddress)) {
      editableRef.current?.focus();
    }
  }, [activeTab, tabId, currentView, effectiveAddress]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (document.activeElement !== e.currentTarget) {
      e.preventDefault();
    }
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    requestAnimationFrame(() => {
      const element = editableRef.current;
      if (element) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setAutocomplete('');
    if (inputValue !== effectiveAddress) {
      setInputValue(effectiveAddress);
      if (editableRef.current) {
        editableRef.current.textContent = effectiveAddress;
      }
    }
  }, [inputValue, effectiveAddress]);

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const text = e.currentTarget.textContent || '';
      setInputValue(text);
      setAutocomplete(findAutocomplete(text, historyUrls));
    },
    [historyUrls],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(plainText));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    // Trigger input event to update state
    editableRef.current?.dispatchEvent(new Event('input', {bubbles: true}));
  }, []);

  const acceptAutocomplete = useCallback(() => {
    if (autocomplete && editableRef.current) {
      const newValue = inputValue + autocomplete;
      editableRef.current.textContent = newValue;
      setInputValue(newValue);
      setAutocomplete('');

      // Move cursor to end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [autocomplete, inputValue]);

  const existingBookmark = useMemo(() => {
    if (!effectiveAddress) return undefined;
    const formattedCurrent = formatWebAddress(effectiveAddress);
    return all.find(b => b.type === 'bookmark' && b.url && formatWebAddress(b.url) === formattedCurrent);
  }, [all, effectiveAddress]);

  const isBookmarked = !!existingBookmark;

  const handleBookmarkToggle = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const url = formatWebAddress(effectiveAddress || '');
      if (!url) return;

      const targetEl = (e?.currentTarget || editableRef.current) as HTMLElement | null;
      const rect = targetEl?.getBoundingClientRect();
      const customPosition = rect ? {x: Math.floor(rect.x), y: Math.floor(rect.y + rect.height + 4)} : undefined;

      if (existingBookmark) {
        contextMenuIpc.send.openBookmarkEditMenu(
          {
            mode: 'edit',
            item: existingBookmark,
            parentId: existingBookmark.parentId,
          },
          customPosition,
        );
      } else {
        try {
          const created = await addBookmark({
            type: 'bookmark',
            title: browserTitle || url,
            url,
            parentId: 'bookmarks_bar',
          });
          if (created) {
            contextMenuIpc.send.openBookmarkEditMenu(
              {
                mode: 'edit',
                item: created,
                parentId: 'bookmarks_bar',
                isAutoAdded: true,
              },
              customPosition,
            );
          }
        } catch (err) {
          console.error('Failed to auto-add bookmark from address bar:', err);
        }
      }
    },
    [effectiveAddress, existingBookmark, browserTitle, addBookmark],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Hotkey Ctrl+D / Cmd+D to bookmark
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleBookmarkToggle();
        return;
      }

      // Accept autocomplete with Tab or Right Arrow (when at end of input)
      if (autocomplete && (e.key === 'Tab' || e.key === 'ArrowRight')) {
        const selection = window.getSelection();
        const isAtEnd = selection?.focusOffset === inputValue.length;

        if (e.key === 'Tab' || isAtEnd) {
          e.preventDefault();
          acceptAutocomplete();
          return;
        }
      }

      if (e.key === 'Escape') {
        setAutocomplete('');
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const textValue = autocomplete ? inputValue + autocomplete : e.currentTarget.textContent || '';
        setAutocomplete('');
        try {
          const url = formatWebAddress(textValue, true);
          if (setCustomAddress) {
            setCustomAddress(url);
          } else {
            dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: url}));
          }
          browserIpc.send.loadURL(runningCard.id, url);
          storageUtilsIpc.send.addBrowserRecent(url);
          editableRef.current?.blur();
        } catch (err) {
          console.error(`Invalid URL: ${err}`);
        }
      }
    },
    [
      setCustomAddress,
      dispatch,
      activeTab,
      runningCard.id,
      autocomplete,
      inputValue,
      acceptAutocomplete,
      handleBookmarkToggle,
    ],
  );

  const handleContainerClick = useCallback(() => {
    if (document.activeElement !== editableRef.current) {
      editableRef.current?.focus();
    }
  }, []);

  const isAddress = !!effectiveAddress;
  const displayParts = useMemo(
    () => parseAddressForDisplay(isFocused ? inputValue : effectiveAddress),
    [isFocused, inputValue, effectiveAddress],
  );

  return {
    editableRef,
    isAddress,
    isFocused,
    isFavorite: isBookmarked,
    displayParts,
    autocomplete,
    inputValue,
    handleMouseDown,
    handleFocus,
    handleBlur,
    handleInput,
    handleKeyDown,
    handlePaste,
    handleFavoriteToggle: handleBookmarkToggle,
    handleContainerClick,
  };
};
