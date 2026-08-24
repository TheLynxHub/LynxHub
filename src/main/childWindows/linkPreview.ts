import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {browserIpc} from '@lynx_main/ipc/browser';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {BrowserWindow, WebContents, WebContentsView} from 'electron';

export default class LinkPreviewManager {
  private linkPreviewView?: WebContentsView;
  private isViewVisible = false;
  private currentWidth = 400;
  private mainWindow?: BrowserWindow;
  private hideTimeout?: NodeJS.Timeout;
  private channelsRegistered = false;

  private boundHide = () => this.hide();

  public createWindow(mainWindow: BrowserWindow) {
    this.removeMainWindowListeners();
    this.mainWindow = mainWindow;

    if (this.linkPreviewView && !this.linkPreviewView.webContents.isDestroyed()) {
      try {
        (this.linkPreviewView.webContents as any).close?.();
      } catch {
        // Ignored
      }
    }

    this.linkPreviewView = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.cjs'),
        sandbox: false,
        backgroundThrottling: false,
      },
    });
    this.linkPreviewView.webContents.setBackgroundThrottling(false);
    this.linkPreviewView.setBackgroundColor('#00000000');

    this.loadWindowContent();
    this.setupViewListeners();

    try {
      mainWindow.contentView.removeChildView(this.linkPreviewView);
    } catch {
      // Ignored
    }
    mainWindow.contentView.addChildView(this.linkPreviewView);
    this.linkPreviewView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
  }

  private setupViewListeners() {
    if (!this.mainWindow) return;

    this.mainWindow.on('hide', this.boundHide);
    this.mainWindow.on('minimize', this.boundHide);
    this.mainWindow.on('blur', this.boundHide);

    this.mainWindow.on('close', () => {
      this.removeMainWindowListeners();
      this.mainWindow = undefined;
    });
  }

  private loadWindowContent() {
    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/linkPreview.html`
        : path.join(__dirname, '../renderer/linkPreview.html');

    if (!this.linkPreviewView || this.linkPreviewView.webContents.isDestroyed()) return;
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.linkPreviewView.webContents.loadURL(url);
    } else {
      this.linkPreviewView.webContents.loadFile(url);
    }
  }

  private removeMainWindowListeners() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.off('hide', this.boundHide);
    this.mainWindow.off('minimize', this.boundHide);
    this.mainWindow.off('blur', this.boundHide);
  }

  public listenForChannels() {
    if (this.channelsRegistered) return;
    this.channelsRegistered = true;

    browserIpc.on.resizeLinkPreview(width => this.resizeWindow(width));
  }

  public updateUrl(url: string) {
    if (url) {
      this.show(url);
    } else {
      this.hide();
    }
  }

  public getView(): WebContentsView | undefined {
    if (this.linkPreviewView?.webContents.isDestroyed()) {
      this.linkPreviewView = undefined;
    }
    return this.linkPreviewView;
  }

  public getWebContent(): WebContents | undefined {
    return this.linkPreviewView && !this.linkPreviewView.webContents.isDestroyed()
      ? this.linkPreviewView.webContents
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

  private show(url: string) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }

    browserIpc.send.onLinkHover(url);

    if (!this.linkPreviewView || this.linkPreviewView.webContents.isDestroyed()) return;

    const [, winH] = this.mainWindow.getContentSize();
    const x = 6;
    const y = winH - 28;

    try {
      this.mainWindow.contentView.removeChildView(this.linkPreviewView);
    } catch {
      // Ignored
    }
    this.mainWindow.contentView.addChildView(this.linkPreviewView);
    this.linkPreviewView.setBounds({x, y, width: this.currentWidth, height: 26});
    this.isViewVisible = true;
  }

  private hide() {
    this.hideTimeout = setTimeout(() => {
      if (
        this.linkPreviewView &&
        !this.linkPreviewView.webContents.isDestroyed() &&
        this.mainWindow &&
        !this.mainWindow.isDestroyed()
      ) {
        this.linkPreviewView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
        this.isViewVisible = false;
      }
    }, 50);
  }

  /**
   * Resizes the link preview window width.
   * Clamps width between 100px and 800px.
   */
  public resizeWindow(width: number) {
    const clampedWidth = Math.min(Math.max(width, 100), 800);
    this.currentWidth = clampedWidth;

    if (
      this.isViewVisible &&
      this.linkPreviewView &&
      !this.linkPreviewView.webContents.isDestroyed() &&
      this.mainWindow &&
      !this.mainWindow.isDestroyed()
    ) {
      const [, winH] = this.mainWindow.getContentSize();
      const x = 6;
      const y = winH - 28;
      this.linkPreviewView.setBounds({x, y, width: clampedWidth, height: 26});
    }
  }
}
