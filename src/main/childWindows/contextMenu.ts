import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {ElementResizeData} from '@lynx_common/types';
import {isLinux, isMac, isWin} from '@lynx_common/utils';
import {contextMenuIpc} from '@lynx_main/ipc/contextMenu';
import {dialogBlurred} from '@lynx_main/ipc/dialogsWindow';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, BrowserWindowConstructorOptions, screen, WebContents, WebContentsView} from 'electron';

export default class ContextMenuManager {
  private contextMenuWindow?: BrowserWindow;
  private contextMenuView?: WebContentsView;
  private isViewVisible = false;
  private mainWindow?: BrowserWindow;
  private currentParentWindow?: BrowserWindow;
  private customContextPosition: {x: number; y: number} | undefined;
  private currentCursorPosition: {x: number; y: number} | undefined;
  private webContents: WebContents[] = [];

  private static readonly CONTEXT_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    frame: false,
    show: false,
    minWidth: 1,
    minHeight: 1,
    resizable: isWin,
    maximizable: false,
    skipTaskbar: true,
    minimizable: false,
    titleBarStyle: isMac ? 'customButtonsOnHover' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      sandbox: false,
    },
  };

  public createWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.currentParentWindow = mainWindow;

    mainWindow.on('focus', () => {
      this.setCurrentParentWindow(this.mainWindow);
    });

    if (isLinux) {
      if (this.contextMenuView && !this.contextMenuView.webContents.isDestroyed()) {
        try {
          (this.contextMenuView.webContents as any).close?.();
        } catch {
          // Ignored
        }
      }

      this.contextMenuView = new WebContentsView({
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.cjs'),
          sandbox: false,
          backgroundThrottling: false,
        },
      });
      this.contextMenuView.webContents.setBackgroundThrottling(false);
      this.contextMenuView.setBackgroundColor('#00000000');

      this.setupViewListeners();
      this.loadWindowContent();

      try {
        mainWindow.contentView.removeChildView(this.contextMenuView);
      } catch {
        // Ignored
      }
      mainWindow.contentView.addChildView(this.contextMenuView);
      this.contextMenuView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
      return;
    }

    if (this.contextMenuWindow && !this.contextMenuWindow.isDestroyed()) {
      this.contextMenuWindow.close();
    }

    this.contextMenuWindow = new BrowserWindow({...ContextMenuManager.CONTEXT_WINDOW_CONFIG, parent: mainWindow});

    this.setupWindowListeners();
    this.loadWindowContent();
  }

  private setupViewListeners() {
    if (!this.contextMenuView) return;

    this.contextMenuView.webContents.on('before-input-event', (_, input) => {
      if (input.key.toLowerCase() === 'escape') this.hideContextMenu();
    });

    this.contextMenuView.webContents.on('blur', () => this.hideContextMenu(false));

    if (this.mainWindow) {
      this.mainWindow.on('close', () => {
        this.mainWindow = undefined;
        this.webContents = [];
      });
      this.mainWindow.on('blur', () => this.hideContextMenu(false));
    }
  }

  private setupWindowListeners() {
    if (!this.contextMenuWindow) return;

    this.contextMenuWindow.webContents.on('before-input-event', (_, input) => {
      if (input.key.toLowerCase() === 'escape') this.hideContextMenu();
    });

    this.contextMenuWindow.on('blur', () => this.hideContextMenu(false));

    this.contextMenuWindow.on('closed', () => {
      this.contextMenuWindow = undefined;
      this.notifyDownloadManagerClose();
    });

    if (this.mainWindow) {
      this.mainWindow.on('close', () => {
        this.mainWindow = undefined;
        this.webContents = [];
      });
    }
  }

  private loadWindowContent() {
    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/contextMenu.html`
        : path.join(__dirname, '../renderer/contextMenu.html');

    if (isLinux) {
      if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        this.contextMenuView.webContents.loadURL(url);
      } else {
        this.contextMenuView.webContents.loadFile(url);
      }
      return;
    }

    if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.contextMenuWindow.loadURL(url);
    } else {
      this.contextMenuWindow.loadFile(url);
    }
  }

  private notifyDownloadManagerClose() {
    const browserDownloadManager = classHolder.browserDownloadManager;
    if (browserDownloadManager) {
      browserDownloadManager.onContextClose();
    } else {
      classHolder.waitForClass('browserDownloadManager').then(browserDownloadManager => {
        browserDownloadManager.onContextClose();
      });
    }
  }

  public setCurrentParentWindow(parentWindow?: BrowserWindow): void {
    const targetParent = parentWindow && !parentWindow.isDestroyed() ? parentWindow : this.mainWindow;
    this.currentParentWindow = targetParent;
    if (!isLinux && this.contextMenuWindow && !this.contextMenuWindow.isDestroyed()) {
      try {
        this.contextMenuWindow.setParentWindow(targetParent ?? null);
      } catch (e) {
        console.error('Failed to set parent window for context menu:', e);
      }
    }
  }

  public setCustomContextPosition(customPosition?: {x: number; y: number}): void {
    this.customContextPosition = customPosition;
  }

  public listenForMenu(contents: WebContents) {
    this.webContents.push(contents);

    contents.on('destroyed', () => {
      this.webContents = this.webContents.filter(wc => wc !== contents);
    });

    contents.on('context-menu', (_e, params) => {
      if (isLinux) {
        if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;
      } else {
        if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;
      }

      const targetWindow = BrowserWindow.fromWebContents(contents) || this.mainWindow;
      this.setCurrentParentWindow(targetWindow);

      let offsetX = 0;
      let offsetY = 0;
      const browserBounds = classHolder.browserManager?.getBrowserBoundsByWebContents(contents);
      if (browserBounds) {
        offsetX = browserBounds.x;
        offsetY = browserBounds.y;
      } else {
        const quickWebBounds = classHolder.quickWindowManager?.getViewBoundsByWebContents(contents);
        if (quickWebBounds) {
          offsetX = quickWebBounds.x;
          offsetY = quickWebBounds.y;
        }
      }

      this.setCustomContextPosition({x: offsetX + params.x, y: offsetY + params.y});
      contextMenuIpc.send.rightClick(
        params,
        {canGoBack: contents.navigationHistory.canGoBack(), canGoForward: contents.navigationHistory.canGoForward()},
        contents.id,
      );

      this.showContextMenu(targetWindow);
    });
  }

  public getWindow(): BrowserWindow | undefined {
    if (this.contextMenuWindow?.isDestroyed()) {
      this.contextMenuWindow = undefined;
    }
    return this.contextMenuWindow;
  }

  public getView(): WebContentsView | undefined {
    if (this.contextMenuView?.webContents.isDestroyed()) {
      this.contextMenuView = undefined;
    }
    return this.contextMenuView;
  }

  public getWebContent(): WebContents | undefined {
    if (isLinux) {
      return this.contextMenuView && !this.contextMenuView.webContents.isDestroyed()
        ? this.contextMenuView.webContents
        : undefined;
    }
    const window = this.getWindow();
    return window && !window.webContents.isDestroyed() ? window.webContents : undefined;
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) {
      console.error('Failed to send message: webContents is not available.');
      return;
    }
    lynxIpc.send(webContents, channel, ...args);
  }

  public showContextMenu(parentWindow?: BrowserWindow) {
    if (parentWindow !== undefined) {
      this.setCurrentParentWindow(parentWindow);
    } else if (!this.currentParentWindow || this.currentParentWindow.isDestroyed()) {
      this.setCurrentParentWindow(this.mainWindow);
    }

    const targetParent = this.currentParentWindow || this.mainWindow;
    if (!targetParent || targetParent.isDestroyed()) return;

    if (isLinux) {
      if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;

      const parentBounds = targetParent.getContentBounds();
      const cursorScreenPoint = screen.getCursorScreenPoint();
      const relCursorX = cursorScreenPoint.x - parentBounds.x;
      const relCursorY = cursorScreenPoint.y - parentBounds.y;
      const [parentW, parentH] = targetParent.getContentSize();

      if (this.customContextPosition) {
        this.currentCursorPosition = this.customContextPosition;
      } else if (
        relCursorX >= 0 &&
        relCursorX <= parentW &&
        relCursorY >= 0 &&
        relCursorY <= parentH &&
        (cursorScreenPoint.x !== 0 || cursorScreenPoint.y !== 0)
      ) {
        this.currentCursorPosition = {x: relCursorX, y: relCursorY};
      } else {
        this.currentCursorPosition = {
          x: Math.floor(parentW / 2 - 150),
          y: Math.max(40, Math.floor(parentH / 3)),
        };
      }

      try {
        targetParent.contentView.removeChildView(this.contextMenuView);
      } catch {
        // Ignored
      }
      targetParent.contentView.addChildView(this.contextMenuView);
      this.contextMenuView.setBounds({x: -5000, y: -5000, width: 2000, height: 2000});

      contextMenuIpc.send.requestShow();
      return;
    }

    if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

    this.currentCursorPosition = screen.getCursorScreenPoint();

    // We must show the window (with opacity 0) so that Chromium runs the rendering pipeline.
    this.contextMenuWindow.setOpacity(0);
    this.contextMenuWindow.setBounds({width: 2000, height: 2000});
    this.contextMenuWindow.show();

    contextMenuIpc.send.requestShow();
  }

  /**
   * Called by the renderer when it is ready to show, with its final calculated size.
   */
  public applySizeAndShow(data: ElementResizeData) {
    if (isLinux) {
      if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;
      const targetParent = this.currentParentWindow || this.mainWindow;
      if (!targetParent || targetParent.isDestroyed()) return;

      const {width, height} = data;
      const isValid = (val: any) => typeof val === 'number' && Number.isFinite(val) && val > 0;
      if (!isValid(width) || !isValid(height)) return;

      const contentW = Math.max(20, Math.min(Math.ceil(width), 4096));
      const contentH = Math.max(20, Math.min(Math.ceil(height), 4096));

      const [parentW, parentH] = targetParent.getContentSize();
      const clickPoint = this.customContextPosition
        ? {x: Math.floor(this.customContextPosition.x), y: Math.floor(this.customContextPosition.y)}
        : this.currentCursorPosition || {
            x: Math.floor((parentW - contentW) / 2),
            y: Math.floor((parentH - contentH) / 2),
          };

      let newX = clickPoint.x;
      let newY = clickPoint.y;

      if (newX + contentW > parentW) {
        newX = clickPoint.x - (this.customContextPosition ? Math.floor(contentW / 2) : contentW);
      }
      if (newY + contentH > parentH) {
        newY = clickPoint.y - contentH;
      }

      newX = Math.max(0, Math.min(newX, parentW - contentW));
      newY = Math.max(0, Math.min(newY, parentH - contentH));

      this.contextMenuView.setBounds({
        x: Math.floor(newX),
        y: Math.floor(newY),
        width: contentW,
        height: contentH,
      });
      this.contextMenuView.webContents.focus();
      this.isViewVisible = true;
      return;
    }

    if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

    this.resizeContextMenu(data);
    this.positionContextMenuAtCursor();

    this.contextMenuWindow.setOpacity(1);
  }

  public hideContextMenu(focusParent: boolean = true) {
    if (isLinux) {
      if (!this.isViewVisible && (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed())) return;
      this.isViewVisible = false;
      this.setCustomContextPosition(undefined);
      dialogBlurred();

      const targetToFocus = this.currentParentWindow || this.mainWindow;
      if (this.contextMenuView && !this.contextMenuView.webContents.isDestroyed()) {
        this.contextMenuView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
      }
      if (focusParent && targetToFocus && !targetToFocus.isDestroyed()) {
        targetToFocus.focus();
      }
      this.notifyDownloadManagerClose();
      return;
    }

    const window = this.contextMenuWindow;
    if (!window || window.isDestroyed() || !window.isVisible()) return;

    dialogBlurred();

    window.hide();
    window.setOpacity(1);

    const targetToFocus = this.currentParentWindow || this.mainWindow;
    if (focusParent && targetToFocus && !targetToFocus.isDestroyed()) {
      targetToFocus.focus();
    }
  }

  public getContentById(id: number) {
    return this.webContents.find(content => content.id === id);
  }

  /**
   * Resizes the context menu based on content dimensions from the renderer.
   * Ensures the window/view stays within safe bounds (20x20 to 4096x4096).
   */
  public resizeContextMenu(data: ElementResizeData) {
    if (!data || typeof data !== 'object') return;

    const {width, height, dpr} = data;
    const isValid = (val: any) => typeof val === 'number' && Number.isFinite(val) && val > 0;
    if (!isValid(width) || !isValid(height)) return;

    if (isLinux) {
      if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed() || !this.isViewVisible) return;
      const targetParent = this.currentParentWindow || this.mainWindow;
      if (!targetParent || targetParent.isDestroyed()) return;

      const contentW = Math.max(20, Math.min(Math.ceil(width), 4096));
      const contentH = Math.max(20, Math.min(Math.ceil(height), 4096));

      const [parentW, parentH] = targetParent.getContentSize();
      const currentBounds = this.contextMenuView.getBounds();
      let newX = currentBounds.x;
      let newY = currentBounds.y;

      if (newX + contentW > parentW) {
        newX = Math.max(0, parentW - contentW);
      }
      if (newY + contentH > parentH) {
        newY = Math.max(0, parentH - contentH);
      }

      try {
        this.contextMenuView.setBounds({
          x: Math.floor(newX),
          y: Math.floor(newY),
          width: contentW,
          height: contentH,
        });
      } catch (error) {
        console.error('Failed to resize Linux context menu view:', error);
      }
      return;
    }

    const window = this.contextMenuWindow;
    if (!window || window.isDestroyed()) return;

    const scale = isWin ? 1 : isValid(dpr) ? dpr : 1;
    const contentW = Math.max(20, Math.min(Math.ceil(width * scale), 4096));
    const contentH = Math.max(20, Math.min(Math.ceil(height * scale), 4096));

    try {
      window.setBounds({width: contentW, height: contentH}, false);
    } catch (error) {
      console.error('Failed to resize context menu:', error);
    }
  }

  /**
   * Calculates the best position for the context menu.
   * Keeps the menu fully on-screen by "flipping" direction if needed.
   */
  private positionContextMenuAtCursor() {
    const window = this.contextMenuWindow;
    if (!window || window.isDestroyed()) return;

    const {width: menuWidth, height: menuHeight} = window.getBounds();
    let clickPoint: {x: number; y: number};

    const targetParent = this.currentParentWindow || this.mainWindow;
    if (this.customContextPosition && targetParent && !targetParent.isDestroyed()) {
      const parentBounds = targetParent.getBounds();
      clickPoint = {
        x: Math.floor(this.customContextPosition.x) + parentBounds.x + 1,
        y: Math.floor(this.customContextPosition.y) + parentBounds.y + 1,
      };
    } else {
      clickPoint = this.currentCursorPosition || screen.getCursorScreenPoint();
    }

    const display = screen.getDisplayNearestPoint(clickPoint);
    const workArea = display.workArea;

    let newX = clickPoint.x;
    let newY = clickPoint.y;

    if (newX + menuWidth > workArea.x + workArea.width) {
      newX = clickPoint.x - (this.customContextPosition ? menuWidth / 2 : menuWidth);
    }

    if (newY + menuHeight > workArea.y + workArea.height) {
      newY = clickPoint.y - menuHeight;
    }

    newX = Math.max(newX, workArea.x);
    newY = Math.max(newY, workArea.y);

    try {
      window.setBounds({x: Math.floor(newX), y: Math.floor(newY)}, false);
    } catch (e) {
      console.error('Failed to set context menu position:', e);
    }
  }
}
