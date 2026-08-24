import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {ElementResizeData} from '@lynx_common/types';
import {contextMenuIpc} from '@lynx_main/ipc/contextMenu';
import {dialogBlurred} from '@lynx_main/ipc/dialogsWindow';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, screen, WebContents, WebContentsView} from 'electron';

export default class ContextMenuManager {
  private contextMenuView?: WebContentsView;
  private isViewVisible = false;
  private mainWindow?: BrowserWindow;
  private currentParentWindow?: BrowserWindow;
  private customContextPosition: {x: number; y: number} | undefined;
  private currentCursorPosition: {x: number; y: number} | undefined;
  private webContents: WebContents[] = [];

  public createWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.currentParentWindow = mainWindow;

    mainWindow.on('focus', () => {
      this.setCurrentParentWindow(this.mainWindow);
    });

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

  private loadWindowContent() {
    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/contextMenu.html`
        : path.join(__dirname, '../renderer/contextMenu.html');

    if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.contextMenuView.webContents.loadURL(url);
    } else {
      this.contextMenuView.webContents.loadFile(url);
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
    this.currentParentWindow = parentWindow && !parentWindow.isDestroyed() ? parentWindow : this.mainWindow;
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
      if (!this.contextMenuView || this.contextMenuView.webContents.isDestroyed()) return;

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

  public getView(): WebContentsView | undefined {
    if (this.contextMenuView?.webContents.isDestroyed()) {
      this.contextMenuView = undefined;
    }
    return this.contextMenuView;
  }

  public getWebContent(): WebContents | undefined {
    return this.contextMenuView && !this.contextMenuView.webContents.isDestroyed()
      ? this.contextMenuView.webContents
      : undefined;
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
  }

  /**
   * Called by the renderer when it is ready to show, with its final calculated size.
   */
  public applySizeAndShow(data: ElementResizeData) {
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
  }

  public hideContextMenu(focusParent: boolean = true) {
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
  }

  public getContentById(id: number) {
    return this.webContents.find(content => content.id === id);
  }

  /**
   * Resizes the context menu based on content dimensions from the renderer.
   * Ensures the view stays within safe bounds (20x20 to 4096x4096).
   */
  public resizeContextMenu(data: ElementResizeData) {
    if (!data || typeof data !== 'object') return;

    const {width, height} = data;
    const isValid = (val: any) => typeof val === 'number' && Number.isFinite(val) && val > 0;
    if (!isValid(width) || !isValid(height)) return;

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
      console.error('Failed to resize context menu view:', error);
    }
  }
}
