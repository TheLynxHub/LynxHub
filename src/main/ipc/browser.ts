import {browserChannels} from '@lynx_common/consts/ipcChannels/browser';
import {ElementResizeData} from '@lynx_common/types';
import {AgentTypes, AudioState, CanGoType, ContextMenuVolumeData, MainHT} from '@lynx_common/types/ipc';
import {toMs} from '@lynx_common/utils';
import BrowserManager from '@lynx_main/managers/browser';
import classHolder from '@lynx_main/managers/classHolder';
import {getUserAgent} from '@lynx_main/utils';
import {BrowserWindow, FindInPageOptions} from 'electron';

import BrowserDownloadManager from '../childWindows/browserDownloadManager';
import {listenForBrowserChannels} from './contextMenu';
import lynxIpc from './ipcWrapper';
import {handleGetAudioState, handleSetMuted, handleSetVolume} from './methods/volume';
import {sendToContextMenu, sendToLinkPreview, sendToMain} from './sender';

let browserTimeout: NodeJS.Timeout | undefined = undefined;
let browserIpcInitialized = false;

/**
 * Resets the browserIPC initialization state. Call this before recreating
 * the main window (e.g., on macOS activate).
 */
export function resetBrowserIPC() {
  browserIpcInitialized = false;
  if (browserTimeout) {
    clearTimeout(browserTimeout);
    browserTimeout = undefined;
  }
}

/**
 * Initializes listeners for browser-related IPC events.
 */
export async function listenBrowser() {
  // Prevent registering handlers multiple times
  if (browserIpcInitialized) {
    console.warn('listenBrowser already initialized, skipping...');
    return;
  }

  const appManager = await classHolder.waitForClass('appManager');

  const mainWindow = appManager.getMainWindow();

  if (!mainWindow) {
    browserTimeout = setTimeout(listenBrowser, toMs(1, 'seconds'));
    return;
  }

  clearTimeout(browserTimeout);
  browserTimeout = undefined;
  browserIpcInitialized = true;

  const browserManager: BrowserManager = new BrowserManager(mainWindow);
  classHolder.browserManager = browserManager;
  classHolder.browserDownloadManager = new BrowserDownloadManager(browserManager.getSession(), mainWindow);

  await listenForBrowserChannels(browserManager);

  // Creates new browser webview instance
  browserIpc.on.createBrowser((id, options) => browserManager.createBrowser(id, options));

  // Removes browser webview instance
  browserIpc.on.removeBrowser(id => browserManager.removeBrowser(id));

  // Loads URL in browser webview
  browserIpc.on.loadURL((id, url) => browserManager.loadURL(id, url));

  // Sets browser webview visibility
  lynxIpc.onEvent(browserChannels.setVisible, (event, id, visible, hideMode) => {
    const sender = event.sender ? BrowserWindow.fromWebContents(event.sender) || undefined : undefined;
    browserManager.setVisible(id, visible, hideMode, sender);
  });

  // Finds text in page
  browserIpc.on.findInPage((id, value, options) => browserManager.findInPage(id, value, options));

  // Stops find in page operation
  browserIpc.on.stopFindInPage((id, action) => browserManager.stopFindInPage(id, action));

  // Sets zoom factor for browser webview
  browserIpc.on.setZoomFactor((id, factor) => browserManager.setZoomFactor(id, factor));

  // Reloads current page
  lynxIpc.onEvent(browserChannels.reload, (event, id) => {
    const sender = event.sender ? BrowserWindow.fromWebContents(event.sender) || undefined : undefined;
    browserManager.reload(id, sender);
  });

  // Focus on current paage
  browserIpc.on.focus(id => browserManager.focus(id));

  // Stops loading current page
  browserIpc.on.stop(id => browserManager.stop(id));

  // Navigates browser back
  browserIpc.on.goBack(id => browserManager.goBack(id));

  // Navigates browser forward
  browserIpc.on.goForward(id => browserManager.goForward(id));

  // Toggles DevTools for browser webview
  browserIpc.on.toggleDevTools(id => browserManager.toggleDevTools(id));

  // Focuses browser webview
  browserIpc.on.focusWebView(id => browserManager.focusWebView(id));

  // Updates user agent for all browsers
  browserIpc.on.updateUserAgent(() => {
    browserManager.updateUserAgent();
    const webContents = appManager.getWebContent();
    if (webContents) webContents.setUserAgent(getUserAgent());
  });

  // Clears browser history for selected URLs
  browserIpc.on.clearHistory(selected => browserManager.clearHistory(selected));

  // Forward volume updates from context menu to main window
  browserIpc.on.updateTabVolume((tabId, volume) => browserIpc.send.onTabVolumeUpdate(tabId, volume));
  browserIpc.on.updateTabMuted((tabId, muted) => browserIpc.send.onTabMutedUpdate(tabId, muted));

  lynxIpc.onEvent(browserChannels.resizeBrowserView, (event, data) => {
    const sender = event.sender ? BrowserWindow.fromWebContents(event.sender) || undefined : undefined;
    browserManager.resizeViews(data, sender);
  });

  // Clears browser cache - remove existing handler first to prevent duplicate registration
  browserIpc.handle.clearCache(() => browserManager.clearCache());

  // Clears browser cookies - remove existing handler first to prevent duplicate registration
  browserIpc.handle.clearCookies(() => browserManager.clearCookies());

  // Gets user agent string - remove existing handler first to prevent duplicate registration
  browserIpc.handle.getUserAgent(type => getUserAgent(type));

  // Sets volume level for browser webview (0-100)
  browserIpc.handle.setVolume((id, volume) => handleSetVolume(browserManager, id, volume));

  // Sets mute state for browser webview
  browserIpc.handle.setMuted((id, muted) => handleSetMuted(browserManager, id, muted));

  // Gets current audio state (playing, muted) for browser webview
  browserIpc.handle.getState(id => handleGetAudioState(browserManager, id));

  // Executes JavaScript in the browser webview
  browserIpc.handle.executeJavaScript((id, script) => {
    return (
      browserManager.getWebContentsById(id)?.executeJavaScript(script) ??
      Promise.reject(new Error('No WebContents found'))
    );
  });
}

/**
 * IPC interface for browser events.
 */
export const browserIpc = {
  send: {
    /** Sends event when a link is hovered */
    onLinkHover: (url: string) => sendToLinkPreview(browserChannels.onLinkHover, url),
    /** Sends event when navigation state changes (back/forward available) */
    onCanGo: (id: string, canGo: CanGoType) => sendToMain(browserChannels.onCanGo, id, canGo),
    /** Sends event when URL changes */
    onUrlChange: (id: string, url: string) => sendToMain(browserChannels.onUrlChange, id, url),
    /** Sends event when loading state changes */
    isLoading: (id: string, isLoading: boolean) => sendToMain(browserChannels.isLoading, id, isLoading),
    /** Sends event when page title changes */
    onTitleChange: (id: string, title: string) => sendToMain(browserChannels.onTitleChange, id, title),
    /** Sends event when favicon changes */
    onFavIconChange: (id: string, url: string) => sendToMain(browserChannels.onFavIconChange, id, url),
    /** Sends event when URL load fails */
    onFailedLoadUrl: (id: string, errorCode: number, errorDescription: string, validatedURL: string) =>
      sendToMain(browserChannels.onFailedLoadUrl, id, errorCode, errorDescription, validatedURL),
    /** Sends event when DOM is ready */
    onDomReady: (id: string, isReady: boolean) => sendToMain(browserChannels.onDomReady, id, isReady),
    /** Sends event when clearing history/cache/cookies failed */
    onClearFailed: (id: string) => sendToMain(browserChannels.onClearFailed, id),
    /** Sends tab volume update to renderer */
    onTabVolumeUpdate: (tabId: string, volume: number) => sendToMain(browserChannels.onTabVolumeUpdate, tabId, volume),
    /** Sends tab mute update to renderer */
    onTabMutedUpdate: (tabId: string, muted: boolean) => sendToMain(browserChannels.onTabMutedUpdate, tabId, muted),
    /** Sends audio state change (playing/paused) */
    onAudioStateChange: (id: string, state: AudioState) => sendToMain(browserChannels.onAudioStateChange, id, state),
    /** Sends find in page results */
    onFoundInPage: (result: {activeMatchOrdinal: number; matches: number; finalUpdate: boolean}) =>
      sendToContextMenu(browserChannels.onFoundInPage, result),
    /** Sends zoom change event */
    onZoomChanged: (id: string, factor: number) => sendToMain(browserChannels.onZoomChanged, id, factor),
  },
  on: {
    /** Listens for create browser request */
    createBrowser: (callback: (id: string, options?: {backgroundThrottling?: boolean}) => void) =>
      lynxIpc.on(browserChannels.createBrowser, callback),
    /** Listens for remove browser request */
    removeBrowser: (callback: (id: string) => void) => lynxIpc.on(browserChannels.removeBrowser, callback),
    /** Listens for load URL request */
    loadURL: (callback: (id: string, url: string) => void) => lynxIpc.on(browserChannels.loadURL, callback),
    /** Listens for visibility change request */
    setVisible: (callback: (id: string, visible: boolean, hideMode?: 'detach' | 'offscreen') => void) =>
      lynxIpc.on(browserChannels.setVisible, callback),
    /** Listens for find in page request */
    findInPage: (callback: (id: string, value: string, options: FindInPageOptions) => void) =>
      lynxIpc.on(browserChannels.findInPage, callback),
    /** Listens for stop find in page request */
    stopFindInPage: (
      callback: (id: string, action: 'clearSelection' | 'keepSelection' | 'activateSelection') => void,
    ) => lynxIpc.on(browserChannels.stopFindInPage, callback),
    /** Listens for set zoom factor request */
    setZoomFactor: (callback: (id: string, factor: number) => void) =>
      lynxIpc.on(browserChannels.setZoomFactor, callback),
    /** Listens for reload request */
    reload: (callback: (id: string) => void) => lynxIpc.on(browserChannels.reload, callback),
    /** Listens for focus request */
    focus: (callback: (id: string) => void) => lynxIpc.on(browserChannels.focus, callback),
    /** Listens for stop loading request */
    stop: (callback: (id: string) => void) => lynxIpc.on(browserChannels.stop, callback),
    /** Listens for go back request */
    goBack: (callback: (id: string) => void) => lynxIpc.on(browserChannels.goBack, callback),
    /** Listens for go forward request */
    goForward: (callback: (id: string) => void) => lynxIpc.on(browserChannels.goForward, callback),
    /** Listens for toggle devtools request */
    toggleDevTools: (callback: (id: string) => void) => lynxIpc.on(browserChannels.toggleDevTools, callback),
    /** Listens for focus webview request */
    focusWebView: (callback: (id: string) => void) => lynxIpc.on(browserChannels.focusWebView, callback),
    /** Listens for update user agent request */
    updateUserAgent: (callback: () => void) => lynxIpc.on(browserChannels.updateUserAgent, callback),
    /** Listens for clear history request */
    clearHistory: (callback: (selected: string[]) => void) => lynxIpc.on(browserChannels.clearHistory, callback),

    /** Listens for open find in page context menu request */
    openFindInPage: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(browserChannels.openFindInPage, callback),
    /** Listens for open zoom context menu request */
    openZoom: (callback: (id: string, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(browserChannels.openZoom, callback),
    /** Listens for open volume context menu request */
    openVolume: (callback: (data: ContextMenuVolumeData, customPosition?: {x: number; y: number}) => void) =>
      lynxIpc.on(browserChannels.openVolume, callback),
    /** Listens for resize link preview request */
    resizeLinkPreview: (callback: (width: number) => void) => lynxIpc.on(browserChannels.resizeLinkPreview, callback),

    /** Listens for tab volume update */
    updateTabVolume: (callback: (tabId: string, volume: number) => void) =>
      lynxIpc.on(browserChannels.updateTabVolume, callback),
    /** Listens for tab mute update */
    updateTabMuted: (callback: (tabId: string, muted: boolean) => void) =>
      lynxIpc.on(browserChannels.updateTabMuted, callback),
    /** Listens for browser view resizing */
    resizeBrowserView: (callback: (data: ElementResizeData) => void) =>
      lynxIpc.on(browserChannels.resizeBrowserView, callback),
  },
  handle: {
    /** Handles clear cache request */
    clearCache: (callback: () => MainHT<void>) => lynxIpc.handle(browserChannels.clearCache, callback),
    /** Handles clear cookies request */
    clearCookies: (callback: () => MainHT<void>) => lynxIpc.handle(browserChannels.clearCookies, callback),
    /** Handles get user agent request */
    getUserAgent: (callback: (type: AgentTypes) => MainHT<string>) =>
      lynxIpc.handle(browserChannels.getUserAgent, callback),
    /** Handles set volume request */
    setVolume: (callback: (id: string, volume: number) => MainHT<void>) =>
      lynxIpc.handle(browserChannels.setVolume, callback),
    /** Handles set muted request */
    setMuted: (callback: (id: string, muted: boolean) => MainHT<void>) =>
      lynxIpc.handle(browserChannels.setMuted, callback),
    /** Handles get audio state request */
    getState: (callback: (id: string) => MainHT<AudioState | null>) =>
      lynxIpc.handle(browserChannels.getState, callback),
    /** Handles execute JavaScript request */
    executeJavaScript: (callback: (id: string, script: string) => MainHT<any>) =>
      lynxIpc.handle(browserChannels.executeJavaScript, callback),
  },
};
