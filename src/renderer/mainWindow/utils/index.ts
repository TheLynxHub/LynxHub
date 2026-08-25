import {modalActions} from '@lynx/redux/reducers/modals';
import type {AppDispatch} from '@lynx/redux/store';
import {isMac} from '@lynx_common/utils';
import Fuse from 'fuse.js';
import {capitalize, isEmpty} from 'lodash-es';

/**
 * Formats a number with K, M, B, T suffixes for thousands, millions, billions, and trillions.
 * @param num - The number to format
 * @returns Formatted string representation of the number
 */
export function formatNumber(num: number): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];

  if (!Number.isFinite(num)) return num.toString();

  const absoluteValue = Math.abs(num);
  if (absoluteValue < 1000) return num.toString();

  const magnitude = Math.min(Math.floor(Math.log10(absoluteValue) / 3), suffixes.length - 1);
  const scaled = num / Math.pow(10, magnitude * 3);

  return `${scaled.toFixed(1).replace(/\.0$/, '')}${suffixes[magnitude]}`;
}

/**
 * Converts a Blob to a data URL.
 * @param blob - The Blob to convert
 * @returns Promise resolving to the data URL
 */
export function convertBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts an array of strings to an array of objects with a 'name' property.
 * @param arr - Array of strings
 * @returns Array of objects with 'name' property
 */
export const convertArrToObject = (arr: string[]): {name: string}[] => arr.map(name => ({name}));

/**
 * Checks if WebGL2 is supported in the current environment.
 * @returns Boolean indicating WebGL2 support
 */
export function isWebgl2Supported(): boolean {
  if (!window.WebGL2RenderingContext) return false;
  const canvas = document.createElement('canvas');
  return canvas.getContext('webgl2', {depth: false, antialias: false}) instanceof WebGL2RenderingContext;
}

/**
 * Searches for words within an array of strings.
 * @param searchText - The text to search for
 * @param targetTexts - Array of strings to search within
 * @returns Boolean indicating if all search words are found
 */
export function searchInStrings(searchText: string, targetTexts: (string | undefined)[] | undefined): boolean {
  if (isEmpty(searchText) || !targetTexts) return true;

  const filteredTexts = targetTexts.filter(Boolean) as string[];
  if (filteredTexts.length === 0) return false;

  const normalizedQuery = searchText.trim().toLowerCase();
  if (!normalizedQuery) return true;

  // Direct fast substring check
  const hasExactSubstring = filteredTexts.some(text => text.toLowerCase().includes(normalizedQuery));
  if (hasExactSubstring) return true;

  // Multi-word check
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const allWordsMatch = words.every(word => filteredTexts.some(text => text.toLowerCase().includes(word)));
    if (allWordsMatch) return true;
  }

  const fuse = new Fuse(filteredTexts, {
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return fuse.search(searchText).length > 0;
}

export type HotkeyLike = {
  key?: string;
  control?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

export function formatHotkey(hotkey: HotkeyLike | null): string {
  if (!hotkey || !hotkey.key) {
    return 'Not Set';
  }

  const parts: string[] = [];

  // On macOS, show Cmd for meta, Ctrl for control
  // On Windows/Linux, show Ctrl for both control and meta (for compatibility)
  if (isMac) {
    if (hotkey.control) parts.push('Ctrl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.meta) parts.push('Cmd');
  } else {
    if (hotkey.control || hotkey.meta) parts.push('Ctrl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
  }

  let displayKey: string;
  switch (hotkey.key.toLowerCase()) {
    case 'arrowup':
      displayKey = 'Up';
      break;
    case 'arrowdown':
      displayKey = 'Down';
      break;
    case 'arrowleft':
      displayKey = 'Left';
      break;
    case 'arrowright':
      displayKey = 'Right';
      break;
    case ' ':
      displayKey = 'Space';
      break;
    case 'escape':
      displayKey = 'Esc';
      break;

    default:
      displayKey = capitalize(hotkey.key);
  }

  parts.push(displayKey);
  return parts.join(' + ');
}

export function getUserAgent() {
  const os = window.osPlatform;

  switch (os) {
    case 'darwin':
      return (
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' +
        ' (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      );
    case 'linux':
      return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36';
    case 'win32':
    default:
      return (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' +
        ' (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
      );
  }
}

export function showRestartModal(dispatch: AppDispatch, message: string) {
  dispatch(modalActions.openRestartModal({message}));
}
