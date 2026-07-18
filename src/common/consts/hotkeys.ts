import {isMac} from '@lynx_common/utils';

import {LynxHotkey} from '../types/ipc';

/**
 * Names of available hotkeys.
 */
export const Hotkey_Names = {
  fullscreen: 'fullscreen',
  toggleNav: 'toggleNav',
  toggleAiView: 'toggleAiView',

  closeTab: 'closeTab',
  newTab: 'newTab',
  newBrowserTab: 'newBrowserTab',
  newTerminalTab: 'newTerminalTab',
  newBrowserTerminalTab: 'newBrowserTerminalTab',
  refreshTab: 'refreshTab',
  switchTab: 'switchTab',
  nextTab: 'nextTab',
  prevTab: 'prevTab',

  findInPage: 'findInPage',
  toggleDevTools: 'toggleDevTools',
  terminalQuick1: 'terminalQuick1',
  terminalQuick2: 'terminalQuick2',
  terminalQuick3: 'terminalQuick3',
  terminalQuick4: 'terminalQuick4',
  terminalQuick5: 'terminalQuick5',
  terminalQuick6: 'terminalQuick6',
  spotlightChat: 'spotlightChat',
} as const;

/**
 * Grouping of hotkeys for display in settings/help.
 */
export const Hotkey_Sections: readonly {kind: string; title: string; includes: string[]}[] = [
  {
    kind: 'app',
    title: 'Application',
    includes: [Hotkey_Names.fullscreen, Hotkey_Names.toggleNav, Hotkey_Names.spotlightChat],
  },
  {
    kind: 'tab',
    title: 'Tab',
    includes: [
      Hotkey_Names.newTab,
      Hotkey_Names.newBrowserTab,
      Hotkey_Names.newTerminalTab,
      Hotkey_Names.newBrowserTerminalTab,
      Hotkey_Names.toggleAiView,
      Hotkey_Names.switchTab,
      Hotkey_Names.nextTab,
      Hotkey_Names.prevTab,
      Hotkey_Names.closeTab,
    ],
  },
  {
    kind: 'browser',
    title: 'Browser',
    includes: [Hotkey_Names.toggleDevTools, Hotkey_Names.findInPage, Hotkey_Names.refreshTab],
  },
  {
    kind: 'terminal',
    title: 'Terminal',
    includes: [
      Hotkey_Names.terminalQuick1,
      Hotkey_Names.terminalQuick2,
      Hotkey_Names.terminalQuick3,
      Hotkey_Names.terminalQuick4,
      Hotkey_Names.terminalQuick5,
      Hotkey_Names.terminalQuick6,
    ],
  },
];

/**
 * Display titles for hotkeys.
 */
export const Hotkey_Titles = {
  fullscreen: 'Toggle Fullscreen',
  toggleNav: 'Toggle Navigation Bar',
  toggleAiView: 'Toggle View',

  closeTab: 'Close Active Tab',
  newTab: 'New Tab',
  newBrowserTab: 'New Browser Tab',
  newTerminalTab: 'New Terminal Tab',
  newBrowserTerminalTab: 'New Combination Tab',
  refreshTab: 'Refresh Active Tab',
  switchTab: 'Switch Tab',
  nextTab: 'Next Tab',
  prevTab: 'Previous Tab',

  findInPage: 'Find in web page',
  toggleDevTools: 'Toggle DevTools',
  terminalQuick1: 'Terminal Quick Command 1',
  terminalQuick2: 'Terminal Quick Command 2',
  terminalQuick3: 'Terminal Quick Command 3',
  terminalQuick4: 'Terminal Quick Command 4',
  terminalQuick5: 'Terminal Quick Command 5',
  terminalQuick6: 'Terminal Quick Command 6',
  spotlightChat: 'Toggle Spotlight Chat',
} as const;

/**
 * Descriptions for hotkeys.
 */
export const Hotkey_Desc = {
  fullscreen: 'Use this hotkey to switch between fullscreen and windowed modes.',
  toggleNav: 'Use this hotkey to show or hide the navigation panel.',
  toggleAiView: 'Use this hotkey to toggle between terminal and browser views.',

  closeTab: 'Use this hotkey to close the active tab.',
  newTab: 'Use this hotkey to open a new tab.',
  newBrowserTab: 'Use this hotkey to open a new browser tab.',
  newTerminalTab: 'Use this hotkey to open a new terminal tab.',
  newBrowserTerminalTab: 'Use this hotkey to open a combined browser and terminal tab.',
  refreshTab: 'Use this hotkey to reload the current tab.',
  switchTab: 'Use this hotkey to switch between tabs.',
  nextTab: 'Use this hotkey to switch to the next tabs.',
  prevTab: 'Use this hotkey to switch to the previous tabs.',

  findInPage: 'Use this hotkey to search for text within the current web page.',
  toggleDevTools: 'Use this hotkey to open or close DevTools for the current browser tab.',
  terminalQuick1: 'Executes the first configured terminal quick command in the active terminal.',
  terminalQuick2: 'Executes the second configured terminal quick command in the active terminal.',
  terminalQuick3: 'Executes the third configured terminal quick command in the active terminal.',
  terminalQuick4: 'Executes the fourth configured terminal quick command in the active terminal.',
  terminalQuick5: 'Executes the fifth configured terminal quick command in the active terminal.',
  terminalQuick6: 'Executes the sixth configured terminal quick command in the active terminal.',
  spotlightChat: 'Show/hide the spotlight quick online chat window.',
} as const;

/**
 * Generates the default hotkey configuration.
 * @returns Array of default hotkey settings.
 */
export const Get_Default_Hotkeys = (): LynxHotkey[] => {
  return [
    {
      name: Hotkey_Names.spotlightChat,
      meta: false,
      alt: true,
      control: false,
      shift: false,
      key: ' ', // Alt+Space
    },
    {
      name: Hotkey_Names.fullscreen,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: isMac ? 'f12' : 'f11',
    },
    {
      name: Hotkey_Names.toggleNav,
      meta: false,
      alt: true,
      control: false,
      shift: false,
      key: 'a',
    },
    {
      name: Hotkey_Names.toggleAiView,
      meta: false,
      alt: true,
      control: false,
      shift: false,
      key: 'q',
    },

    {
      name: Hotkey_Names.closeTab,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: false,
      key: 'w',
    },
    {
      name: Hotkey_Names.refreshTab,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: 'f5',
    },
    {
      name: Hotkey_Names.switchTab,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: false,
      key: 'tab',
    },
    {
      name: Hotkey_Names.nextTab,
      meta: false,
      alt: true,
      control: false,
      shift: false,
      key: 'arrowright',
    },
    {
      name: Hotkey_Names.prevTab,
      meta: false,
      alt: true,
      control: false,
      shift: false,
      key: 'arrowleft',
    },
    {
      name: Hotkey_Names.newTab,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: false,
      key: 't',
    },
    {
      name: Hotkey_Names.newBrowserTab,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: true,
      key: 't',
    },
    {
      name: Hotkey_Names.newTerminalTab,
      meta: false,
      alt: true,
      control: isMac,
      shift: false,
      key: 't',
    },
    {
      name: Hotkey_Names.newBrowserTerminalTab,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: false,
      key: 'e',
    },
    {
      name: Hotkey_Names.findInPage,
      meta: isMac,
      alt: false,
      control: !isMac,
      shift: false,
      key: 'f',
    },
    {
      name: Hotkey_Names.toggleDevTools,
      meta: isMac,
      alt: isMac,
      control: !isMac,
      shift: !isMac,
      key: 'i',
    },
    {
      name: Hotkey_Names.terminalQuick1,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
    {
      name: Hotkey_Names.terminalQuick2,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
    {
      name: Hotkey_Names.terminalQuick3,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
    {
      name: Hotkey_Names.terminalQuick4,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
    {
      name: Hotkey_Names.terminalQuick5,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
    {
      name: Hotkey_Names.terminalQuick6,
      meta: false,
      alt: false,
      control: false,
      shift: false,
      key: '',
    },
  ];
};
