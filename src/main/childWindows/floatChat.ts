import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {LynxHotkey} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';
import {app, BrowserWindow, BrowserWindowConstructorOptions, globalShortcut, screen} from 'electron';

import icon from '../../../resources/icon.png?asset';

let currentHotkeyStr = '';
let isAppQuitting = false;

app.on('before-quit', () => {
  isAppQuitting = true;
});

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

export function RegisterFloatChatHotkey() {
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  const disableFloatChat = appConfig?.disableFloatChat ?? false;

  if (currentHotkeyStr) {
    try {
      globalShortcut.unregister(currentHotkeyStr);
    } catch (e) {
      console.error('Failed to unregister global shortcut:', e);
    }
    currentHotkeyStr = '';
  }

  if (disableFloatChat) {
    return;
  }

  const hotkeys = appConfig?.hotkeys || [];
  const floatChatHotkey = hotkeys.find(h => h.name === 'floatChat');

  if (!floatChatHotkey || !floatChatHotkey.key) {
    return;
  }

  const accel = hotkeyToAccelerator(floatChatHotkey);
  if (!accel) return;

  try {
    const success = globalShortcut.register(accel, () => {
      ToggleFloatChatWindow();
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

function saveFloatChatBounds(win: BrowserWindow) {
  if (!win || win.isDestroyed()) return;
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  if (!appConfig) return;

  const bounds = win.getBounds();
  const update: any = {};

  if (appConfig.floatChatRememberSize) {
    update.floatChatLastSize = {
      width: bounds.width,
      height: bounds.height,
    };
  }

  if (appConfig.floatChatRememberPosition) {
    update.floatChatLastPosition = {
      x: bounds.x,
      y: bounds.y,
    };
  }

  if (Object.keys(update).length > 0) {
    storageManager.updateData('app', update);
  }
}

function createFloatChatWindow() {
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  if (appConfig?.disableFloatChat) {
    return;
  }
  const floatChatAlwaysOnTop = appConfig?.floatChatAlwaysOnTop ?? true;
  const floatChatShowTaskbar = appConfig?.floatChatShowTaskbar ?? false;

  const win = new BrowserWindow({
    ...WINDOW_CONFIG,
    alwaysOnTop: floatChatAlwaysOnTop,
    skipTaskbar: !floatChatShowTaskbar,
  });
  classHolder.floatChatWindow = win;

  // Center it on active display OR load position/size
  const cursorPos = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
  const {x, y, width, height} = activeDisplay.bounds;

  let winWidth = DEFAULT_WIDTH;
  let winHeight = DEFAULT_HEIGHT;
  if (appConfig?.floatChatRememberSize && appConfig?.floatChatLastSize) {
    winWidth = appConfig.floatChatLastSize.width;
    winHeight = appConfig.floatChatLastSize.height;
  }

  let winX = Math.round(x + (width - winWidth) / 2);
  let winY = Math.round(y + (height - winHeight) / 2);
  if (appConfig?.floatChatRememberPosition && appConfig?.floatChatLastPosition) {
    winX = appConfig.floatChatLastPosition.x;
    winY = appConfig.floatChatLastPosition.y;
  }

  win.setBounds({x: winX, y: winY, width: winWidth, height: winHeight});

  loadWindowContent(win);
  setupWindowListeners(win);
}

function loadWindowContent(window: BrowserWindow) {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/floatChat.html`);
  } else {
    window.loadFile(path.join(__dirname, `../renderer/floatChat.html`));
  }
}

function setupWindowListeners(window: BrowserWindow) {
  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });

  window.on('show', () => {
    window.webContents.send('floatChat:window-shown');
  });

  window.on('close', e => {
    const storageManager = classHolder.storageManager;
    const appConfig = storageManager?.getData('app');
    const keepInBackground = appConfig?.floatChatKeepInBackground ?? true;
    if (keepInBackground && !isAppQuitting) {
      e.preventDefault();
      saveFloatChatBounds(window);
      window.hide();
      classHolder.browserManager?.handleFloatChatHidden();
    } else {
      saveFloatChatBounds(window);
      classHolder.browserManager?.handleFloatChatHidden();
    }
  });

  window.on('closed', () => {
    classHolder.floatChatWindow = undefined;
  });
}

export function ToggleFloatChatWindow() {
  const storageManager = classHolder.storageManager;
  const appConfig = storageManager?.getData('app');
  if (appConfig?.disableFloatChat) {
    return;
  }

  const win = classHolder.floatChatWindow;
  if (!win || win.isDestroyed()) {
    createFloatChatWindow();
    return;
  }

  if (win.isVisible()) {
    saveFloatChatBounds(win);
    const keepInBackground = appConfig?.floatChatKeepInBackground ?? true;
    if (keepInBackground) {
      win.hide();
      classHolder.browserManager?.handleFloatChatHidden();
    } else {
      win.close();
    }
  } else {
    // Re-center on active monitor OR restore last bounds
    const cursorPos = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
    const {x, y, width, height} = activeDisplay.bounds;

    const currentBounds = win.getBounds();
    let winWidth = currentBounds.width;
    let winHeight = currentBounds.height;

    if (appConfig?.floatChatRememberSize && appConfig?.floatChatLastSize) {
      winWidth = appConfig.floatChatLastSize.width;
      winHeight = appConfig.floatChatLastSize.height;
    } else if (!appConfig?.floatChatRememberSize) {
      winWidth = DEFAULT_WIDTH;
      winHeight = DEFAULT_HEIGHT;
    }

    let winX: number;
    let winY: number;

    if (appConfig?.floatChatRememberPosition && appConfig?.floatChatLastPosition) {
      winX = appConfig.floatChatLastPosition.x;
      winY = appConfig.floatChatLastPosition.y;
    } else {
      winX = Math.round(x + (width - winWidth) / 2);
      winY = Math.round(y + (height - winHeight) / 2);
    }

    win.setBounds({x: winX, y: winY, width: winWidth, height: winHeight});
    win.show();
    win.focus();
  }
}

export function CloseFloatChatWindow(force = false) {
  const win = classHolder.floatChatWindow;
  if (win && !win.isDestroyed()) {
    if (force) {
      win.destroy();
    } else {
      win.close();
    }
  }
}
