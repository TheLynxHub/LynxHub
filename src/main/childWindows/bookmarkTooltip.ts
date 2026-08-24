import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {isLinux, isWin} from '@lynx_common/utils';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {BrowserWindow, BrowserWindowConstructorOptions, WebContents, WebContentsView} from 'electron';

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
  private tooltipWindow?: BrowserWindow;
  private tooltipView?: WebContentsView;
  private isViewVisible = false;
  private currentWidth = 320;
  private currentHeight = 52;
  private mainWindow?: BrowserWindow;
  private hideTimeout?: NodeJS.Timeout;
  private currentAnchor?: {x: number; y: number; height: number};

  private boundHide = () => this.hide();
  private boundUpdatePosition = () => this.updatePosition();

  private static readonly WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    frame: false,
    show: false,
    width: 320,
    height: 52,
    minWidth: 0,
    minHeight: 0,
    resizable: isWin,
    maximizable: false,
    minimizable: false,
    skipTaskbar: true,
    focusable: false,
    transparent: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      sandbox: false,
    },
  };

  public createWindow(mainWindow: BrowserWindow) {
    this.removeMainWindowListeners();
    this.mainWindow = mainWindow;

    if (isLinux) {
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
      return;
    }

    if (this.tooltipWindow && !this.tooltipWindow.isDestroyed()) {
      this.tooltipWindow.close();
    }

    this.tooltipWindow = new BrowserWindow({
      ...BookmarkTooltipManager.WINDOW_CONFIG,
      parent: mainWindow,
    });

    this.tooltipWindow.setIgnoreMouseEvents(true);

    this.loadWindowContent();
    this.setupWindowListeners();
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

    if (isLinux) {
      if (!this.tooltipView || this.tooltipView.webContents.isDestroyed()) return;
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        this.tooltipView.webContents.loadURL(url);
      } else {
        this.tooltipView.webContents.loadFile(url);
      }
      return;
    }

    if (!this.tooltipWindow) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.tooltipWindow.loadURL(url);
    } else {
      this.tooltipWindow.loadFile(url);
    }
  }

  private setupWindowListeners() {
    if (!this.mainWindow || !this.tooltipWindow) return;

    this.mainWindow.on('hide', this.boundHide);
    this.mainWindow.on('minimize', this.boundHide);
    this.mainWindow.on('blur', this.boundHide);
    this.mainWindow.on('move', this.boundUpdatePosition);
    this.mainWindow.on('resize', this.boundUpdatePosition);

    this.tooltipWindow.on('closed', () => {
      this.tooltipWindow = undefined;
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = undefined;
      }
    });

    this.mainWindow.on('close', () => {
      this.removeMainWindowListeners();
      this.mainWindow = undefined;
    });
  }

  private removeMainWindowListeners() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    this.mainWindow.off('hide', this.boundHide);
    this.mainWindow.off('minimize', this.boundHide);
    this.mainWindow.off('blur', this.boundHide);
    this.mainWindow.off('move', this.boundUpdatePosition);
    this.mainWindow.off('resize', this.boundUpdatePosition);
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

    if (isLinux) {
      if (!this.tooltipView || this.tooltipView.webContents.isDestroyed()) return;

      const x = Math.floor(data.x);
      const y = Math.floor(data.y + (data.height || 28) + 4);

      try {
        this.mainWindow.contentView.removeChildView(this.tooltipView);
      } catch {
        // Ignored
      }
      this.mainWindow.contentView.addChildView(this.tooltipView);
      this.tooltipView.setBounds({x, y, width: this.currentWidth, height: this.currentHeight});
      this.isViewVisible = true;
      return;
    }

    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed()) return;

    this.updatePosition();

    if (!this.tooltipWindow.isVisible()) {
      this.tooltipWindow.showInactive();
    }
  }

  public hide() {
    if (isLinux) {
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
      return;
    }

    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed()) return;

    this.hideTimeout = setTimeout(() => {
      if (this.tooltipWindow && !this.tooltipWindow.isDestroyed()) {
        this.tooltipWindow.hide();
      }
    }, 40);
  }

  private updatePosition() {
    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed() || !this.currentAnchor) return;
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const mainBounds = this.mainWindow.getContentBounds();

    // Position right below the anchor point
    const x = mainBounds.x + this.currentAnchor.x;
    const y = mainBounds.y + this.currentAnchor.y + this.currentAnchor.height + 4;

    try {
      this.tooltipWindow.setPosition(Math.floor(x), Math.floor(y));
    } catch {
      // Ignore errors if window is destroyed
    }
  }

  public resizeWindow(width: number, height: number) {
    const clampedWidth = Math.min(Math.max(width, 100), 600);
    const clampedHeight = Math.min(Math.max(height, 20), 120);

    this.currentWidth = clampedWidth;
    this.currentHeight = clampedHeight;

    if (isLinux) {
      if (
        this.isViewVisible &&
        this.tooltipView &&
        !this.tooltipView.webContents.isDestroyed() &&
        this.currentAnchor &&
        this.mainWindow &&
        !this.mainWindow.isDestroyed()
      ) {
        const x = Math.floor(this.currentAnchor.x);
        const y = Math.floor(this.currentAnchor.y + this.currentAnchor.height + 4);
        this.tooltipView.setBounds({x, y, width: clampedWidth, height: clampedHeight});
      }
      return;
    }

    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed()) return;

    this.tooltipWindow.setSize(clampedWidth, clampedHeight);
    this.updatePosition();
  }

  public getWindow(): BrowserWindow | undefined {
    if (this.tooltipWindow?.isDestroyed()) {
      this.tooltipWindow = undefined;
    }
    return this.tooltipWindow;
  }

  public getView(): WebContentsView | undefined {
    if (this.tooltipView?.webContents.isDestroyed()) {
      this.tooltipView = undefined;
    }
    return this.tooltipView;
  }

  public getWebContent(): WebContents | undefined {
    if (isLinux) {
      return this.tooltipView && !this.tooltipView.webContents.isDestroyed() ? this.tooltipView.webContents : undefined;
    }
    const window = this.getWindow();
    return window && !window.webContents.isDestroyed() ? window.webContents : undefined;
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) return;
    lynxIpc.send(webContents, channel, ...args);
  }
}
