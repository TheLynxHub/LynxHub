import path from 'node:path';

import {ElementResizeData} from '@lynx_common/types';
import {AudioState, CanGoType} from '@lynx_common/types/ipc';
import {formatWebAddress, isLinux} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import {browserIpc} from '@lynx_main/ipc/browser';
import {contextMenuIpc} from '@lynx_main/ipc/contextMenu';
import {getUserAgent} from '@lynx_main/utils';
import {BrowserWindow, dialog, FindInPageOptions, session, shell, WebContents, WebContentsView} from 'electron';
import {isNil} from 'lodash-es';

import icon from '../../../resources/icon.png?asset';
import classHolder from './classHolder';
import RegisterHotkeys from './hotkeys';

// Constants
const BROWSER_SESSION_PARTITION = 'persist:lynxhub_browser';
const PAGE_LOAD_TIMEOUT_MS = 2000;
const SCRIPT_EXECUTION_TIMEOUT_MS = 3000;

/**
 * Manages the lifecycle and layout of browser views (tabs).
 * Handles creation, navigation, resizing, and IPC for each browser instance.
 */
export default class BrowserManager {
  private bypassingUnload = new Set<string>();
  private browsers: {
    id: string;
    view: WebContentsView;
    visible?: boolean;
    hideMode?: 'detach' | 'offscreen';
    attachedWindow?: BrowserWindow;
    lastBoundsByWindow?: {[windowId: number]: {x: number; y: number; width: number; height: number}};
  }[] = [];
  private readonly mainWindow: BrowserWindow;
  private lastViewSize: ElementResizeData | undefined = undefined;
  private lastViewSizeByWindow: {[windowId: number]: ElementResizeData} = {};

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Retrieves the main BrowserWindow if it exists and is not destroyed.
   */
  private getMainWindow() {
    if (isNil(this.mainWindow) || this.mainWindow.isDestroyed()) return undefined;
    return this.mainWindow;
  }

  /**
   * Retrieves a specific browser view by its ID.
   */
  private getViewByID(id: string) {
    return this.browsers.find(view => view.id === id)?.view;
  }

  /**
   * Get valid WebContents by ID, returns undefined if not found or destroyed
   */
  private getWebContents(id: string): WebContents | undefined {
    const view = this.getViewByID(id);
    if (!view?.webContents || view.webContents.isDestroyed()) return undefined;
    return view.webContents;
  }

  /** Public method to get WebContents by ID for external use */
  public getWebContentsById(id: string): WebContents | undefined {
    return this.getWebContents(id);
  }

  /**
   * Execute action on WebContents if valid, with optional error handling
   */
  private withWebContents<T>(id: string, action: (wc: WebContents) => T, fallback?: T): T | undefined {
    try {
      const wc = this.getWebContents(id);
      if (!wc) return fallback;
      return action(wc);
    } catch (error) {
      console.warn(`WebContents action failed for ${id}:`, error);
      return fallback;
    }
  }

  public resizeViews(data?: ElementResizeData, senderWindow?: BrowserWindow) {
    const mainWindow = this.getMainWindow();
    const targetWindow = senderWindow || mainWindow;
    if (!targetWindow || targetWindow.isDestroyed()) return;

    let targetSize: ElementResizeData | undefined;
    const windowId = targetWindow.id;

    if (data) {
      targetSize = data;
      this.lastViewSizeByWindow[windowId] = data;
      if (targetWindow === mainWindow) {
        this.lastViewSize = data;
      }
    } else {
      targetSize = this.lastViewSizeByWindow[windowId] || (targetWindow === mainWindow ? this.lastViewSize : undefined);
    }

    if (!targetSize) {
      return;
    }

    const {x, y, width, height} = targetSize;

    this.browsers.forEach(browser => {
      if (browser.attachedWindow === targetWindow && browser.visible !== false) {
        browser.view.setBounds({x: x || 0, y: y || 80, width, height});
        if (!browser.lastBoundsByWindow) {
          browser.lastBoundsByWindow = {};
        }
        browser.lastBoundsByWindow[windowId] = {x: x || 0, y: y || 80, width, height};
      }
    });
  }

  /**
   * Sets up listeners for navigation events to update UI state (back/forward buttons, URL bar).
   */
  private listenForNavigate(id: string, webContents: WebContents) {
    const sendToRenderer = () => {
      const viewWc = this.getWebContents(id);
      if (!viewWc) return;

      const canGo: CanGoType = {
        back: viewWc.navigationHistory.canGoBack(),
        forward: viewWc.navigationHistory.canGoForward(),
      };

      browserIpc.send.onCanGo(id, canGo);
    };

    // Initial state
    sendToRenderer();

    webContents.on('did-navigate', (_, url) => {
      sendToRenderer();
      this.trackUrl(url);
    });

    webContents.on('did-navigate-in-page', (_, url) => {
      sendToRenderer();
      this.trackUrl(url);
    });

    webContents.on('did-finish-load', sendToRenderer);
    webContents.on('did-stop-loading', sendToRenderer);

    webContents.on('did-start-navigation', e => {
      if (e.isMainFrame) browserIpc.send.onUrlChange(id, e.url);
    });
  }

  /** Track URL in browser history (shared helper to avoid duplication) */
  private trackUrl(url: string) {
    const {storageManager} = classHolder;
    if (url && !url.startsWith('about:') && !url.includes('error_page.html')) {
      const formattedUrl = formatWebAddress(url);
      storageManager.addBrowserRecent(formattedUrl);
      storageManager.addBrowserHistory(formattedUrl);
    }
  }

  private listenForLoading(id: string, webContents: WebContents) {
    const onLoading = (isLoading: boolean) => browserIpc.send.isLoading(id, isLoading);

    webContents.on('did-start-loading', () => onLoading(true));
    webContents.on('did-stop-loading', () => onLoading(false));
  }

  private listenForTitle(id: string, webContents: WebContents) {
    webContents.on('page-title-updated', () => {
      const viewWc = this.getWebContents(id);
      if (!viewWc) return;

      const {storageManager} = classHolder;
      const title = viewWc.getTitle();

      browserIpc.send.onTitleChange(id, title);
      storageManager.updateBrowserFavIconTitle(formatWebAddress(viewWc.getURL()), title);
    });
  }

  private listenForFavIcon(id: string, webContents: WebContents) {
    webContents.on('page-favicon-updated', (_, favicons) => {
      const viewWc = this.getWebContents(id);
      if (!viewWc) return;

      const {storageManager} = classHolder;

      // Prefer higher quality formats: SVG > PNG > other > ICO
      const url =
        favicons.find(icon => icon.includes('.svg')) ||
        favicons.find(icon => icon.includes('.png')) ||
        favicons.find(icon => !icon.includes('.ico')) ||
        favicons[0] ||
        '';

      browserIpc.send.onFavIconChange(id, url);
      storageManager.addBrowserFavIcon(formatWebAddress(viewWc.getURL()), url, viewWc.getTitle());
    });
  }

  /**
   * Handles requests for new windows (tabs).
   */
  private setupWindowOpenHandler(webContents: WebContents) {
    webContents.setWindowOpenHandler(({url, disposition}) => {
      const {storageManager, appManager} = classHolder;

      if (disposition === 'new-window') {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            icon,
            parent: appManager?.getMainWindow(),
            modal: true,
            maximizable: false,
            fullscreenable: false,
          },
        };
      } else if (storageManager.getData('app').openLinkExternal) {
        try {
          const parsedUrl = new URL(url);
          const safeProtocols = ['http:', 'https:', 'mailto:'];
          if (safeProtocols.includes(parsedUrl.protocol)) {
            shell.openExternal(url);
          } else {
            console.warn('Blocked opening unsafe URL:', url);
          }
        } catch (error) {
          console.warn('Blocked opening invalid URL:', url);
        }
      } else {
        // background-tab = middle-click = open in background (don't switch)
        // foreground-tab = Shift+middle-click = switch to new tab
        const openInBackground = disposition === 'background-tab';
        applicationIpc.send.onNewTab(url, openInBackground);

        // Track URLs opened in new tabs (like real browsers)
        this.trackUrl(url);
      }

      return {action: 'deny'};
    });
  }

  private listenForZoom(id: string, webContents: WebContents) {
    webContents.on('zoom-changed', (_, zoomDirection) => {
      if (webContents.isDestroyed()) return;
      let resultFactor = webContents.getZoomFactor();
      resultFactor = zoomDirection === 'in' ? resultFactor + 0.1 : resultFactor - 0.1;

      if (resultFactor > 0.1 && resultFactor < 5) {
        webContents.setZoomFactor(resultFactor);
        // Notify renderer about zoom change to auto-open zoom dialog
        browserIpc.send.onZoomChanged(id, resultFactor);
      }
    });
  }

  private listenForFullScreen(view: WebContentsView) {
    const webContents = view.webContents;
    webContents.on('enter-html-full-screen', () => {
      const {appManager} = classHolder;
      const mainBounds = appManager?.getMainWindow()?.getBounds();
      if (mainBounds) {
        view.setBounds({x: 0, y: 0, width: mainBounds.width, height: mainBounds.height});
      }
    });
  }

  private listenForFailLoad(view: WebContents, id: string) {
    view.on('did-fail-load', (_, errorCode, errorDescription, validatedURL, isMainFrame) => {
      // Ignore abort errors (usually navigation cancelled) or subframe errors
      if (errorCode === -3 || !isMainFrame) return;

      this.setVisible(id, false);
      browserIpc.send.onFailedLoadUrl(id, errorCode, errorDescription, validatedURL);
      console.warn('Failed load:', errorCode, errorDescription, validatedURL);
    });
  }

  private listenForAudioEvents(id: string, webContents: WebContents) {
    webContents.on('media-started-playing', () => {
      this.sendAudioStateChange(id, true);
    });

    webContents.on('media-paused', () => {
      this.sendAudioStateChange(id, false);
    });
  }

  private listenForLinkHover(webContents: WebContents) {
    webContents.on('update-target-url', (_, url) => {
      const {linkPreviewManager} = classHolder;
      linkPreviewManager?.updateUrl(url);
    });
  }

  private listenForFindInPage(webContents: WebContents) {
    webContents.on('found-in-page', (_, result) => {
      browserIpc.send.onFoundInPage(result);
    });
  }

  private listenForWillPreventUnload(id: string, webContents: WebContents) {
    webContents.on('will-prevent-unload', event => {
      const {storageManager, contextMenuManager} = classHolder;
      const forceReloadConfirm = storageManager?.getData('app')?.forceReloadConfirm ?? true;

      if (!forceReloadConfirm || this.bypassingUnload.has(id)) {
        this.bypassingUnload.delete(id);
        event.preventDefault();
        return;
      }

      if (isLinux) {
        const mainWindow = this.getMainWindow();
        const options: Electron.MessageBoxSyncOptions = {
          type: 'warning',
          buttons: ['Cancel', 'Force Reload'],
          defaultId: 1,
          cancelId: 0,
          message: 'Confirm Force Reload',
          detail: 'Changes that you made may not be saved. Are you sure you want to force reload this page?',
        };
        const choice = mainWindow ? dialog.showMessageBoxSync(mainWindow, options) : dialog.showMessageBoxSync(options);
        if (choice === 1) {
          event.preventDefault();
        }
        return;
      }

      contextMenuManager?.setCustomContextPosition(undefined);
      contextMenuIpc.send.onForceReload(id);
      contextMenuManager?.showContextMenu();
    });
  }

  private sendAudioStateChange(id: string, playing: boolean): void {
    const viewWc = this.getWebContents(id);
    if (!viewWc) return;

    browserIpc.send.onAudioStateChange(id, {playing, muted: viewWc.audioMuted});
  }

  /**
   * Gets the persistent session for the browser.
   */
  public getSession() {
    return session.fromPartition(BROWSER_SESSION_PARTITION);
  }

  /**
   * Creates a new browser view (tab) with the given ID.
   */
  public createBrowser(id: string, options?: {backgroundThrottling?: boolean}) {
    if (this.browsers.some(view => view.id === id)) return;

    const mainWindow = this.getMainWindow();
    if (!mainWindow) return;

    const {storageManager, contextMenuManager} = classHolder;
    const newView = new WebContentsView({
      webPreferences: {
        session: this.getSession(),
        preload: path.join(__dirname, '../preload/webview.cjs'),
        backgroundThrottling: options?.backgroundThrottling ?? true,
      },
    });

    const webContents = newView.webContents;
    newView.setBackgroundColor('#ffffff');

    if (options?.backgroundThrottling === false) {
      webContents.setBackgroundThrottling(false);
      // Position mostly outside the window with 1px overlap so Chromium's compositor
      // still paints the view. Extreme negative coords cause culling and stop paint events.
      newView.setBounds({x: -1439, y: -899, width: 1440, height: 900});
    }

    webContents.setUserAgent(getUserAgent());
    webContents.setZoomFactor(storageManager.getData('cards').zoomFactor);

    // Notify when DOM is ready
    webContents.on('dom-ready', () => browserIpc.send.onDomReady(id, true));

    // Setup all listeners
    this.listenForNavigate(id, webContents);
    this.listenForLoading(id, webContents);
    this.listenForTitle(id, webContents);
    this.listenForFavIcon(id, webContents);
    this.listenForZoom(id, webContents);
    this.listenForFullScreen(newView);
    this.listenForFailLoad(webContents, id);
    this.listenForAudioEvents(id, webContents);
    this.listenForLinkHover(webContents);
    this.listenForFindInPage(webContents);
    this.listenForWillPreventUnload(id, webContents);

    const isBackground = options?.backgroundThrottling === false;
    this.browsers.push({
      id,
      view: newView,
      visible: !isBackground,
      hideMode: isBackground ? 'offscreen' : undefined,
      attachedWindow: mainWindow,
    });
    // Insert background views at z-index 0 (behind everything) so they're painted but hidden
    mainWindow.contentView.addChildView(newView, isBackground ? 0 : undefined);

    this.setupWindowOpenHandler(webContents);
    RegisterHotkeys(webContents);
    contextMenuManager?.listenForMenu(webContents);
  }

  public focusWebView(id: string) {
    this.withWebContents(id, wc => wc.focus());
  }

  public async clearCache() {
    return this.getSession().clearData({
      dataTypes: ['backgroundFetch', 'cache', 'serviceWorkers'],
      avoidClosingConnections: true,
    });
  }

  public async clearCookies() {
    return this.getSession().clearData({dataTypes: ['cookies', 'indexedDB', 'localStorage']});
  }

  public clearHistory(selected: string[]) {
    const {storageManager} = classHolder;
    if (selected.includes('favorites')) {
      storageManager.updateBrowserDataSecurely({favoriteAddress: []});
    }
    if (selected.includes('history')) {
      storageManager.updateBrowserDataSecurely({historyAddress: [], recentAddress: []});
    }
    if (selected.includes('fav-icons')) {
      storageManager.updateBrowserDataSecurely({favIcons: []});
    }
  }

  public updateUserAgent() {
    this.browsers.forEach(({view}) => {
      if (!view.webContents.isDestroyed()) view.webContents.setUserAgent(getUserAgent());
    });
  }

  /**
   * Removes and destroys a browser view.
   */
  public removeBrowser(id: string) {
    const browserIndex = this.browsers.findIndex(view => view.id === id);
    if (browserIndex === -1) return;

    const browser = this.browsers[browserIndex];

    // Remove from array first to prevent any callbacks from accessing stale data
    this.browsers.splice(browserIndex, 1);
    this.bypassingUnload.delete(id);

    if (browser.attachedWindow && !browser.attachedWindow.isDestroyed()) {
      try {
        browser.attachedWindow.contentView.removeChildView(browser.view);
      } catch (e) {
        console.warn('Failed to remove view from attached window on destroy:', e);
      }
    }

    const webContents = browser.view.webContents;
    if (webContents && !webContents.isDestroyed()) {
      // Navigate to blank page to stop any running scripts/workers before closing
      webContents
        .loadURL('about:blank')
        .catch(() => {
          // Ignore ERR_FAILED (-2) and similar errors when loading about:blank during cleanup
        })
        .finally(() => {
          if (!webContents.isDestroyed()) {
            webContents.removeAllListeners();
            // Forcefully close the webContents
            (webContents as any).close?.();
          }
        });
    }

    // Cleanup orphaned service workers when all browsers are closed
    if (this.browsers.length === 0) {
      this.cleanupAllServiceWorkers();
    }
  }

  /** Clear all service workers when no browsers are open */
  private cleanupAllServiceWorkers() {
    this.getSession()
      .clearData({dataTypes: ['serviceWorkers']})
      .catch(error => console.warn('Service worker cleanup failed:', error));
  }

  public loadURL(id: string, url: string) {
    this.withWebContents(id, wc => {
      wc.loadURL(url).catch(error => {
        // ERR_ABORTED (-3) happens on redirects - not a real error
        if (error?.errno === -3 || error?.code === 'ERR_ABORTED') return;
        console.warn(`Failed to load URL ${url}:`, error);
      });
      // URL tracking is handled by listenForNavigate's did-navigate event
    });
  }

  /**
   * Controls visibility of a browser view.
   */
  public setVisible(id: string, visible: boolean, hideMode?: 'detach' | 'offscreen', targetWindow?: BrowserWindow) {
    const browser = this.browsers.find(b => b.id === id);
    const mainWindow = this.getMainWindow();
    if (isNil(browser) || isNil(mainWindow)) return;

    browser.visible = visible;
    browser.hideMode = hideMode;

    const view = browser.view;
    const destWindow = visible ? targetWindow || mainWindow : undefined;

    // If it's attached to a different window, detach it first
    if (browser.attachedWindow && browser.attachedWindow !== destWindow) {
      if (!browser.attachedWindow.isDestroyed()) {
        try {
          browser.attachedWindow.contentView.removeChildView(view);
        } catch (e) {
          console.warn('Failed to remove child view:', e);
        }
      }
      browser.attachedWindow = undefined;
    }

    if (visible && destWindow) {
      if (!destWindow.isDestroyed()) {
        try {
          destWindow.contentView.addChildView(view);
          browser.attachedWindow = destWindow;

          const windowId = destWindow.id;
          const lastWinBounds = browser.lastBoundsByWindow?.[windowId];
          const lastWinSize = this.lastViewSizeByWindow[windowId];

          if (lastWinSize) {
            const {x, y, width, height} = lastWinSize;
            view.setBounds({x: x || 0, y: y || 80, width, height});
            if (!browser.lastBoundsByWindow) {
              browser.lastBoundsByWindow = {};
            }
            browser.lastBoundsByWindow[windowId] = {x: x || 0, y: y || 80, width, height};
          } else if (lastWinBounds) {
            view.setBounds(lastWinBounds);
          } else if (destWindow === mainWindow && this.lastViewSize) {
            const {x, y, width, height} = this.lastViewSize;
            view.setBounds({x: x || 0, y: y || 80, width, height});
          } else {
            // Fallback default bounds
            const bounds = destWindow.getBounds();
            view.setBounds({x: 200, y: 48, width: bounds.width - 200, height: bounds.height - 48});
          }
        } catch (e) {
          console.warn('Failed to add child view:', e);
        }
      }
    } else {
      if (hideMode === 'offscreen') {
        view.setBounds({x: -1439, y: -899, width: 1440, height: 900});
        if (!mainWindow.isDestroyed()) {
          try {
            mainWindow.contentView.addChildView(view, 0);
            browser.attachedWindow = mainWindow;
          } catch (e) {
            console.warn('Failed to add offscreen child view to main window:', e);
          }
        }
      } else {
        browser.attachedWindow = undefined;
      }
    }
  }

  public findInPage(id: string, value: string, options: FindInPageOptions) {
    this.withWebContents(id, wc => wc.findInPage(value, options));
  }

  public stopFindInPage(id: string, action: 'clearSelection' | 'keepSelection' | 'activateSelection') {
    this.withWebContents(id, wc => wc.stopFindInPage(action));
  }

  public getCurrentZoom(id: string) {
    return this.withWebContents(id, wc => wc.getZoomFactor());
  }

  public setZoomFactor(id: string, factor: number) {
    this.withWebContents(id, wc => wc.setZoomFactor(factor));
  }

  public reload(id: string, targetWindow?: BrowserWindow) {
    const browser = this.browsers.find(b => b.id === id);
    const windowToAttach = targetWindow || browser?.attachedWindow || this.getMainWindow();
    this.setVisible(id, true, undefined, windowToAttach);
    this.withWebContents(id, wc => wc.reload());
    browserIpc.send.onClearFailed(id);
  }

  public forceReload(id: string, targetWindow?: BrowserWindow) {
    this.bypassingUnload.add(id);
    setTimeout(() => this.bypassingUnload.delete(id), 5000);
    this.reload(id, targetWindow);
  }

  public focus(id: string) {
    this.withWebContents(id, wc => wc.focus());
  }

  public stop(id: string) {
    this.withWebContents(id, wc => wc.stop());
  }

  public goBack(id: string) {
    this.withWebContents(id, wc => {
      if (wc.navigationHistory.canGoBack()) {
        wc.navigationHistory.goBack();
        browserIpc.send.onClearFailed(id);
      }
    });
  }

  public goForward(id: string) {
    this.withWebContents(id, wc => {
      if (wc.navigationHistory.canGoForward()) {
        wc.navigationHistory.goForward();
        browserIpc.send.onClearFailed(id);
      }
    });
  }

  public toggleDevTools(id: string) {
    this.withWebContents(id, wc => {
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools();
      } else {
        wc.openDevTools({mode: 'detach'});
      }
    });
  }

  public setMuted(id: string, muted: boolean): void {
    this.withWebContents(id, wc => wc.setAudioMuted(muted));
  }

  /**
   * Sets the volume of media elements on the page.
   * Uses script injection to control both existing and dynamically added audio/video elements.
   */
  public async setVolume(id: string, volume: number): Promise<void> {
    const webContents = this.getWebContents(id);
    if (!webContents) return;

    try {
      // Wait for page to be ready for script execution if it's loading
      if (webContents.isLoading()) {
        await new Promise<void>(resolve => {
          const onFinish = () => {
            webContents.off('did-finish-load', onFinish);
            webContents.off('did-fail-load', onFinish);
            resolve();
          };
          webContents.once('did-finish-load', onFinish);
          webContents.once('did-fail-load', onFinish);
          setTimeout(resolve, PAGE_LOAD_TIMEOUT_MS);
        });
      }

      // Re-verify webContents is still valid after async wait
      const currentWebContents = this.getWebContents(id);
      if (!currentWebContents || currentWebContents.isDestroyed()) return;

      const volumeDecimal = Math.max(0, Math.min(100, volume)) / 100;

      // Script to set volume and observe for new media elements
      const script = `
        (function() {
          const vol = ${volumeDecimal};
          const setVol = (el) => { el.volume = vol; };
          
          document.querySelectorAll('audio, video').forEach(setVol);
          
          if (!window.__lynxVolumeObserver) {
            window.__lynxVolumeObserver = new MutationObserver(mutations => {
              mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                  if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') setVol(node);
                  if (node.querySelectorAll) {
                    node.querySelectorAll('audio, video').forEach(setVol);
                  }
                });
              });
            });
            window.__lynxVolumeObserver.observe(document.body, {childList: true, subtree: true});
          }
          window.__lynxVolume = vol;
        })();
      `;

      await Promise.race([
        currentWebContents.executeJavaScript(script, true),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Script execution timeout')), SCRIPT_EXECUTION_TIMEOUT_MS),
        ),
      ]);
    } catch (error) {
      console.warn('Volume set skipped:', error instanceof Error ? error.message : String(error));
    }
  }

  public getAudioState(id: string): AudioState | null {
    return (
      this.withWebContents(
        id,
        wc => ({
          playing: !wc.audioMuted && wc.isCurrentlyAudible(),
          muted: wc.audioMuted,
        }),
        null,
      ) ?? null
    );
  }
}
