import {browserIpc} from '@lynx_main/ipc/browser';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, WebContents, WebContentsView} from 'electron';

export default class LinkPreviewManager {
  private currentWidth = 400;
  private mainWindow?: BrowserWindow;
  private hideTimeout?: NodeJS.Timeout;
  private channelsRegistered = false;

  public createWindow(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
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
    return classHolder.childWindowManager?.getView();
  }

  public getWebContent(): WebContents | undefined {
    return classHolder.childWindowManager?.getWebContent();
  }

  public sendMessage(channel: string, ...args: any[]): void {
    classHolder.childWindowManager?.sendMessage(channel, ...args);
  }

  private show(url: string) {
    const mainWindow = this.mainWindow || classHolder.childWindowManager?.getCurrentParentWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }

    const childManager = classHolder.childWindowManager;
    if (!childManager) return;

    const activeType = childManager.getActiveType();
    if (activeType === 'contextMenu' || activeType === 'shareScreen') {
      return;
    }

    const childView = childManager.ensureView(mainWindow);
    childManager.setActiveType('linkPreview');

    browserIpc.send.onLinkHover(url);

    const [, winH] = mainWindow.getContentSize();
    const x = 6;
    const y = winH - 28;

    childView.setBounds({x, y, width: this.currentWidth, height: 26});
    childManager.setVisible(true);
  }

  private hide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.hideTimeout = setTimeout(() => {
      if (classHolder.childWindowManager?.getActiveType() === 'linkPreview') {
        classHolder.childWindowManager?.hide(false);
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

    const childManager = classHolder.childWindowManager;
    if (!childManager || !childManager.isShowing() || childManager.getActiveType() !== 'linkPreview') {
      return;
    }

    const mainWindow = this.mainWindow || childManager.getCurrentParentWindow();
    const childView = childManager.getView();

    if (childView && !childView.webContents.isDestroyed() && mainWindow && !mainWindow.isDestroyed()) {
      const [, winH] = mainWindow.getContentSize();
      const x = 6;
      const y = winH - 28;
      childView.setBounds({x, y, width: clampedWidth, height: 26});
    }
  }
}
