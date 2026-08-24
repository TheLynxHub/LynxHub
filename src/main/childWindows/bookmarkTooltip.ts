import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {BrowserWindow, WebContents, WebContentsView} from 'electron';

import {bookmarkTooltipIpc} from '../ipc/bookmarkTooltip';

export type TooltipShowData = {
  title: string;
  url: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export default class BookmarkTooltipManager {
  private tooltipView?: WebContentsView;
  private isViewVisible = false;
  private currentWidth = 320;
  private currentHeight = 52;
  private mainWindow?: BrowserWindow;
  private hideTimeout?: NodeJS.Timeout;
  private currentAnchor?: {x: number; y: number; height: number};

  private boundHide = () => this.hide();

  public createWindow(mainWindow: BrowserWindow) {
    this.removeMainWindowListeners();
    this.mainWindow = mainWindow;

    if (this.tooltipView && !this.tooltipView.webContents.isDestroyed()) {
      try {
        (this.tooltipView.webContents as any).close?.();
      } catch {
        // Ignored
      }
    }

    this.tooltipView = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.cjs'),
        sandbox: false,
        backgroundThrottling: false,
      },
    });
    this.tooltipView.webContents.setBackgroundThrottling(false);
    this.tooltipView.setBackgroundColor('#00000000');

    this.setupViewListeners();
    this.loadWindowContent();

    try {
      mainWindow.contentView.removeChildView(this.tooltipView);
    } catch {
      // Ignored
    }
    mainWindow.contentView.addChildView(this.tooltipView);
    this.tooltipView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
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
        ? `${process.env['ELECTRON_RENDERER_URL']}/bookmarkTooltip.html`
        : path.join(__dirname, '../renderer/bookmarkTooltip.html');

    if (!this.tooltipView || this.tooltipView.webContents.isDestroyed()) return;
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.tooltipView.webContents.loadURL(url);
    } else {
      this.tooltipView.webContents.loadFile(url);
    }
  }

  private removeMainWindowListeners() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.off('hide', this.boundHide);
    this.mainWindow.off('minimize', this.boundHide);
    this.mainWindow.off('blur', this.boundHide);
  }

  public show(data: TooltipShowData) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }

    this.currentAnchor = {
      x: data.x,
      y: data.y,
      height: data.height || 28,
    };

    bookmarkTooltipIpc.send.onData({title: data.title, url: data.url});

    if (!this.tooltipView || this.tooltipView.webContents.isDestroyed()) return;

    const [winW, winH] = this.mainWindow.getContentSize();
    let x = Math.floor(data.x);
    let y = Math.floor(data.y + (data.height || 28) + 4);

    if (x + this.currentWidth > winW) {
      x = Math.max(0, winW - this.currentWidth - 8);
    }
    if (y + this.currentHeight > winH) {
      y = Math.max(0, Math.floor(data.y - this.currentHeight - 4));
    }

    try {
      this.mainWindow.contentView.removeChildView(this.tooltipView);
    } catch {
      // Ignored
    }
    this.mainWindow.contentView.addChildView(this.tooltipView);
    this.tooltipView.setBounds({x, y, width: this.currentWidth, height: this.currentHeight});
    this.isViewVisible = true;
  }

  public hide() {
    this.hideTimeout = setTimeout(() => {
      if (
        this.tooltipView &&
        !this.tooltipView.webContents.isDestroyed() &&
        this.mainWindow &&
        !this.mainWindow.isDestroyed()
      ) {
        this.tooltipView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
        this.isViewVisible = false;
      }
    }, 40);
  }

  public resizeWindow(width: number, height: number) {
    const clampedWidth = Math.min(Math.max(width, 100), 600);
    const clampedHeight = Math.min(Math.max(height, 20), 120);

    this.currentWidth = clampedWidth;
    this.currentHeight = clampedHeight;

    if (
      this.isViewVisible &&
      this.tooltipView &&
      !this.tooltipView.webContents.isDestroyed() &&
      this.currentAnchor &&
      this.mainWindow &&
      !this.mainWindow.isDestroyed()
    ) {
      const [winW, winH] = this.mainWindow.getContentSize();
      let x = Math.floor(this.currentAnchor.x);
      let y = Math.floor(this.currentAnchor.y + this.currentAnchor.height + 4);

      if (x + clampedWidth > winW) {
        x = Math.max(0, winW - clampedWidth - 8);
      }
      if (y + clampedHeight > winH) {
        y = Math.max(0, Math.floor(this.currentAnchor.y - clampedHeight - 4));
      }

      this.tooltipView.setBounds({x, y, width: clampedWidth, height: clampedHeight});
    }
  }

  public getView(): WebContentsView | undefined {
    if (this.tooltipView?.webContents.isDestroyed()) {
      this.tooltipView = undefined;
    }
    return this.tooltipView;
  }

  public getWebContent(): WebContents | undefined {
    return this.tooltipView && !this.tooltipView.webContents.isDestroyed() ? this.tooltipView.webContents : undefined;
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) return;
    lynxIpc.send(webContents, channel, ...args);
  }
}
