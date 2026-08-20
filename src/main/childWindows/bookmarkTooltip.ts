import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {isLinux, isWin} from '@lynx_common/utils';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {BrowserWindow, BrowserWindowConstructorOptions, WebContents} from 'electron';

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
    if (isLinux) return;
    if (this.tooltipWindow && !this.tooltipWindow.isDestroyed()) {
      this.tooltipWindow.close();
    }

    this.removeMainWindowListeners();

    this.mainWindow = mainWindow;
    this.tooltipWindow = new BrowserWindow({
      ...BookmarkTooltipManager.WINDOW_CONFIG,
      parent: mainWindow,
    });

    this.tooltipWindow.setIgnoreMouseEvents(true);

    this.loadWindowContent();
    this.setupWindowListeners();
  }

  private loadWindowContent() {
    if (!this.tooltipWindow) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.tooltipWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/bookmarkTooltip.html`);
    } else {
      this.tooltipWindow.loadFile(path.join(__dirname, '../renderer/bookmarkTooltip.html'));
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
    if (isLinux) return;
    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed()) return;
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

    this.updatePosition();

    if (!this.tooltipWindow.isVisible()) {
      this.tooltipWindow.showInactive();
    }
  }

  public hide() {
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
    if (!this.tooltipWindow || this.tooltipWindow.isDestroyed()) return;

    const clampedWidth = Math.min(Math.max(width, 100), 600);
    const clampedHeight = Math.min(Math.max(height, 20), 120);

    this.tooltipWindow.setSize(clampedWidth, clampedHeight);
    this.updatePosition();
  }

  public getWindow(): BrowserWindow | undefined {
    if (this.tooltipWindow?.isDestroyed()) {
      this.tooltipWindow = undefined;
    }
    return this.tooltipWindow;
  }

  public getWebContent(): WebContents | undefined {
    const window = this.getWindow();
    return window && !window.webContents.isDestroyed() ? window.webContents : undefined;
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) return;
    lynxIpc.send(webContents, channel, ...args);
  }
}
