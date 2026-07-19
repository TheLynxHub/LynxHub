import {browserChannels} from '@lynx_common/consts/ipcChannels/browser';
import type {ElementResizeData} from '@lynx_common/types';
import type {AgentTypes, AudioState, CanGoType, ContextMenuVolumeData} from '@lynx_common/types/ipc';
import type {FindInPageOptions} from 'electron';

import lynxIpc from './lynxIpc';

type ContextMenuPosition = {x: number; y: number};
type StopFindAction = 'clearSelection' | 'keepSelection' | 'activateSelection';
type FoundInPagePayload = {activeMatchOrdinal: number; matches: number; finalUpdate: boolean};

const invokeWithSoftTimeout = async (channel: string, timeoutMessage: string, ...args: unknown[]): Promise<void> => {
  try {
    await Promise.race([
      lynxIpc.invoke<void>(channel, ...args),
      new Promise<void>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), 8000)),
    ]);
  } catch {
    // Volume/mute operations can fail during page transitions; main process handles recovery.
  }
};

const browserIpc = {
  send: {
    resizeLinkPreview: (width: number) => lynxIpc.send(browserChannels.resizeLinkPreview, width),

    resizeBrowserView: (data: ElementResizeData) => lynxIpc.send(browserChannels.resizeBrowserView, data),

    // Creates new browser webview instance
    createBrowser: (id: string, options?: {backgroundThrottling?: boolean}) =>
      lynxIpc.send(browserChannels.createBrowser, id, options),

    // Removes browser webview instance
    removeBrowser: (id: string) => lynxIpc.send(browserChannels.removeBrowser, id),

    // Loads URL in browser webview
    loadURL: (id: string, url: string) => lynxIpc.send(browserChannels.loadURL, id, url),

    // Sets browser webview visibility
    setVisible: (id: string, visible: boolean, hideMode?: 'detach' | 'offscreen') =>
      lynxIpc.send(browserChannels.setVisible, id, visible, hideMode),

    // Opens find in page dialog
    openFindInPage: (id: string, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(browserChannels.openFindInPage, id, customPosition),

    // Opens zoom dialog
    openZoom: (id: string, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(browserChannels.openZoom, id, customPosition),

    // Opens volume control dialog
    openVolume: (data: ContextMenuVolumeData, customPosition?: ContextMenuPosition) =>
      lynxIpc.send(browserChannels.openVolume, data, customPosition),

    // Finds text in page
    findInPage: (id: string, value: string, options: FindInPageOptions) =>
      lynxIpc.send(browserChannels.findInPage, id, value, options),

    // Stops find in page operation
    stopFindInPage: (id: string, action: StopFindAction) => lynxIpc.send(browserChannels.stopFindInPage, id, action),

    // Focuses browser webview
    focusWebView: (id: string) => lynxIpc.send(browserChannels.focusWebView, id),

    // Sets zoom factor for browser webview
    setZoomFactor: (id: string, factor: number) => lynxIpc.send(browserChannels.setZoomFactor, id, factor),

    // Reloads current page
    reload: (id: string) => lynxIpc.send(browserChannels.reload, id),

    // Focus on current page
    focus: (id: string) => lynxIpc.send(browserChannels.focus, id),

    // Stops loading current page
    stop: (id: string) => lynxIpc.send(browserChannels.stop, id),

    // Navigates browser back
    goBack: (id: string) => lynxIpc.send(browserChannels.goBack, id),

    // Navigates browser forward
    goForward: (id: string) => lynxIpc.send(browserChannels.goForward, id),

    // Toggles DevTools for browser webview
    toggleDevTools: (id: string) => lynxIpc.send(browserChannels.toggleDevTools, id),

    // Updates user agent for all browsers
    updateUserAgent: () => lynxIpc.send(browserChannels.updateUserAgent),

    // Clears browser history for selected URLs
    clearHistory: (selected: string[]) => lynxIpc.send(browserChannels.clearHistory, selected),

    // Updates tab volume from context menu (sends to main window)
    updateTabVolume: (tabId: string, volume: number) => lynxIpc.send(browserChannels.updateTabVolume, tabId, volume),

    // Updates tab muted state from context menu (sends to main window)
    updateTabMuted: (tabId: string, muted: boolean) => lynxIpc.send(browserChannels.updateTabMuted, tabId, muted),
  },
  on: {
    linkHover: (callback: (url: string) => void): (() => void) => lynxIpc.on(browserChannels.onLinkHover, callback),

    // Listens for browser navigation availability (can go back/forward)
    canGoBackForward: (result: (id: string, canGo: CanGoType) => void): (() => void) =>
      lynxIpc.on(browserChannels.onCanGo, result),

    // Listens for browser loading state changes
    loading: (result: (id: string, isLoading: boolean) => void): (() => void) =>
      lynxIpc.on(browserChannels.isLoading, result),

    // Listens for browser page title changes
    titleChanged: (result: (id: string, title: string) => void): (() => void) =>
      lynxIpc.on(browserChannels.onTitleChange, result),

    // Listens for browser favicon changes
    favIconChanged: (result: (id: string, faviconUrl: string) => void): (() => void) =>
      lynxIpc.on(browserChannels.onFavIconChange, result),

    // Listens for browser URL changes
    urlChanged: (result: (id: string, url: string) => void): (() => void) =>
      lynxIpc.on(browserChannels.onUrlChange, result),

    // Listens for browser DOM ready state
    domReady: (result: (id: string, isReady: boolean) => void): (() => void) =>
      lynxIpc.on(browserChannels.onDomReady, result),

    // Listens for failed URL load events
    failedLoadUrl: (
      result: (id: string, errorCode: number, errorDescription: string, validatedURL: string) => void,
    ): (() => void) => lynxIpc.on(browserChannels.onFailedLoadUrl, result),

    // Listens for cleared failed URL events
    clearFailed: (result: (id: string) => void): (() => void) => lynxIpc.on(browserChannels.onClearFailed, result),

    // Listens for audio state changes (media started/paused, mute state)
    onAudioStateChange: (callback: (id: string, state: AudioState) => void): (() => void) =>
      lynxIpc.on(browserChannels.onAudioStateChange, callback),

    // Listens for tab volume updates from context menu
    onTabVolumeUpdate: (callback: (tabId: string, volume: number) => void): (() => void) =>
      lynxIpc.on(browserChannels.onTabVolumeUpdate, callback),

    // Listens for tab muted updates from context menu
    onTabMutedUpdate: (callback: (tabId: string, muted: boolean) => void): (() => void) =>
      lynxIpc.on(browserChannels.onTabMutedUpdate, callback),

    // Listens for find in page results
    foundInPage: (callback: (result: FoundInPagePayload) => void): (() => void) =>
      lynxIpc.on(browserChannels.onFoundInPage, callback),

    // Listens for zoom level changes (Ctrl+/- or mouse wheel zoom)
    onZoomChanged: (callback: (id: string, factor: number) => void): (() => void) =>
      lynxIpc.on(browserChannels.onZoomChanged, callback),

    // Listens for active window changes for a browser view
    activeWindowChanged: (callback: (id: string, activeWindow: 'main' | 'float' | null) => void): (() => void) =>
      lynxIpc.on(browserChannels.onActiveWindowChange, callback),
  },
  invoke: {
    // Clears browser cache
    clearCache: () => lynxIpc.invoke<void>(browserChannels.clearCache),

    // Clears browser cookies
    clearCookies: () => lynxIpc.invoke<void>(browserChannels.clearCookies),

    // Gets user agent string
    getUserAgent: (type?: AgentTypes) => lynxIpc.invoke<string>(browserChannels.getUserAgent, type),

    // Sets volume level for browser webview (0-100)
    setVolume: (id: string, volume: number) =>
      invokeWithSoftTimeout(browserChannels.setVolume, 'Volume set operation timed out', id, volume),

    // Sets mute state for browser webview
    setMuted: (id: string, muted: boolean) =>
      invokeWithSoftTimeout(browserChannels.setMuted, 'Mute set operation timed out', id, muted),

    // Executes JavaScript in browser webview
    executeJavaScript: (id: string, script: string) =>
      lynxIpc.invoke<any>(browserChannels.executeJavaScript, id, script),
  },
};

export default browserIpc;
