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
  height: 480,
  width: 680,
  resizable: false,
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

function createSpotlightWindow() {
  const win = new BrowserWindow({...WINDOW_CONFIG});
  classHolder.spotlightChatWindow = win;

  // Center it on active display
  const cursorPos = screen.getCursorScreenPoint();
  const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
  const {x, y, width, height} = activeDisplay.bounds;

  const winWidth = 680;
  const winHeight = 480;
  const winX = Math.round(x + (width - winWidth) / 2);
  const winY = Math.round(y + (height - winHeight) / 2);

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
    win.hide();
  } else {
    // Re-center on active monitor
    const cursorPos = screen.getCursorScreenPoint();
    const activeDisplay = screen.getDisplayNearestPoint(cursorPos);
    const {x, y, width, height} = activeDisplay.bounds;

    const winWidth = 680;
    const winHeight = 480;
    const winX = Math.round(x + (width - winWidth) / 2);
    const winY = Math.round(y + (height - winHeight) / 2);

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
