import {contextMenuChannels} from '@lynx_common/consts/ipcChannels/contextMenu';
import {ElementResizeData, TabContextMenuPayload, TerminateMultipleTabsPayload} from '@lynx_common/types';
import {
  BookmarkContextMenuPayload,
  BookmarkEditMenuPayload,
  BookmarkFolderMenuPayload,
} from '@lynx_common/types/bookmarks';
import {ContextMenuVolumeData, NavHistory, QuickWebSwitcherPayload} from '@lynx_common/types/ipc';
import BrowserManager from '@lynx_main/managers/browser';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, ContextMenuParams} from 'electron';

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
  contextMenuIpc.on.tabActionPin(tabId => contextMenuIpc.send.onTabActionPin(tabId));
  contextMenuIpc.on.tabActionIconOnly(tabId => contextMenuIpc.send.onTabActionIconOnly(tabId));
  contextMenuIpc.on.tabActionClose(tabId => contextMenuIpc.send.onTabActionClose(tabId));
  contextMenuIpc.on.tabActionForceClose(tabId => contextMenuIpc.send.onTabActionForceClose(tabId));
  contextMenuIpc.on.tabActionCloseOthers(tabId => contextMenuIpc.send.onTabActionCloseOthers(tabId));
  contextMenuIpc.on.tabActionCloseRight(tabId => contextMenuIpc.send.onTabActionCloseRight(tabId));
  contextMenuIpc.on.tabActionReopenClosed(() => contextMenuIpc.send.onTabActionReopenClosed());
  contextMenuIpc.on.removeMultipleTabs(tabIds => contextMenuIpc.send.onRemoveMultipleTabs(tabIds));
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

  const setPosition = (customPosition?: {x: number; y: number}, parentWindow?: BrowserWindow) => {
    const targetParent = parentWindow || appManager.getMainWindow();
    if (targetParent) {
      contextMenuManager.setCurrentParentWindow(targetParent);
    }
    contextMenuManager.setCustomContextPosition(customPosition);
  };

  // Force Reload page
  contextMenuIpc.on.forceReload(id => {
    browserManager.forceReload(id);
  });

  // Open Find in Page
  browserIpc.on.openFindInPage(async (id, customPosition) => {
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
    setPosition(customPosition);
    contextMenuIpc.send.onZoom(id, browserManager.getCurrentZoom(id));
    const childManager = classHolder.childWindowManager;
    if (!childManager?.isShowing() || childManager.getActiveType() !== 'contextMenu') {
      contextMenuManager.showContextMenu();
    }
  });

  // Open Volume control
  browserIpc.on.openVolume((data, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onVolume(data);
    const childManager = classHolder.childWindowManager;
    if (!childManager?.isShowing() || childManager.getActiveType() !== 'contextMenu') {
      contextMenuManager.showContextMenu();
    }
  });

  // Open Terminate AI
  contextMenuIpc.on.openTerminateAI((id, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onTerminateAI(id);
    contextMenuManager.showContextMenu();
  });

  // Open send exit signal process
  contextMenuIpc.on.openSendExitSignal((id, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onSendExitProcess(id);
    contextMenuManager.showContextMenu();
  });

  // Open Terminate Tab
  contextMenuIpc.on.openTerminateTab((id, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onTerminateTab(id);
    contextMenuManager.showContextMenu();
  });

  // Open Close App
  contextMenuIpc.on.openCloseApp(customPosition => {
    setPosition(customPosition);
    contextMenuIpc.send.onCloseApp();
    contextMenuManager.showContextMenu();
  });

  // Open Downloads Menu
  downloadManagerIpc.on.openDownloadsMenu(() => {
    setPosition(undefined);
    contextMenuIpc.send.onDownloads();
    contextMenuManager.showContextMenu();
  });

  // Open Bookmark Context Menu
  contextMenuIpc.on.openBookmarkContextMenu((payload, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onBookmarkContextMenu(payload);
    contextMenuManager.showContextMenu();
  });

  // Open Bookmark Edit Menu
  contextMenuIpc.on.openBookmarkEditMenu((payload, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onBookmarkEditMenu(payload);
    contextMenuManager.showContextMenu();
  });

  // Open Bookmark Folder Menu
  contextMenuIpc.on.openBookmarkFolderMenu((payload, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onBookmarkFolderMenu(payload);
    contextMenuManager.showContextMenu();
  });

  // Open Tab Context Menu
  contextMenuIpc.on.openTabContextMenu((payload, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onTabContextMenu(payload);
    contextMenuManager.showContextMenu();
  });

  // Open Terminate Multiple Tabs Confirmation
  contextMenuIpc.on.openTerminateMultipleTabs((payload, customPosition) => {
    setPosition(customPosition);
    contextMenuIpc.send.onTerminateMultipleTabs(payload);
    contextMenuManager.showContextMenu();
  });

  // Open Quick Web Switcher Menu
  contextMenuIpc.on.openQuickWebSwitcher((payload, customPosition) => {
    const quickWebWindow = classHolder.quickWindowManager?.getWindow();
    setPosition(customPosition, quickWebWindow);
    contextMenuIpc.send.onQuickWebSwitcher(payload);
    contextMenuManager.showContextMenu(quickWebWindow);
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
    /** Sends event to remove multiple tabs */
    onRemoveMultipleTabs: (tabIds: string[]) => sendToMain(contextMenuChannels.onRemoveMultipleTabs, tabIds),

    /** Sends request to show context menu to renderer */
    requestShow: () => sendToContextMenu(contextMenuChannels.requestShow),
    /** Sends unload event to context menu to unmount React DOM */
    onUnload: () => sendToContextMenu(contextMenuChannels.onUnload),

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
    /** Sends force reload event to context menu */
    onForceReload: (id: string) => sendToContextMenu(contextMenuChannels.onForceReload, id),
    /** Sends bookmark context menu event to context menu */
    onBookmarkContextMenu: (payload: BookmarkContextMenuPayload) =>
      sendToContextMenu(contextMenuChannels.onBookmarkContextMenu, payload),
    /** Sends bookmark folder menu event to context menu */
    onBookmarkFolderMenu: (payload: BookmarkFolderMenuPayload) =>
      sendToContextMenu(contextMenuChannels.onBookmarkFolderMenu, payload),
    /** Sends bookmark edit menu event to context menu */
    onBookmarkEditMenu: (payload: BookmarkEditMenuPayload) =>
      sendToContextMenu(contextMenuChannels.onBookmarkEditMenu, payload),
    /** Sends tab context menu event to context menu */
    onTabContextMenu: (payload: TabContextMenuPayload) =>
      sendToContextMenu(contextMenuChannels.onTabContextMenu, payload),
    /** Sends tab pin action to main window renderer */
    onTabActionPin: (tabId: string) => sendToMain(contextMenuChannels.onTabActionPin, tabId),
    /** Sends tab toggle icon only action to main window renderer */
    onTabActionIconOnly: (tabId: string) => sendToMain(contextMenuChannels.onTabActionIconOnly, tabId),
    /** Sends tab close action to main window renderer */
    onTabActionClose: (tabId: string) => sendToMain(contextMenuChannels.onTabActionClose, tabId),
    /** Sends tab force close action to main window renderer */
    onTabActionForceClose: (tabId: string) => sendToMain(contextMenuChannels.onTabActionForceClose, tabId),
    /** Sends tab close others action to main window renderer */
    onTabActionCloseOthers: (tabId: string) => sendToMain(contextMenuChannels.onTabActionCloseOthers, tabId),
    /** Sends tab close right action to main window renderer */
    onTabActionCloseRight: (tabId: string) => sendToMain(contextMenuChannels.onTabActionCloseRight, tabId),
    /** Sends tab reopen closed action to main window renderer */
    onTabActionReopenClosed: () => sendToMain(contextMenuChannels.onTabActionReopenClosed),
    /** Sends terminate multiple tabs event to context menu */
    onTerminateMultipleTabs: (payload: TerminateMultipleTabsPayload) =>
      sendToContextMenu(contextMenuChannels.onTerminateMultipleTabs, payload),
    /** Sends quick web switcher event to context menu */
    onQuickWebSwitcher: (payload: QuickWebSwitcherPayload) =>
      sendToContextMenu(contextMenuChannels.onQuickWebSwitcher, payload),
  },
  on: {
    /** Listens for force reload request */
    forceReload: (callback: (id: string) => void) => lynxIpc.on(contextMenuChannels.forceReload, callback),
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
    /** Listens for tab pin action from context menu */
    tabActionPin: (callback: (tabId: string) => void) => lynxIpc.on(contextMenuChannels.tabActionPin, callback),
    /** Listens for tab icon only action from context menu */
    tabActionIconOnly: (callback: (tabId: string) => void) =>
      lynxIpc.on(contextMenuChannels.tabActionIconOnly, callback),
    /** Listens for tab close action from context menu */
    tabActionClose: (callback: (tabId: string) => void) => lynxIpc.on(contextMenuChannels.tabActionClose, callback),
    /** Listens for tab force close action from context menu */
    tabActionForceClose: (callback: (tabId: string) => void) =>
      lynxIpc.on(contextMenuChannels.tabActionForceClose, callback),
    /** Listens for tab close others action from context menu */
    tabActionCloseOthers: (callback: (tabId: string) => void) =>
      lynxIpc.on(contextMenuChannels.tabActionCloseOthers, callback),
    /** Listens for tab close right action from context menu */
    tabActionCloseRight: (callback: (tabId: string) => void) =>
      lynxIpc.on(contextMenuChannels.tabActionCloseRight, callback),
    /** Listens for tab reopen closed action from context menu */
    tabActionReopenClosed: (callback: () => void) => lynxIpc.on(contextMenuChannels.tabActionReopenClosed, callback),

    /** Listens for open terminate AI request */
    openTerminateAI: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openTerminateAI, callback),
    /** Listens for open send exit signal request */
    openSendExitSignal: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openSendExitSignal, callback),
    /** Listens for open terminate tab request */
    openTerminateTab: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openTerminateTab, callback),
    /** Listens for open close app request */
    openCloseApp: (callback: (customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openCloseApp, callback),
    /** Listens for open bookmark context menu request */
    openBookmarkContextMenu: (
      callback: (payload: BookmarkContextMenuPayload, customPosition?: {x: number; y: number}) => void,
    ) => lynxIpc.on(contextMenuChannels.openBookmarkContextMenu, callback),
    /** Listens for open bookmark folder menu request */
    openBookmarkFolderMenu: (
      callback: (payload: BookmarkFolderMenuPayload, customPosition?: {x: number; y: number}) => void,
    ) => lynxIpc.on(contextMenuChannels.openBookmarkFolderMenu, callback),
    /** Listens for open bookmark edit menu request */
    openBookmarkEditMenu: (
      callback: (payload: BookmarkEditMenuPayload, customPosition?: {x: number; y: number}) => void,
    ) => lynxIpc.on(contextMenuChannels.openBookmarkEditMenu, callback),
    /** Listens for open tab context menu request */
    openTabContextMenu: (callback: (payload: TabContextMenuPayload, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(contextMenuChannels.openTabContextMenu, callback),
    /** Listens for open terminate multiple tabs request */
    openTerminateMultipleTabs: (
      callback: (payload: TerminateMultipleTabsPayload, customPosition?: {x: number; y: number}) => void,
    ) => lynxIpc.on(contextMenuChannels.openTerminateMultipleTabs, callback),
    /** Listens for remove multiple tabs request */
    removeMultipleTabs: (callback: (tabIds: string[]) => void) =>
      lynxIpc.on(contextMenuChannels.removeMultipleTabs, callback),
    /** Listens for open quick web switcher request */
    openQuickWebSwitcher: (
      callback: (payload: QuickWebSwitcherPayload, customPosition?: {x: number; y: number}) => void,
    ) => lynxIpc.on(contextMenuChannels.openQuickWebSwitcher, callback),
  },
  handle: {},
};
