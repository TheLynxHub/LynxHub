import classHolder from '@lynx_main/managers/classHolder';
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
  private currentWidth = 320;
  private currentHeight = 52;
  private mainWindow?: BrowserWindow;
  private hideTimeout?: NodeJS.Timeout;
  private currentAnchor?: {x: number; y: number; height: number};

  public createWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  public show(data: TooltipShowData) {
    const mainWindow = this.mainWindow || classHolder.childWindowManager?.getCurrentParentWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }

    this.currentAnchor = {
      x: data.x,
      y: data.y,
      height: data.height || 28,
    };

    const childManager = classHolder.childWindowManager;
    if (!childManager) return;

    const activeType = childManager.getActiveType();
    if (activeType === 'contextMenu' || activeType === 'shareScreen') {
      return;
    }

    const childView = childManager.ensureView(mainWindow);
    childManager.setActiveType('bookmarkTooltip');

    bookmarkTooltipIpc.send.onData({title: data.title, url: data.url});

    const [winW, winH] = mainWindow.getContentSize();
    let x = Math.floor(data.x);
    let y = Math.floor(data.y + (data.height || 28) + 4);

    if (x + this.currentWidth > winW) {
      x = Math.max(0, winW - this.currentWidth - 8);
    }
    if (y + this.currentHeight > winH) {
      y = Math.max(0, Math.floor(data.y - this.currentHeight - 4));
    }

    childView.setBounds({x, y, width: this.currentWidth, height: this.currentHeight});
    childManager.setVisible(true);
  }

  public hide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      if (classHolder.childWindowManager?.getActiveType() === 'bookmarkTooltip') {
        classHolder.childWindowManager?.hide(false);
      }
    }, 40);
  }

  public resizeWindow(width: number, height: number) {
    const clampedWidth = Math.min(Math.max(width, 100), 600);
    const clampedHeight = Math.min(Math.max(height, 20), 120);

    this.currentWidth = clampedWidth;
    this.currentHeight = clampedHeight;

    const childManager = classHolder.childWindowManager;
    if (!childManager || !childManager.isShowing() || childManager.getActiveType() !== 'bookmarkTooltip') {
      return;
    }

    const mainWindow = this.mainWindow || childManager.getCurrentParentWindow();
    const childView = childManager.getView();

    if (
      childView &&
      !childView.webContents.isDestroyed() &&
      this.currentAnchor &&
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      const [winW, winH] = mainWindow.getContentSize();
      let x = Math.floor(this.currentAnchor.x);
      let y = Math.floor(this.currentAnchor.y + this.currentAnchor.height + 4);

      if (x + clampedWidth > winW) {
        x = Math.max(0, winW - clampedWidth - 8);
      }
      if (y + clampedHeight > winH) {
        y = Math.max(0, Math.floor(this.currentAnchor.y - clampedHeight - 4));
      }

      childView.setBounds({x, y, width: clampedWidth, height: clampedHeight});
    }
  }

  public getView(): WebContentsView | undefined {
    return classHolder.childWindowManager?.getView();
  }

  public getWebContent(): WebContents | undefined {
    return classHolder.childWindowManager?.getWebContent();
  }

  public sendMessage(channel: string, ...args: any[]): void {
    classHolder.childWindowManager?.sendMessage(channel, ...args);
  }
}
