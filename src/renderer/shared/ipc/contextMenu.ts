import {contextMenuChannels} from '@lynx_common/consts/ipcChannels/contextMenu';
import type {ElementResizeData} from '@lynx_common/types';
import type {ContextMenuVolumeData, NavHistory} from '@lynx_common/types/ipc';
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
  },
};

export default contextMenuIpc;
