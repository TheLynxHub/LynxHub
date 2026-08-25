import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {contextMenuChannels} from '@lynx_common/consts/ipcChannels/contextMenu';
import {dialogBlurred} from '@lynx_main/ipc/dialogsWindow';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, WebContents, WebContentsView} from 'electron';

export type ChildOverlayType = 'contextMenu' | 'bookmarkTooltip' | 'linkPreview' | 'shareScreen';

/**
 * Manages the single shared WebContentsView for all child overlays in LynxHub
 * (context menu, bookmark tooltip, link preview, share screen modal).
 *
 * Provides:
 * - Lazy initialization on first user request (no startup penalty)
 * - Ultra-low memory usage when hidden (unloads React DOM / components)
 * - Instant fast-show on subsequent requests (warm Chromium view)
 * - Seamless parent window switching (MainWindow <-> QuickWeb)
 */
export default class ChildWindowManager {
  private childView?: WebContentsView;
  private isViewVisible = false;
  private mainWindow?: BrowserWindow;
  private currentParentWindow?: BrowserWindow;
  private activeType?: ChildOverlayType;
  private customPosition?: {x: number; y: number};
  private escapeHandler?: () => void;
  private isPreparingShow = false;
  private boundParentHide = () => this.hide(false);

  public setMainWindow(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    if (!this.currentParentWindow || this.currentParentWindow.isDestroyed()) {
      this.currentParentWindow = mainWindow;
    }

    mainWindow.on('focus', () => {
      this.setCurrentParentWindow(this.mainWindow);
    });
  }

  public setCurrentParentWindow(parentWindow?: BrowserWindow): void {
    const target = parentWindow && !parentWindow.isDestroyed() ? parentWindow : this.mainWindow;
    if (this.currentParentWindow !== target) {
      this.removeParentListeners(this.currentParentWindow);
      this.currentParentWindow = target;
      this.setupParentListeners(target);
    }
  }

  public getCurrentParentWindow(): BrowserWindow | undefined {
    if (!this.currentParentWindow || this.currentParentWindow.isDestroyed()) {
      this.currentParentWindow = this.mainWindow && !this.mainWindow.isDestroyed() ? this.mainWindow : undefined;
    }
    return this.currentParentWindow;
  }

  public setCustomPosition(position?: {x: number; y: number}): void {
    this.customPosition = position;
  }

  public getCustomPosition(): {x: number; y: number} | undefined {
    return this.customPosition;
  }

  public setActiveType(type?: ChildOverlayType): void {
    this.activeType = type;
  }

  public getActiveType(): ChildOverlayType | undefined {
    return this.activeType;
  }

  public setEscapeHandler(handler?: () => void): void {
    this.escapeHandler = handler;
  }

  public isShowing(): boolean {
    return this.isViewVisible;
  }

  public getView(): WebContentsView | undefined {
    if (this.childView?.webContents.isDestroyed()) {
      this.childView = undefined;
    }
    return this.childView;
  }

  public getWebContent(): WebContents | undefined {
    return this.childView && !this.childView.webContents.isDestroyed() ? this.childView.webContents : undefined;
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) return;
    lynxIpc.send(webContents, channel, ...args);
  }

  /**
   * Lazily creates or returns the single WebContentsView attached to the target parent window.
   */
  public ensureView(parentWindow?: BrowserWindow): WebContentsView {
    if (parentWindow) {
      this.setCurrentParentWindow(parentWindow);
    }

    const targetParent = this.getCurrentParentWindow();

    if (!this.childView || this.childView.webContents.isDestroyed()) {
      this.childView = new WebContentsView({
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.cjs'),
          sandbox: false,
        },
      });
      this.childView.webContents.setBackgroundThrottling(false);
      this.childView.setBackgroundColor('#00000000');

      this.setupViewListeners();
      this.loadWindowContent();
    }

    if (targetParent && !targetParent.isDestroyed()) {
      try {
        targetParent.contentView.removeChildView(this.childView);
      } catch {
        // Ignored
      }
      targetParent.contentView.addChildView(this.childView);
    }

    return this.childView;
  }

  private setupViewListeners(): void {
    if (!this.childView) return;

    this.childView.webContents.on('before-input-event', (_, input) => {
      if (input.key.toLowerCase() === 'escape') {
        if (this.escapeHandler) {
          this.escapeHandler();
        } else {
          this.hide();
        }
      }
    });

    this.childView.webContents.on('blur', () => {
      // Auto-hide context menu when losing focus, but not during initial show preparation
      if (this.activeType === 'contextMenu' && !this.isPreparingShow) {
        this.hide(false);
      }
    });
  }

  private setupParentListeners(parent?: BrowserWindow): void {
    if (!parent || parent.isDestroyed()) return;

    parent.on('hide', this.boundParentHide);
    parent.on('minimize', this.boundParentHide);
    parent.on('blur', this.boundParentHide);

    parent.on('close', () => {
      this.removeParentListeners(parent);
      if (this.currentParentWindow === parent) {
        this.currentParentWindow = undefined;
      }
    });
  }

  private removeParentListeners(parent?: BrowserWindow): void {
    if (!parent || parent.isDestroyed()) return;
    parent.off('hide', this.boundParentHide);
    parent.off('minimize', this.boundParentHide);
    parent.off('blur', this.boundParentHide);
  }

  private loadWindowContent(): void {
    if (!this.childView || this.childView.webContents.isDestroyed()) return;

    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/contextMenu.html`
        : path.join(__dirname, '../renderer/contextMenu.html');

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.childView.webContents.loadURL(url);
    } else {
      this.childView.webContents.loadFile(url);
    }
  }

  private notifyDownloadManagerClose(): void {
    const browserDownloadManager = classHolder.browserDownloadManager;
    if (browserDownloadManager) {
      browserDownloadManager.onContextClose();
    } else {
      classHolder.waitForClass('browserDownloadManager').then(manager => {
        manager.onContextClose();
      });
    }
  }

  /**
   * Sets whether the view is currently in the middle of preparing to show.
   */
  public setPreparingShow(preparing: boolean): void {
    this.isPreparingShow = preparing;
  }

  /**
   * Hides the view, moves it offscreen, and sends an unload event to the renderer
   * so all DOM nodes and layout states are freed from memory.
   */
  public hide(focusParent: boolean = true): void {
    if (!this.isViewVisible && (!this.childView || this.childView.webContents.isDestroyed())) {
      return;
    }

    const previousType = this.activeType;
    this.isViewVisible = false;
    this.isPreparingShow = false;
    this.activeType = undefined;
    this.customPosition = undefined;
    this.escapeHandler = undefined;

    dialogBlurred();

    if (this.childView && !this.childView.webContents.isDestroyed()) {
      this.childView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
      this.sendMessage(contextMenuChannels.onUnload);
    }

    const targetToFocus = this.getCurrentParentWindow();
    if (focusParent && targetToFocus && !targetToFocus.isDestroyed()) {
      targetToFocus.focus();
    }

    if (previousType === 'contextMenu') {
      this.notifyDownloadManagerClose();
    }
  }

  public setVisible(visible: boolean): void {
    this.isViewVisible = visible;
    if (visible) {
      this.isPreparingShow = false;
    }
  }
}
