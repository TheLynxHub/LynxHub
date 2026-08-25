import {useEffect, useSyncExternalStore} from 'react';

import {SettingsBrowserId} from './items/browser';
import {SettingsCardId} from './items/card';
import {SettingsClearId} from './items/clear';
import {SettingsDataId} from './items/data';
import {SettingsGeneralId} from './items/general';
import {SettingsHotkeysId} from './items/hotkeys';
import {SettingsPerformanceId} from './items/performance';
import {SettingsQuickWebId} from './items/quickWeb';
import {SettingsStartupId} from './items/startup';
import {SettingsTerminalId} from './items/terminal';

/**
 * Pre-indexed static keywords, setting labels, descriptions, and synonyms for all built-in sections.
 * This guarantees that searching immediately finds any setting even if the section hasn't been mounted yet.
 */
export const BUILTIN_SECTION_SEARCH_TEXTS: Record<string, string> = {
  [SettingsGeneralId]:
    'General Theme Dark Light System Default appearance mode color scheme ' +
    'Taskbar Options Dock Options Taskbar & Tray Dock & Tray Dock Only Taskbar Only Tray Only ' +
    'Taskbar when focused Tray when minimized system tray dock ' +
    'Dynamic App Title active AI tool name window title ' +
    'Help Improve LynxHub anonymous error reporting telemetry crash reports ' +
    'Include Interactions user interactions breadcrumbs ' +
    'Confirmations Close App confirmation Close Tab confirmation ' +
    'Terminate Process confirmation stop AI Send Exit Signal terminal exit signal Ctrl+C ' +
    'Browser Reload Confirmation force reload unsaved changes page reload',

  [SettingsStartupId]:
    'Startup Launch on System Startup auto start boot windows startup login startup ' +
    'Start in Last Window Size and Position window geometry remember size window bounds ' +
    'Start Maximized fullscreen full window maximize on open ' +
    'Start Minimized tray start silent start background launch ' +
    'Disable Loading Window Animations splash screen fast boot skip animations ' +
    'Session On Startup Open Home Page Resume Last Active Page Restore Previous Session Remember All Tabs ' +
    'Crash Recovery Ask to Restore Always Restore Automatically Never Restore ' +
    'Tab Types to Remember & Restore Standalone Browser Tabs AI Cards & Workspaces Standalone Terminal Tabs ' +
    'Internal App Pages Only Restore Pinned Tabs on Startup',

  [SettingsPerformanceId]:
    'Performance Hardware Acceleration Use Hardware Acceleration GPU lag freeze ' +
    'High DPI Support 4K retina hidpi scaling display resolution ' +
    'Hardware Video Decoding GPU video playback crash codec h264 hevc av1 vp9 ' +
    'GPU Rasterization smooth scrolling page rendering ' +
    'Zero-Copy GPU Buffers memory transfer vram ' +
    'WebAssembly SIMD WASM vector instructions ' +
    'Parallel Downloading speed accelerate concurrent downloads ' +
    'Skia Graphite Dawn backend rendering vulkan metal directx ' +
    'JavaScript Memory Limit V8 heap RAM max old space size 2 GB 4 GB 8 GB ' +
    'Disk Cache Size web cache disk space 256 MB 512 MB 1 GB ' +
    'Force Color Profile sRGB Display P3 Color Spin Gamma 2.4 wide color gamut HDR ' +
    'Media Autoplay Policy audio video playback gesture require page activation ' +
    'Force High-Performance GPU dedicated discrete graphics multi-GPU laptop nvidia amd intel ' +
    'Ignore GPU Blocklist blacklist driver compatibility hardware crash ' +
    'Disable GPU VSync screen tearing input latency gaming vertical sync ' +
    'Disable Frame Rate Limit FPS cap unlimited 144hz 240hz refresh rate power heat',

  [SettingsCardId]:
    'Card Update Check Frequency update interval card update check for updates minutes ' +
    'frequency dashboard cards card refresh dashboard widgets',

  [SettingsTerminalId]:
    'Terminal Use ConPTY Windows PTY pseudo console winpty auto yes no ' +
    'Scrollback lines buffer history lines memory scroll lines ' +
    'Resize Delay debounce delay viewport adapt window resize latency ' +
    'Font Load Timeout custom font observer slow loading JetBrains Mono ' +
    'Font Size text size text scale character size ' +
    'Font Ligatures programming ligatures code ligatures arrows ' +
    'Cursor Style bar block underline caret ' +
    'Cursor Inactive Style unfocused cursor outline none ' +
    'Blink Cursor blinking cursor ' +
    'Colorize Output Text terminal colors errors warnings success info debug ANSI colors syntax highlighting ' +
    'Close Tab on Terminal Exit process exit auto close ' +
    'Send Y with exit auto confirm exit ' +
    'Auto Send Exit Signal Before Killing Ctrl+C kill process terminate sigint sigterm ' +
    'Open Links in New Tab clickable links url hyperlinks middle click ' +
    'Quick Commands shortcuts macros snippets custom commands slot 1 2 3 4 5 6 ' +
    'Reset All Terminal Settings restore terminal defaults',

  [SettingsBrowserId]:
    'Browser Bookmarks Bar visibility always show never show when browser is open ' +
    'Bookmark New Tab Behavior dual tab terminal browser middle click ' +
    'Open links externally system browser default browser ' +
    'User Agent LynxHub Electron Chrome Custom UA string HTTP header ' +
    'Download Location save folder directory path Change Location ' +
    'Download Behavior default ask prompt where to save ' +
    'Global Mute audio sound silence all tabs volume speaker ' +
    'History Limits Recent Addresses Limit Favorites Limit Fav Icons Limit max history retention URL limit ' +
    'Clear Data browser cache cookies favorites history fav icons clear browsing data',

  [SettingsQuickWebId]:
    'Quick Web Floating Window Enable Quick Web master switch global shortcut hotkey Alt+W record shortcut ' +
    'toggle window Browser Session & Storage Profile Shared Session cookies logins Isolated Session sandbox profile ' +
    'Keep in Background Zero-Latency Reopen preload keep alive ' +
    'Hide on Focus Lost Auto-Dismiss blur click outside Always on Top Pin Window stay on top overlay ' +
    'Configured Websites & Preloading Add Website Edit Delete Preload on startup Import Bookmarks ' +
    'Import Browser History reorder URLs',

  [SettingsHotkeysId]:
    'Hotkeys Keyboard Shortcuts Application Shortcuts keybindings Navigation Tabs Cards Terminal ' +
    'Quick Commands Reset to Defaults shortcuts',

  [SettingsDataId]:
    'Data App data path data directory storage folder extensions storage modules folder binaries folder ' +
    'Change data path restart required open folder in file explorer move data storage location',

  [SettingsClearId]:
    'Clear Reset Settings reset all settings factory reset restore defaults clear storage restart required ' +
    'Image Cache cached items cache size last cleanup Auto Cleanup Interval Weekly Monthly Quarterly Never ' +
    'Max Cache Size Limit 100 MB 256 MB 512 MB 1 GB 2 GB 5 GB Clear Image Cache delete cached images',
};

const dynamicSectionTexts = new Map<string, string>();
const listeners = new Set<() => void>();
let registryVersion = 0;

/** Emits a change event to all listeners when the registry updates */
const emitChange = () => {
  registryVersion += 1;
  listeners.forEach(listener => listener());
};

/** Normalizes text by collapsing multiple whitespace characters into single spaces */
const normalizeTextContent = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Sets or updates dynamic searchable text content for a given settings section.
 * @param id The unique ID of the settings section
 * @param text The text content to store
 */
export const setSectionSearchText = (id: string, text: string) => {
  if (!id) return;
  const normalized = normalizeTextContent(text);
  const current = dynamicSectionTexts.get(id);
  if (current === normalized) return;
  dynamicSectionTexts.set(id, normalized);
  emitChange();
};

/**
 * Removes dynamic text for a settings section.
 * @param id The unique ID of the settings section
 */
export const removeSectionSearchText = (id: string) => {
  if (!id) return;
  if (!dynamicSectionTexts.has(id)) return;
  dynamicSectionTexts.delete(id);
  emitChange();
};

/**
 * Retrieves the combined static and dynamic searchable text for a section.
 * @param id The unique ID of the settings section
 */
export const getSectionSearchText = (id: string | undefined): string => {
  if (!id) return '';
  const staticText = BUILTIN_SECTION_SEARCH_TEXTS[id] ?? '';
  const dynamicText = dynamicSectionTexts.get(id) ?? '';
  return normalizeTextContent(`${staticText} ${dynamicText}`);
};

/**
 * Subscribes a listener function to be called whenever the registry changes.
 * @param listener Callback function invoked on change
 * @returns An unsubscribe function
 */
export const subscribeSectionSearchRegistry = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

let cachedMap = new Map<string, string>();
let lastVersion = -1;

/** Retrieves an immutable snapshot of the section search registry with all pre-indexed built-ins */
const getRegistrySnapshot = () => {
  if (lastVersion !== registryVersion) {
    const combined = new Map<string, string>();

    Object.entries(BUILTIN_SECTION_SEARCH_TEXTS).forEach(([id, text]) => {
      combined.set(id, text);
    });

    dynamicSectionTexts.forEach((text, id) => {
      const existing = combined.get(id) ?? '';
      combined.set(id, normalizeTextContent(`${existing} ${text}`));
    });

    cachedMap = combined;
    lastVersion = registryVersion;
  }
  return cachedMap;
};

/**
 * React hook to get a reactive snapshot of the entire search registry.
 * @returns A Map containing section IDs and their searchable texts
 */
export const useSectionSearchSnapshot = () => {
  return useSyncExternalStore(subscribeSectionSearchRegistry, getRegistrySnapshot);
};

/** Helper to join arrays of strings or return strings as-is */
const toStaticText = (staticText?: string | string[]) => {
  if (!staticText) return '';
  return Array.isArray(staticText) ? staticText.join(' ') : staticText;
};

/**
 * Hook that auto-registers a specific section ID to the search registry.
 * It uses a MutationObserver to actively collect any textual content inside the rendered section
 * and updates its registry entry proactively.
 * @param sectionId The target section element ID
 * @param staticText Additional static strings to be merged with dynamic text content
 */
export const useRegisterSectionSearch = (sectionId?: string, staticText?: string | string[]) => {
  const staticTextValue = toStaticText(staticText);

  useEffect(() => {
    if (!sectionId) return;

    // Built-in sections already have exhaustive pre-indexed keyword registries in BUILTIN_SECTION_SEARCH_TEXTS.
    // Avoid running heavy DOM MutationObservers on them to eliminate re-render cycles during search.
    if (sectionId in BUILTIN_SECTION_SEARCH_TEXTS) {
      if (staticTextValue) {
        setSectionSearchText(sectionId, staticTextValue);
      }
      return;
    }

    let observer: MutationObserver | null = null;
    let frameId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let activeElement: HTMLElement | null = null;

    const update = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const contentText = activeElement?.textContent ?? '';
        setSectionSearchText(sectionId, `${contentText} ${staticTextValue}`.trim());
      }, 300);
    };

    const connect = () => {
      const element = document.getElementById(sectionId);
      if (!element) {
        frameId = window.requestAnimationFrame(connect);
        return;
      }

      activeElement = element;
      const contentText = activeElement?.textContent ?? '';
      setSectionSearchText(sectionId, `${contentText} ${staticTextValue}`.trim());

      observer = new MutationObserver(update);
      observer.observe(element, {childList: true, subtree: true, characterData: true});
    };

    connect();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      observer?.disconnect();
    };
  }, [sectionId, staticTextValue]);
};
