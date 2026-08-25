import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import type {CanGoType, LynxHotkey, QuickWebNavState} from '@lynx_common/types/ipc';
import type {QuickWebItem, QuickWebStorage} from '@lynx_common/types/storage';
import {formatWebAddress, isMac} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {quickWebMainIpc} from '@lynx_main/ipc/quickWeb';
import classHolder from '@lynx_main/managers/classHolder';
import RegisterHotkeys from '@lynx_main/managers/hotkeys';
import {getUserAgent} from '@lynx_main/utils';
import {
  app,
  BrowserWindow,
  BrowserWindowConstructorOptions,
  globalShortcut,
  session,
  shell,
  WebContents,
  WebContentsView,
} from 'electron';

const HEADER_HEIGHT = 44;
const DEFAULT_WIDTH = 960;
const DEFAULT_HEIGHT = 680;

type ViewEntry = {
  id?: string;
  url: string;
  view: WebContentsView;
  title: string;
  favIcon?: string;
  isLoading: boolean;
};

export default class QuickWindowManager {
  private quickWebWindow?: BrowserWindow;
  private mainWindow?: BrowserWindow;
  private currentRegisteredShortcut?: string;
  private activeViewEntry?: ViewEntry;
  private viewsPool = new Map<string, ViewEntry>(); // Keyed by item.id or URL
  private isAppQuitting = false;
  private saveBoundsTimeout?: NodeJS.Timeout;

  private static readonly WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    frame: false,
    show: false,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: 480,
    minHeight: 360,
    resizable: true,
    maximizable: true,
    minimizable: true,
    skipTaskbar: false,
    transparent: false,
    hasShadow: true,
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      sandbox: false,
    },
  };

  constructor() {
    app.on('before-quit', () => {
      this.isAppQuitting = true;
      this.unregisterGlobalHotkey();
      this.destroyAllWindows();
    });
  }

  public initOnStartup(mainWindow?: BrowserWindow) {
    if (mainWindow) {
      this.mainWindow = mainWindow;
      mainWindow.on('close', () => {
        this.isAppQuitting = true;
        this.destroyAllWindows();
      });
    }

    this.registerGlobalHotkey();

    const config = this.getConfig();
    if (config.enabled && config.keepAliveOnClose) {
      this.createWindow(mainWindow);
    }
  }

  public createWindow(mainWindow?: BrowserWindow) {
    if (mainWindow) {
      this.mainWindow = mainWindow;
    }

    const config = this.getConfig();
    if (!config.enabled) {
      return;
    }

    if (this.quickWebWindow && !this.quickWebWindow.isDestroyed()) {
      return;
    }

    const bounds = config.windowBounds;

    this.quickWebWindow = new BrowserWindow({
      ...QuickWindowManager.WINDOW_CONFIG,
      width: bounds?.width || DEFAULT_WIDTH,
      height: bounds?.height || DEFAULT_HEIGHT,
      x: bounds?.x,
      y: bounds?.y,
      alwaysOnTop: config.alwaysOnTop,
      titleBarStyle: isMac ? 'customButtonsOnHover' : 'default',
    });

    this.setupWindowListeners();
    this.loadWindowContent();
    this.registerGlobalHotkey();
    this.preloadMarkedItems();
  }

  private loadWindowContent() {
    if (!this.quickWebWindow) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.quickWebWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/quickWeb.html`);
    } else {
      this.quickWebWindow.loadFile(path.join(__dirname, '../renderer/quickWeb.html'));
    }
  }

  private setupWindowListeners() {
    if (!this.quickWebWindow) return;

    this.quickWebWindow.on('focus', () => {
      classHolder.contextMenuManager?.setCurrentParentWindow(this.quickWebWindow);
    });

    this.quickWebWindow.on('resize', () => {
      this.handleWindowResize();
      this.scheduleSaveBounds();
    });

    this.quickWebWindow.on('move', () => {
      this.scheduleSaveBounds();
    });

    this.quickWebWindow.on('blur', () => {
      const config = this.getConfig();
      if (config.hideOnBlur) {
        this.hideWindow();
      }
    });

    this.quickWebWindow.on('close', event => {
      if (!this.isAppQuitting) {
        const config = this.getConfig();
        if (config.keepAliveOnClose) {
          event.preventDefault();
          this.hideWindow();
          return;
        }
      }
      this.destroyWindow();
    });

    this.quickWebWindow.on('show', () => {
      quickWebMainIpc.send.onWindowVisibilityChange(true);
      this.syncActiveState();
    });

    this.quickWebWindow.on('hide', () => {
      quickWebMainIpc.send.onWindowVisibilityChange(false);
      const config = this.getConfig();
      if (!config.keepAliveOnClose) {
        this.cleanupNonPreloadedViews();
      }
    });
  }

  private scheduleSaveBounds() {
    if (this.saveBoundsTimeout) {
      clearTimeout(this.saveBoundsTimeout);
    }
    this.saveBoundsTimeout = setTimeout(() => {
      if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;
      const bounds = this.quickWebWindow.getBounds();
      this.updateConfig({windowBounds: bounds});
    }, 500);
  }

  private handleWindowResize() {
    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed() || !this.activeViewEntry) return;

    const [width, height] = this.quickWebWindow.getContentSize();
    this.activeViewEntry.view.setBounds({
      x: 0,
      y: HEADER_HEIGHT,
      width,
      height: Math.max(0, height - HEADER_HEIGHT),
    });
  }

  /**
   * Retrieves the Session to use based on configuration.
   */
  private getSession() {
    const config = this.getConfig();
    const partition = config.sessionType === 'isolated' ? 'persist:lynxhub_quickweb' : 'persist:lynxhub_browser';
    return session.fromPartition(partition);
  }

  /**
   * Creates and initializes a WebContentsView for a given URL.
   */
  private createView(url: string, id?: string, background = false): ViewEntry {
    const {contextMenuManager} = classHolder;
    const view = new WebContentsView({
      webPreferences: {
        session: this.getSession(),
        preload: path.join(__dirname, '../preload/webview.cjs'),
        backgroundThrottling: background,
      },
    });

    const webContents = view.webContents;
    view.setBackgroundColor('#ffffff');
    webContents.setUserAgent(getUserAgent());

    const entry: ViewEntry = {
      id,
      url,
      view,
      title: '',
      favIcon: '',
      isLoading: true,
    };

    // Listeners for WebContents events
    webContents.on('did-start-loading', () => {
      entry.isLoading = true;
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onLoading(true);
      }
    });

    webContents.on('did-stop-loading', () => {
      entry.isLoading = false;
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onLoading(false);
        this.emitCanGo(webContents);
      }
    });

    webContents.on('did-navigate', (_, navUrl) => {
      entry.url = navUrl;
      this.trackUrl(navUrl);
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onUrlChange(navUrl);
        this.emitCanGo(webContents);
      }
    });

    webContents.on('did-navigate-in-page', (_, navUrl) => {
      entry.url = navUrl;
      this.trackUrl(navUrl);
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onUrlChange(navUrl);
        this.emitCanGo(webContents);
      }
    });

    webContents.on('page-title-updated', () => {
      const title = webContents.getTitle();
      entry.title = title;
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onTitleChange(title);
      }
      if (entry.id) {
        const item = this.getConfig().items.find(i => i.id === entry.id);
        if (item && !item.title) {
          this.updateItem(entry.id, {title});
        }
      }
    });

    webContents.on('page-favicon-updated', (_, favicons) => {
      const iconUrl =
        favicons.find(icon => icon.includes('.svg')) ||
        favicons.find(icon => icon.includes('.png')) ||
        favicons.find(icon => !icon.includes('.ico')) ||
        favicons[0] ||
        '';
      entry.favIcon = iconUrl;
      if (this.activeViewEntry === entry) {
        quickWebMainIpc.send.onFavIconChange(iconUrl);
      }
      if (entry.id && iconUrl) {
        this.updateItem(entry.id, {favIcon: iconUrl});
      }
    });

    webContents.setWindowOpenHandler(({url, disposition}) => {
      if (disposition === 'new-window' || disposition === 'foreground-tab' || disposition === 'background-tab') {
        applicationIpc.send.onNewTab(url, disposition === 'background-tab');
        return {action: 'deny'};
      }
      return {action: 'allow'};
    });

    RegisterHotkeys(webContents);
    contextMenuManager?.listenForMenu(webContents);

    if (url && url !== 'about:blank') {
      webContents.loadURL(url).catch(err => {
        if (err?.errno !== -3 && err?.code !== 'ERR_ABORTED') {
          console.warn('[QuickWeb] Failed to load URL:', url, err?.message);
        }
      });
    }

    return entry;
  }

  private emitCanGo(webContents: WebContents) {
    if (webContents.isDestroyed()) return;
    const canGo: CanGoType = {
      back: webContents.navigationHistory.canGoBack(),
      forward: webContents.navigationHistory.canGoForward(),
    };
    quickWebMainIpc.send.onCanGo(canGo);
  }

  private trackUrl(url: string) {
    if (!url || url.startsWith('about:') || url.includes('error_page.html')) return;
    const {storageManager} = classHolder;
    const formattedUrl = formatWebAddress(url);
    storageManager.addBrowserRecent(formattedUrl);
    storageManager.addBrowserHistory(formattedUrl);
  }

  /**
   * Preloads marked items on app startup or configuration update.
   */
  public preloadMarkedItems() {
    const config = this.getConfig();
    if (!config.enabled) return;

    for (const item of config.items) {
      if (item.preload && item.url) {
        if (!this.viewsPool.has(item.id)) {
          const entry = this.createView(item.url, item.id, true);
          this.viewsPool.set(item.id, entry);
        }
      }
    }
  }

  /**
   * Cleans up views that are not marked as preload to free memory when window is hidden.
   */
  private cleanupNonPreloadedViews() {
    const config = this.getConfig();
    const preloadIds = new Set(config.items.filter(i => i.preload).map(i => i.id));

    for (const [key, entry] of this.viewsPool.entries()) {
      if (!entry.id || !preloadIds.has(entry.id)) {
        if (this.activeViewEntry === entry) {
          this.detachActiveView();
        }
        this.destroyViewEntry(entry);
        this.viewsPool.delete(key);
      }
    }
  }

  private destroyViewEntry(entry: ViewEntry) {
    try {
      if (!entry.view.webContents.isDestroyed()) {
        entry.view.webContents.removeAllListeners();
        entry.view.webContents.loadURL('about:blank').catch(() => {});
        (entry.view.webContents as any).close?.();
      }
    } catch (e) {
      console.warn('[QuickWeb] Error destroying view entry:', e);
    }
  }

  private detachActiveView() {
    if (!this.activeViewEntry || !this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;
    try {
      this.quickWebWindow.contentView.removeChildView(this.activeViewEntry.view);
    } catch (e) {
      // Ignored
    }
  }

  private attachView(entry: ViewEntry) {
    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;

    if (this.activeViewEntry && this.activeViewEntry !== entry) {
      this.detachActiveView();
    }

    this.activeViewEntry = entry;
    try {
      this.quickWebWindow.contentView.addChildView(entry.view);
      this.handleWindowResize();
    } catch (e) {
      console.warn('[QuickWeb] Failed to attach view:', e);
    }

    this.syncActiveState();
  }

  private syncActiveState() {
    if (!this.activeViewEntry) return;

    const entry = this.activeViewEntry;
    const config = this.getConfig();
    const webContents = entry.view.webContents;

    const state: QuickWebNavState = {
      url: entry.url || (!webContents.isDestroyed() ? webContents.getURL() : ''),
      title: entry.title || (!webContents.isDestroyed() ? webContents.getTitle() : ''),
      favIcon: entry.favIcon,
      isLoading: entry.isLoading,
      canGo: {
        back: !webContents.isDestroyed() ? webContents.navigationHistory.canGoBack() : false,
        forward: !webContents.isDestroyed() ? webContents.navigationHistory.canGoForward() : false,
      },
      activeItemId: entry.id,
      isPinned: config.alwaysOnTop,
    };

    quickWebMainIpc.send.onStateChange(state);
    quickWebMainIpc.send.onPinnedChange(config.alwaysOnTop);
  }

  /**
   * Selects and displays a configured item by ID.
   */
  public selectItem(itemId: string) {
    const config = this.getConfig();
    if (!config.enabled) return;

    const item = config.items.find(i => i.id === itemId);
    if (!item) return;

    this.updateConfig({activeItemId: itemId});

    let entry = this.viewsPool.get(itemId);
    if (!entry) {
      entry = this.createView(item.url, item.id, false);
      this.viewsPool.set(itemId, entry);
    }

    this.attachView(entry);
    if (this.quickWebWindow && !this.quickWebWindow.isVisible()) {
      this.quickWebWindow.show();
      this.quickWebWindow.focus();
    }
  }

  /**
   * Loads any URL directly into the active view (or creates a new view).
   */
  public loadUrl(rawUrl: string) {
    if (!rawUrl) return;
    const config = this.getConfig();
    if (!config.enabled) return;

    const url = formatWebAddress(rawUrl);

    if (this.activeViewEntry && !this.activeViewEntry.view.webContents.isDestroyed()) {
      this.activeViewEntry.url = url;
      this.activeViewEntry.view.webContents.loadURL(url).catch(err => {
        if (err?.errno !== -3 && err?.code !== 'ERR_ABORTED') {
          console.warn('[QuickWeb] Failed to load URL:', url, err);
        }
      });
      this.syncActiveState();
    } else {
      const entry = this.createView(url, undefined, false);
      this.attachView(entry);
    }

    if (this.quickWebWindow && !this.quickWebWindow.isVisible()) {
      this.quickWebWindow.show();
      this.quickWebWindow.focus();
    }
  }

  /**
   * Toggles visibility of the Quick Web floating window.
   */
  public toggleWindow() {
    const config = this.getConfig();
    if (!config.enabled) return;

    if (this.quickWebWindow && !this.quickWebWindow.isDestroyed() && this.quickWebWindow.isVisible()) {
      if (this.quickWebWindow.isFocused()) {
        this.closeWindow();
      } else {
        this.quickWebWindow.focus();
      }
    } else {
      this.showWindow();
    }
  }

  /**
   * Shows and focuses the Quick Web window.
   */
  public showWindow(itemId?: string, url?: string) {
    const config = this.getConfig();
    if (!config.enabled) return;

    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) {
      const mainWindow = this.mainWindow || classHolder.appManager?.getMainWindow();
      this.createWindow(mainWindow);
    }

    if (!this.quickWebWindow) return;

    if (itemId) {
      this.selectItem(itemId);
    } else if (url) {
      this.loadUrl(url);
    } else if (!this.activeViewEntry) {
      // Pick active item, preloaded item, or first configured item
      const targetId = config.activeItemId || config.items[0]?.id;
      if (targetId) {
        this.selectItem(targetId);
      } else {
        // Default blank or start page
        this.loadUrl('https://www.google.com');
      }
    }

    this.quickWebWindow.show();
    this.quickWebWindow.focus();
    this.syncActiveState();
  }

  /**
   * Hides the Quick Web window.
   */
  public hideWindow() {
    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;
    this.quickWebWindow.hide();
  }

  public minimizeWindow() {
    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;
    this.quickWebWindow.minimize();
  }

  public closeWindow() {
    const config = this.getConfig();
    if (config.keepAliveOnClose) {
      this.hideWindow();
    } else {
      this.destroyWindow();
    }
  }

  public setAlwaysOnTop(alwaysOnTop: boolean) {
    this.updateConfig({alwaysOnTop});
    if (this.quickWebWindow && !this.quickWebWindow.isDestroyed()) {
      this.quickWebWindow.setAlwaysOnTop(alwaysOnTop);
    }
    quickWebMainIpc.send.onPinnedChange(alwaysOnTop);
  }

  public isWindowVisible(): boolean {
    return !!this.quickWebWindow && !this.quickWebWindow.isDestroyed() && this.quickWebWindow.isVisible();
  }

  public goBack() {
    this.activeViewEntry?.view.webContents.navigationHistory.goBack();
  }

  public goForward() {
    this.activeViewEntry?.view.webContents.navigationHistory.goForward();
  }

  public reload() {
    this.activeViewEntry?.view.webContents.reload();
  }

  public stop() {
    this.activeViewEntry?.view.webContents.stop();
  }

  public openInMainTab(targetUrl?: string) {
    const url = targetUrl || this.activeViewEntry?.url || this.activeViewEntry?.view.webContents.getURL();
    if (url && !url.startsWith('about:')) {
      applicationIpc.send.onNewTab(url, false);
      const mainWindow = classHolder.appManager?.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  }

  public openExternal(targetUrl?: string) {
    const url = targetUrl || this.activeViewEntry?.url || this.activeViewEntry?.view.webContents.getURL();
    if (url && !url.startsWith('about:')) {
      shell.openExternal(url);
    }
  }

  public toggleDevTools() {
    if (this.activeViewEntry && !this.activeViewEntry.view.webContents.isDestroyed()) {
      this.activeViewEntry.view.webContents.toggleDevTools();
    }
  }

  // ----------------> Storage & Hotkey configuration
  public getConfig(): QuickWebStorage {
    const storageManager = classHolder.storageManager;
    return storageManager.getData('quickWeb') || storageManager.DEFAULT_DATA.quickWeb;
  }

  public updateConfig(updates: Partial<QuickWebStorage>) {
    const storageManager = classHolder.storageManager;
    const current = this.getConfig();
    const newConfig: QuickWebStorage = {...current, ...updates};
    storageManager.setData('quickWeb', newConfig);

    if (
      updates.globalHotkey !== undefined ||
      updates.globalHotkeyEnabled !== undefined ||
      updates.enabled !== undefined
    ) {
      this.registerGlobalHotkey();
    }

    if (updates.enabled !== undefined) {
      if (!updates.enabled) {
        this.destroyWindow();
      } else if (newConfig.keepAliveOnClose && (!this.quickWebWindow || this.quickWebWindow.isDestroyed())) {
        this.createWindow(this.mainWindow);
      }
    }

    if (updates.alwaysOnTop !== undefined && this.quickWebWindow && !this.quickWebWindow.isDestroyed()) {
      this.quickWebWindow.setAlwaysOnTop(updates.alwaysOnTop);
    }

    if (updates.keepAliveOnClose !== undefined && newConfig.enabled) {
      if (!updates.keepAliveOnClose && !this.isWindowVisible()) {
        this.destroyWindow();
      } else if (updates.keepAliveOnClose && (!this.quickWebWindow || this.quickWebWindow.isDestroyed())) {
        this.createWindow(this.mainWindow);
      }
    }

    quickWebMainIpc.send.onConfigChange(newConfig);
  }

  public addItem(itemInput: Omit<QuickWebItem, 'id' | 'order'> & {id?: string}) {
    const config = this.getConfig();
    const id = itemInput.id || `qw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newItem: QuickWebItem = {
      id,
      title: itemInput.title || itemInput.url,
      url: formatWebAddress(itemInput.url),
      favIcon: itemInput.favIcon,
      preload: !!itemInput.preload,
      order: config.items.length,
    };

    const newItems = [...config.items, newItem];
    this.updateConfig({items: newItems});

    if (config.enabled && newItem.preload) {
      const entry = this.createView(newItem.url, newItem.id, true);
      this.viewsPool.set(newItem.id, entry);
    }
  }

  public updateItem(id: string, updates: Partial<QuickWebItem>) {
    const config = this.getConfig();
    const newItems = config.items.map(item => (item.id === id ? {...item, ...updates} : item));
    this.updateConfig({items: newItems});
  }

  public removeItem(id: string) {
    const config = this.getConfig();
    const newItems = config.items.filter(item => item.id !== id);
    const existingEntry = this.viewsPool.get(id);
    if (existingEntry) {
      if (this.activeViewEntry === existingEntry) {
        this.detachActiveView();
        this.activeViewEntry = undefined;
      }
      this.destroyViewEntry(existingEntry);
      this.viewsPool.delete(id);
    }
    this.updateConfig({items: newItems});
  }

  public reorderItems(items: QuickWebItem[]) {
    const reordered = items.map((item, idx) => ({...item, order: idx}));
    this.updateConfig({items: reordered});
  }

  private registerGlobalHotkey() {
    this.unregisterGlobalHotkey();

    const config = this.getConfig();
    if (!config.enabled || !config.globalHotkeyEnabled || !config.globalHotkey?.key) {
      return;
    }

    const accelerator = this.hotkeyToAccelerator(config.globalHotkey);
    if (!accelerator) return;

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.toggleWindow();
      });

      if (success) {
        this.currentRegisteredShortcut = accelerator;
      } else {
        console.warn(`[QuickWeb] Failed to register global shortcut: ${accelerator}`);
      }
    } catch (e) {
      console.warn(`[QuickWeb] Error registering global shortcut "${accelerator}":`, e);
    }
  }

  private unregisterGlobalHotkey() {
    if (this.currentRegisteredShortcut) {
      try {
        globalShortcut.unregister(this.currentRegisteredShortcut);
      } catch (e) {
        // Ignored
      }
      this.currentRegisteredShortcut = undefined;
    }
  }

  private hotkeyToAccelerator(hotkey: LynxHotkey): string {
    const parts: string[] = [];
    if (hotkey.control) parts.push('CommandOrControl');
    if (hotkey.alt) parts.push('Alt');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.meta) parts.push('Super');

    let key = hotkey.key.toUpperCase();
    if (key === ' ') key = 'Space';
    parts.push(key);

    return parts.join('+');
  }

  public sendMessage(channel: string, ...args: any[]): void {
    if (!this.quickWebWindow || this.quickWebWindow.isDestroyed()) return;
    lynxIpc.send(this.quickWebWindow.webContents, channel, ...args);
  }

  public getWindow(): BrowserWindow | undefined {
    return this.quickWebWindow && !this.quickWebWindow.isDestroyed() ? this.quickWebWindow : undefined;
  }

  public getViewBoundsByWebContents(webContents: WebContents): {x: number; y: number} | undefined {
    for (const entry of this.viewsPool.values()) {
      if (entry.view && !entry.view.webContents.isDestroyed() && entry.view.webContents === webContents) {
        return entry.view.getBounds();
      }
    }
    return undefined;
  }

  public destroyWindow() {
    this.destroyAllViews();

    if (this.quickWebWindow && !this.quickWebWindow.isDestroyed()) {
      try {
        this.quickWebWindow.destroy();
      } catch (e) {
        console.warn('[QuickWeb] Error destroying quickWebWindow:', e);
      }
    }
    this.quickWebWindow = undefined;

    const mainWindow = this.mainWindow || classHolder.appManager?.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      classHolder.contextMenuManager?.setCurrentParentWindow(mainWindow);
    }
  }

  public destroyAllViews() {
    for (const entry of this.viewsPool.values()) {
      this.destroyViewEntry(entry);
    }
    this.viewsPool.clear();
    this.activeViewEntry = undefined;
  }

  public destroyAllWindows() {
    this.destroyWindow();
  }
}
