import {contextMenuChannels} from '@lynx_common/consts/ipcChannels/contextMenu';
import type {ElementResizeData, TabContextMenuPayload, TerminateMultipleTabsPayload} from '@lynx_common/types';
import type {
  BookmarkContextMenuPayload,
  BookmarkEditMenuPayload,
  BookmarkFolderMenuPayload,
} from '@lynx_common/types/bookmarks';
import type {ContextMenuVolumeData, NavHistory, QuickWebSwitcherPayload} from '@lynx_common/types/ipc';
import type {ContextMenuParams} from 'electron';

import lynxIpc from './lynxIpc';

type ContextMenuPosition = {x: number; y: number};
type ContextNavigateAction = 'back' | 'forward' | 'refresh';

const contextMenuIpc = {
  send: {
    // Resizes context menu window
    resizeWindow: (data: ElementResizeData) => lynxIpc.send(contextMenuChannels.resizeWindow, data),

    // Hides context menu window
    hideWindow: () => lynxIpc.send(contextMenuChannels.hideWindow),

    // Shows context menu window with its calculated size
    showReady: (data: ElementResizeData) => lynxIpc.send(contextMenuChannels.showReady, data),

    // Opens terminate AI dialog
    openTerminateProcess: (id: string) => lynxIpc.send(contextMenuChannels.openTerminateAI, id),

    // Opens send exit signal dialog
    openSendExitSignal: (id: string) => lynxIpc.send(contextMenuChannels.openSendExitSignal, id),

    // Opens terminate tab dialog
    openTerminateTab: (id: string, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openTerminateTab, id, customPosition),

    // Opens close app dialog
    openCloseApp: () => lynxIpc.send(contextMenuChannels.openCloseApp),

    // Relaunches AI process
    relaunchAI: (id: string) => lynxIpc.send(contextMenuChannels.relaunchAI, id),

    // Stops AI process
    stopAI: (id: string) => lynxIpc.send(contextMenuChannels.stopAI, id),

    // Removes browser tab
    removeTab: (tabId: string) => lynxIpc.send(contextMenuChannels.removeTab, tabId),

    // Forces reload of browser page with unsaved changes
    forceReload: (id: string) => lynxIpc.send(contextMenuChannels.forceReload, id),

    // Opens bookmark context menu
    openBookmarkContextMenu: (payload: BookmarkContextMenuPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openBookmarkContextMenu, payload, customPosition),

    // Opens bookmark folder menu
    openBookmarkFolderMenu: (payload: BookmarkFolderMenuPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openBookmarkFolderMenu, payload, customPosition),

    // Opens bookmark edit menu
    openBookmarkEditMenu: (payload: BookmarkEditMenuPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openBookmarkEditMenu, payload, customPosition),

    // Opens tab context menu
    openTabContextMenu: (payload: TabContextMenuPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openTabContextMenu, payload, customPosition),

    // Pin/unpin tab action
    tabActionPin: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionPin, tabId),

    // Toggle tab show icon only action
    tabActionIconOnly: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionIconOnly, tabId),

    // Close tab action (checks confirmation)
    tabActionClose: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionClose, tabId),

    // Force close tab action
    tabActionForceClose: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionForceClose, tabId),

    // Close other tabs action
    tabActionCloseOthers: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionCloseOthers, tabId),

    // Close tabs to right action
    tabActionCloseRight: (tabId: string) => lynxIpc.send(contextMenuChannels.tabActionCloseRight, tabId),

    // Opens quick web switcher dropdown menu
    openQuickWebSwitcher: (payload: QuickWebSwitcherPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openQuickWebSwitcher, payload, customPosition),

    // Opens terminate multiple tabs dialog
    openTerminateMultipleTabs: (payload: TerminateMultipleTabsPayload, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(contextMenuChannels.openTerminateMultipleTabs, payload, customPosition),

    // Removes multiple tabs
    removeMultipleTabs: (tabIds: string[]) => lynxIpc.send(contextMenuChannels.removeMultipleTabs, tabIds),

    rightClickItems: {
      copy: (id: number) => lynxIpc.send(contextMenuChannels.copy, id),

      // Cuts selected text in browser
      cut: (id: number) => lynxIpc.send(contextMenuChannels.cut, id),

      // Pastes clipboard content in browser
      paste: (id: number) => lynxIpc.send(contextMenuChannels.paste, id),

      // Replaces misspelled word in browser
      replaceMisspelling: (id: number, text: string) => lynxIpc.send(contextMenuChannels.replaceMisspelling, id, text),

      // Selects all text in browser
      selectAll: (id: number) => lynxIpc.send(contextMenuChannels.selectAll, id),

      // Undoes last action in browser
      undo: (id: number) => lynxIpc.send(contextMenuChannels.undo, id),

      // Redoes last undone action in browser
      redo: (id: number) => lynxIpc.send(contextMenuChannels.redo, id),

      // Opens new tab with URL
      newTab: (url: string) => lynxIpc.send(contextMenuChannels.newTab, url),

      // Downloads image from URL
      downloadImage: (id: number, url: string) => lynxIpc.send(contextMenuChannels.downloadImage, id, url),

      // Copies image to clipboard
      copyImage: (url: string) => lynxIpc.send(contextMenuChannels.copyImage, url),

      // Searches selected text with Google
      searchWithGoogle: (text: string) => lynxIpc.send(contextMenuChannels.searchWithGoogle, text),

      // Opens DevTools and inspects element at coordinates
      inspectElement: (id: number, x: number, y: number) => lynxIpc.send(contextMenuChannels.inspectElement, id, x, y),

      // Navigates browser (back, forward, or refresh)
      navigate: (id: number, action: ContextNavigateAction) => lynxIpc.send(contextMenuChannels.navigate, id, action),
    },
  },

  on: {
    // Listens for request to show the context menu
    requestShow: (callback: () => void): (() => void) => lynxIpc.on(contextMenuChannels.requestShow, callback),

    // Listens for context menu view initialization events
    rightClick: (callback: (params: ContextMenuParams, navHistory: NavHistory, id: number) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.rightClick, callback),

    // Listens for find in page events
    find: (callback: (id: string, selectedText?: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onFind, callback),

    // Listens for terminate AI events
    terminateProcess: (callback: (id: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTerminateAI, callback),
    // Listens for sending exit signal events
    sendExitProcess: (callback: (id: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onSendExitProcess, callback),

    // Listens for terminate tab events
    terminateTab: (callback: (id: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTerminateTab, callback),

    // Listens for close app events
    closeApp: (callback: () => void): (() => void) => lynxIpc.on(contextMenuChannels.onCloseApp, callback),

    // Listens for zoom events
    zoom: (callback: (id: string, zoomFactor: number) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onZoom, callback),

    prompt: (callback: (message: string, defaultValue?: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onPrompt, callback),

    // Listens for zoom events
    downloads: (callback: () => void): (() => void) => lynxIpc.on(contextMenuChannels.onDownloads, callback),

    // Listens for volume control events
    volume: (callback: (data: ContextMenuVolumeData) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onVolume, callback),

    // Listens for AI relaunch events
    relaunchProcess: (callback: (id: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onRelaunchAI, callback),

    // Listens for AI stop events
    stopProcess: (callback: (id: string) => void): (() => void) => lynxIpc.on(contextMenuChannels.onStopAI, callback),

    // Listens for tab removal events
    removeTab: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onRemoveTab, callback),

    // Listens for force reload confirmation events
    forceReload: (callback: (id: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onForceReload, callback),

    // Listens for bookmark context menu events
    bookmarkContextMenu: (callback: (payload: BookmarkContextMenuPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onBookmarkContextMenu, callback),

    // Listens for bookmark folder menu events
    bookmarkFolderMenu: (callback: (payload: BookmarkFolderMenuPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onBookmarkFolderMenu, callback),

    // Listens for bookmark edit menu events
    bookmarkEditMenu: (callback: (payload: BookmarkEditMenuPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onBookmarkEditMenu, callback),

    // Listens for tab context menu events
    tabContextMenu: (callback: (payload: TabContextMenuPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabContextMenu, callback),

    // Listens for pin tab action
    tabActionPin: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionPin, callback),

    // Listens for toggle icon only action
    tabActionIconOnly: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionIconOnly, callback),

    // Listens for close tab action
    tabActionClose: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionClose, callback),

    // Listens for force close tab action
    tabActionForceClose: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionForceClose, callback),

    // Listens for close other tabs action
    tabActionCloseOthers: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionCloseOthers, callback),

    // Listens for close tabs to right action
    tabActionCloseRight: (callback: (tabId: string) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTabActionCloseRight, callback),

    // Listens for terminate multiple tabs events
    terminateMultipleTabs: (callback: (payload: TerminateMultipleTabsPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onTerminateMultipleTabs, callback),

    // Listens for remove multiple tabs events
    removeMultipleTabs: (callback: (tabIds: string[]) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onRemoveMultipleTabs, callback),

    // Listens for quick web switcher dropdown events
    quickWebSwitcher: (callback: (payload: QuickWebSwitcherPayload) => void): (() => void) =>
      lynxIpc.on(contextMenuChannels.onQuickWebSwitcher, callback),
  },
};

export default contextMenuIpc;
