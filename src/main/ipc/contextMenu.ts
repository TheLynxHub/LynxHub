import {contextMenuChannels} from '@lynx_common/consts/ipcChannels/contextMenu';
import {ElementResizeData} from '@lynx_common/types';
import {ContextMenuVolumeData, NavHistory} from '@lynx_common/types/ipc';
import {isLinux, terminalLineEnding} from '@lynx_common/utils';
import {ptyWrite} from '@lynx_main/ipc/methods/pty';
import {changeWindowState} from '@lynx_main/ipc/methods/windowUtils';
import BrowserManager from '@lynx_main/managers/browser';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, ContextMenuParams, dialog} from 'electron';

import {applicationIpc} from './application';
import {browserIpc} from './browser';
import {downloadManagerIpc} from './downloadManager';
import lynxIpc from './ipcWrapper';
import {downloadImageToClipboard} from './methods/windowUtils';
import {sendToContextMenu, sendToMain} from './sender';

/**
 * Initializes listeners for context menu events.
 */
export default async function listenContextMenu() {
  const contextMenuManager = await classHolder.waitForClass('contextMenuManager');

  const getWebContents = (id: number) => contextMenuManager.getContentById(id);

  // Resizes the context menu window
  contextMenuIpc.on.resizeWindow(data => contextMenuManager.resizeContextMenu(data));

  // Show the context menu window after renderer size check
  contextMenuIpc.on.showReady(data => contextMenuManager.applySizeAndShow(data));

  // Edit operations
  contextMenuIpc.on.copy(id => getWebContents(id)?.copy());
  contextMenuIpc.on.cut(id => getWebContents(id)?.cut());
  contextMenuIpc.on.paste(id => getWebContents(id)?.paste());
  contextMenuIpc.on.selectAll(id => getWebContents(id)?.selectAll());
  contextMenuIpc.on.undo(id => getWebContents(id)?.undo());
  contextMenuIpc.on.redo(id => getWebContents(id)?.redo());

  // Image operations
  contextMenuIpc.on.downloadImage((id, url) => getWebContents(id)?.downloadURL(url));
  contextMenuIpc.on.copyImage(url => downloadImageToClipboard(url));

  // Search with Google
  contextMenuIpc.on.searchWithGoogle(text => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    applicationIpc.send.onNewTab(searchUrl);
  });

  // Inspect element
  contextMenuIpc.on.inspectElement((id, x, y) => {
    const webContents = getWebContents(id);
    if (webContents) {
      webContents.inspectElement(x, y);
    }
  });

  // Show/Hide context menu
  contextMenuIpc.on.hideWindow(() => contextMenuManager.hideContextMenu());

  // Replace misspelling
  contextMenuIpc.on.replaceMisspelling((id, text) => getWebContents(id)?.replaceMisspelling(text));

  // Navigation
  contextMenuIpc.on.newTab(url => applicationIpc.send.onNewTab(url));
  contextMenuIpc.on.navigate((id, action) => {
    const history = getWebContents(id)?.navigationHistory;
    switch (action) {
      case 'back':
        history?.goBack();
        break;
      case 'forward':
        history?.goForward();
        break;
      case 'refresh':
        getWebContents(id)?.reload();
        break;
    }
  });

  // AI & Tab Management
  contextMenuIpc.on.relaunchAI(id => contextMenuIpc.send.onRelaunchAI(id));
  contextMenuIpc.on.stopAI(id => contextMenuIpc.send.onStopAI(id));
  contextMenuIpc.on.removeTab(tabID => contextMenuIpc.send.onRemoveTab(tabID));
}

/**
 * Listens for browser events that should trigger context menu actions.
 * @param browserManager - The browser manager instance.
 */
export async function listenForBrowserChannels(browserManager: BrowserManager) {
  const [contextMenuManager, appManager] = await Promise.all([
    classHolder.waitForClass('contextMenuManager'),
    classHolder.waitForClass('appManager'),
  ]);

  const setPosition = (customPosition?: {x: number; y: number}) =>
    contextMenuManager.setCustomContextPosition(customPosition);

  // Open Find in Page
  browserIpc.on.openFindInPage(async (id, customPosition) => {
    if (isLinux) return;
    setPosition(customPosition);

    const webContents = browserManager.getWebContentsById(id);
    let selectedText = '';

    if (webContents && !webContents.isDestroyed()) {
      try {
        selectedText = await webContents.executeJavaScript('window.getSelection().toString()');
      } catch (error) {
        console.error('Failed to get selected text:', error);
      }
    }

    contextMenuIpc.send.onFind(id, selectedText);
    contextMenuManager.showContextMenu();
  });

  // Open Zoom control
  browserIpc.on.openZoom((id, customPosition) => {
    if (isLinux) return;
    setPosition(customPosition);
    contextMenuIpc.send.onZoom(id, browserManager.getCurrentZoom(id));
    contextMenuManager.showContextMenu();
  });

  // Open Volume control
  browserIpc.on.openVolume((data, customPosition) => {
    if (isLinux) return;
    setPosition(customPosition);
    contextMenuIpc.send.onVolume(data);
    contextMenuManager.showContextMenu();
  });

  // Open Terminate AI
  contextMenuIpc.on.openTerminateAI(id => {
    if (isLinux) {
      const mainWindow = appManager.getMainWindow();
      const choice = dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
        type: 'question',
        buttons: ['Cancel', 'Relaunch', 'Terminate'],
        defaultId: 2,
        cancelId: 0,
        message: 'Confirm Terminate Process',
        detail: 'Are you sure you want to terminate or relaunch the process?',
      });
      if (choice === 1) {
        contextMenuIpc.send.onRelaunchAI(id);
      } else if (choice === 2) {
        contextMenuIpc.send.onStopAI(id);
      }
      return;
    }
    setPosition(undefined);
    contextMenuIpc.send.onTerminateAI(id);
    contextMenuManager.showContextMenu();
  });

  // Open send exit signal process
  contextMenuIpc.on.openSendExitSignal(id => {
    if (isLinux) {
      const mainWindow = appManager.getMainWindow();
      const choice = dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
        type: 'question',
        buttons: ['Cancel', 'Exit (Ctrl+C)', 'Exit with Y (Ctrl+C + Y)'],
        defaultId: 2,
        cancelId: 0,
        message: 'Confirm Sending Exit Signal',
        detail: 'Select how you want to exit the running process.',
      });
      if (choice === 1) {
        ptyWrite(id, '\x03');
      } else if (choice === 2) {
        ptyWrite(id, '\x03');
        ptyWrite(id, 'y' + terminalLineEnding);
      }
      return;
    }
    setPosition(undefined);
    contextMenuIpc.send.onSendExitProcess(id);
    contextMenuManager.showContextMenu();
  });

  // Open Terminate Tab
  contextMenuIpc.on.openTerminateTab((id, customPosition) => {
    if (isLinux) {
      const mainWindow = appManager.getMainWindow();
      const choice = dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
        type: 'question',
        buttons: ['Cancel', 'Terminate'],
        defaultId: 1,
        cancelId: 0,
        message: 'Confirm Terminate Process',
        detail: 'Are you sure you want to terminate this tab?',
      });
      if (choice === 1) {
        contextMenuIpc.send.onRemoveTab(id);
      }
      return;
    }
    setPosition(customPosition);
    contextMenuIpc.send.onTerminateTab(id);
    contextMenuManager.showContextMenu();
  });

  // Open Close App
  contextMenuIpc.on.openCloseApp(() => {
    if (isLinux) {
      const mainWindow = appManager.getMainWindow();
      const choice = dialog.showMessageBoxSync(mainWindow as BrowserWindow, {
        type: 'question',
        buttons: ['Cancel', 'Restart', 'Exit'],
        defaultId: 2,
        cancelId: 0,
        message: 'Confirm Exit',
        detail: 'Are you sure you want to exit or restart?',
      });
      if (choice === 1) {
        changeWindowState('restart');
      } else if (choice === 2) {
        changeWindowState('close');
      }
      return;
    }
    setPosition(undefined);
    contextMenuIpc.send.onCloseApp();
    contextMenuManager.showContextMenu();
  });

  // Open Downloads Menu
  downloadManagerIpc.on.openDownloadsMenu(() => {
    if (isLinux) return;
    setPosition(undefined);
    contextMenuIpc.send.onDownloads();
    contextMenuManager.showContextMenu();
  });
}

/**
 * IPC interface for context menu events.
 */
export const contextMenuIpc = {
  send: {
    /** Sends event to relaunch AI */
    onRelaunchAI: (id: string) => sendToMain(contextMenuChannels.onRelaunchAI, id),
    /** Sends event to stop AI */
    onStopAI: (id: string) => sendToMain(contextMenuChannels.onStopAI, id),
    /** Sends event to remove a tab */
    onRemoveTab: (tabID: string) => sendToMain(contextMenuChannels.onRemoveTab, tabID),

    /** Sends request to show context menu to renderer */
    requestShow: () => sendToContextMenu(contextMenuChannels.requestShow),

    /** Sends right-click event to context menu */
    rightClick: (params: ContextMenuParams, navHistory: NavHistory, id: number) =>
      sendToContextMenu(contextMenuChannels.rightClick, params, navHistory, id),
    /** Sends find in page event to context menu */
    onFind: (id: string, selectedText?: string) => sendToContextMenu(contextMenuChannels.onFind, id, selectedText),
    /** Sends zoom event to context menu */
    onZoom: (id: string, factor: number | undefined) => sendToContextMenu(contextMenuChannels.onZoom, id, factor),
    /** Sends volume event to context menu */
    onVolume: (data: ContextMenuVolumeData) => sendToContextMenu(contextMenuChannels.onVolume, data),
    /** Sends terminate AI event to context menu */
    onTerminateAI: (id: string) => sendToContextMenu(contextMenuChannels.onTerminateAI, id),
    /** Sends exit signal event to context menu */
    onSendExitProcess: (id: string) => sendToContextMenu(contextMenuChannels.onSendExitProcess, id),
    /** Sends terminate tab event to context menu */
    onTerminateTab: (id: string) => sendToContextMenu(contextMenuChannels.onTerminateTab, id),
    /** Sends close app event to context menu */
    onCloseApp: () => sendToContextMenu(contextMenuChannels.onCloseApp),
    /** Sends downloads event to context menu */
    onDownloads: () => sendToContextMenu(contextMenuChannels.onDownloads),
  },
  on: {
    /** Listens for show ready request from renderer */
    showReady: (callback: (data: ElementResizeData) => void) => lynxIpc.on(contextMenuChannels.showReady, callback),
    /** Listens for resize window request */
    resizeWindow: (callback: (data: ElementResizeData) => void) =>
      lynxIpc.on(contextMenuChannels.resizeWindow, callback),
    /** Listens for copy request */
    copy: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.copy, callback),
    /** Listens for cut request */
    cut: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.cut, callback),
    /** Listens for paste request */
    paste: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.paste, callback),
    /** Listens for select all request */
    selectAll: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.selectAll, callback),
    /** Listens for undo request */
    undo: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.undo, callback),
    /** Listens for redo request */
    redo: (callback: (id: number) => void) => lynxIpc.on(contextMenuChannels.redo, callback),
    /** Listens for download image request */
    downloadImage: (callback: (id: number, url: string) => void) =>
      lynxIpc.on(contextMenuChannels.downloadImage, callback),
    /** Listens for copy image request */
    copyImage: (callback: (url: string) => void) => lynxIpc.on(contextMenuChannels.copyImage, callback),
    /** Listens for Google search request */
    searchWithGoogle: (callback: (text: string) => void) => lynxIpc.on(contextMenuChannels.searchWithGoogle, callback),
    /** Listens for inspect element request */
    inspectElement: (callback: (id: number, x: number, y: number) => void) =>
      lynxIpc.on(contextMenuChannels.inspectElement, callback),
    /** Listens for hide window request */
    hideWindow: (callback: () => void) => lynxIpc.on(contextMenuChannels.hideWindow, callback),
    /** Listens for replace misspelling request */
    replaceMisspelling: (callback: (id: number, text: string) => void) =>
      lynxIpc.on(contextMenuChannels.replaceMisspelling, callback),
    /** Listens for new tab request */
    newTab: (callback: (url: string) => void) => lynxIpc.on(contextMenuChannels.newTab, callback),
    /** Listens for navigation request */
    navigate: (callback: (id: number, action: 'back' | 'forward' | 'refresh') => void) =>
      lynxIpc.on(contextMenuChannels.navigate, callback),

    /** Listens for relaunch AI request */
    relaunchAI: (callback: (id: string) => void) => lynxIpc.on(contextMenuChannels.relaunchAI, callback),
    /** Listens for stop AI request */
    stopAI: (callback: (id: string) => void) => lynxIpc.on(contextMenuChannels.stopAI, callback),
    /** Listens for remove tab request */
    removeTab: (callback: (tabID: string) => void) => lynxIpc.on(contextMenuChannels.removeTab, callback),

    /** Listens for open terminate AI request */
    openTerminateAI: (callback: (id: string) => void) => lynxIpc.on(contextMenuChannels.openTerminateAI, callback),
    /** Listens for open send exit signal request */
    openSendExitSignal: (callback: (id: string) => void) =>
      lynxIpc.on(contextMenuChannels.openSendExitSignal, callback),
    /** Listens for open terminate tab request */
    openTerminateTab: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openTerminateTab, callback),
    /** Listens for open close app request */
    openCloseApp: (callback: () => void) => lynxIpc.on(contextMenuChannels.openCloseApp, callback),
  },
  handle: {},
};
