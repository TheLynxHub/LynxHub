import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {LynxHotkey} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, BrowserWindowConstructorOptions, globalShortcut, screen} from 'electron';

import icon from '../../../resources/icon.png?asset';

let currentHotkeyStr = '';

function hotkeyToAccelerator(hotkey: LynxHotkey): string {
  if (!hotkey || !hotkey.key) return '';
  const parts: string[] = [];
  if (hotkey.control) parts.push('CommandOrControl');
  if (hotkey.alt) parts.push('Alt');
  if (hotkey.shift) parts.push('Shift');
  if (hotkey.meta) parts.push('CmdOrCtrl');

  let key = hotkey.key;
  if (key.toLowerCase() === 'arrowup') key = 'Up';
  else if (key.toLowerCase() === 'arrowdown') key = 'Down';
  else if (key.toLowerCase() === 'arrowleft') key = 'Left';
  else if (key.toLowerCase() === 'arrowright') key = 'Right';
  else if (key.toLowerCase() === ' ') key = 'Space';
  else if (key.toLowerCase() === 'escape') key = 'Esc';
  else {
    key = key.toUpperCase();
  }

  parts.push(key);
  return parts.join('+');
}

export function RegisterSpotlightHotkey() {
  const storageManager = classHolder.storageManager;
  const hotkeys = storageManager?.getData('app')?.hotkeys || [];
  const spotlightHotkey = hotkeys.find(h => h.name === 'spotlightChat');

  if (currentHotkeyStr) {
    try {
      globalShortcut.unregister(currentHotkeyStr);
    } catch (e) {
      console.error('Failed to unregister global shortcut:', e);
    }
    currentHotkeyStr = '';
  }

  if (!spotlightHotkey || !spotlightHotkey.key) {
    return;
  }

  const accel = hotkeyToAccelerator(spotlightHotkey);
  if (!accel) return;

  try {
    const success = globalShortcut.register(accel, () => {
      ToggleSpotlightWindow();
    });
    if (success) {
      currentHotkeyStr = accel;
    } else {
      console.error('Failed to register global hotkey:', accel);
    }
  } catch (e) {
    console.error('Error registering global hotkey:', e);
  }
}

const WINDOW_CONFIG: BrowserWindowConstructorOptions = {
  frame: false,
  show: false,
  height: 577,
  width: 977,
  minHeight: 480,
  minWidth: 680,
  maximizable: false,
  minimizable: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  icon,
  webPreferences: {
    preload: path.join(__dirname, '../preload/index.cjs'),
    sandbox: false,
  },
};

const DEFAULT_WIDTH = 977;
const DEFAULT_HEIGHT = 577;

function saveSpotlightBounds(win: BrowserWindow) {
  if (!win || win.isDestroyed()) return;
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  if (!appConfig) return;

  const bounds = win.getBounds();
  const update: any = {};

  if (appConfig.spotlightRememberSize) {
    update.spotlightLastSize = {
      width: bounds.width,
      height: bounds.height,
    };
  }

  if (appConfig.spotlightRememberPosition) {
    update.spotlightLastPosition = {
      x: bounds.x,
      y: bounds.y,
    };
  }

  if (Object.keys(update).length > 0) {
    storageManager.updateData('app', update);
  }
}

function createSpotlightWindow() {
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  const spotlightAlwaysOnTop = appConfig?.spotlightAlwaysOnTop ?? true;
  const spotlightShowTaskbar = appConfig?.spotlightShowTaskbar ?? false;

  const win = new BrowserWindow({
    ...WINDOW_CONFIG,
    alwaysOnTop: spotlightAlwaysOnTop,
    skipTaskbar: !spotlightShowTaskbar,
  });
  classHolder.spotlightChatWindow = win;

  // Center it on active display OR load position/size
  const cursorPos = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
  const {x, y, width, height} = activeDisplay.bounds;

  let winWidth = DEFAULT_WIDTH;
  let winHeight = DEFAULT_HEIGHT;
  if (appConfig?.spotlightRememberSize && appConfig?.spotlightLastSize) {
    winWidth = appConfig.spotlightLastSize.width;
    winHeight = appConfig.spotlightLastSize.height;
  }

  let winX = Math.round(x + (width - winWidth) / 2);
  let winY = Math.round(y + (height - winHeight) / 2);
  if (appConfig?.spotlightRememberPosition && appConfig?.spotlightLastPosition) {
    winX = appConfig.spotlightLastPosition.x;
    winY = appConfig.spotlightLastPosition.y;
  }

  win.setBounds({x: winX, y: winY, width: winWidth, height: winHeight});

  loadWindowContent(win);
  setupWindowListeners(win);
}

function loadWindowContent(window: BrowserWindow) {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/spotlightChat.html`);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/spotlightChat.html`));
  }
}

function setupWindowListeners(window: BrowserWindow) {
  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  window.on('close', () => {
    saveSpotlightBounds(window);
  });

  window.on('closed', () => {
    classHolder.spotlightChatWindow = undefined;
  });
}

export function ToggleSpotlightWindow() {
  const win = classHolder.spotlightChatWindow;
  if (!win || win.isDestroyed()) {
    createSpotlightWindow();
    return;
  }

  if (win.isVisible()) {
    saveSpotlightBounds(win);
    win.hide();
  } else {
    const storageManager = classHolder.storageManager;
    const appConfig = storageManager?.getData('app');

    // Re-center on active monitor OR restore last bounds
    const cursorPos = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
    const {x, y, width, height} = activeDisplay.bounds;

    const currentBounds = win.getBounds();
    let winWidth = currentBounds.width;
    let winHeight = currentBounds.height;

    if (appConfig?.spotlightRememberSize && appConfig?.spotlightLastSize) {
      winWidth = appConfig.spotlightLastSize.width;
      winHeight = appConfig.spotlightLastSize.height;
    } else if (!appConfig?.spotlightRememberSize) {
      winWidth = DEFAULT_WIDTH;
      winHeight = DEFAULT_HEIGHT;
    }

    let winX: number;
    let winY: number;

    if (appConfig?.spotlightRememberPosition && appConfig?.spotlightLastPosition) {
      winX = appConfig.spotlightLastPosition.x;
      winY = appConfig.spotlightLastPosition.y;
    } else {
      winX = Math.round(x + (width - winWidth) / 2);
      winY = Math.round(y + (height - winHeight) / 2);
    }

    win.setBounds({x: winX, y: winY, width: winWidth, height: winHeight});
    win.show();
    win.focus();
  }
}

export function CloseSpotlightWindow() {
  const win = classHolder.spotlightChatWindow;
  if (win && !win.isDestroyed()) {
    win.close();
  }
}
