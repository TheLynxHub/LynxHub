import {ElementResizeData} from '@lynx_common/types';
import {contextMenuIpc} from '@lynx_main/ipc/contextMenu';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, screen, WebContents, WebContentsView} from 'electron';

export default class ContextMenuManager {
  private currentCursorPosition: {x: number; y: number} | undefined;
  private webContents: WebContents[] = [];

  public createWindow(mainWindow: BrowserWindow) {
    classHolder.childWindowManager?.setMainWindow(mainWindow);
  }

  public setCurrentParentWindow(parentWindow?: BrowserWindow): void {
    classHolder.childWindowManager?.setCurrentParentWindow(parentWindow);
  }

  public setCustomContextPosition(customPosition?: {x: number; y: number}): void {
    classHolder.childWindowManager?.setCustomPosition(customPosition);
  }

  public listenForMenu(contents: WebContents) {
    this.webContents.push(contents);

    contents.on('destroyed', () => {
      this.webContents = this.webContents.filter(wc => wc !== contents);
    });

    contents.on('context-menu', (_e, params) => {
      const targetWindow =
        BrowserWindow.fromWebContents(contents) || classHolder.childWindowManager?.getCurrentParentWindow();
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
    return classHolder.childWindowManager?.getView();
  }

  public getWebContent(): WebContents | undefined {
    return classHolder.childWindowManager?.getWebContent();
  }

  public sendMessage(channel: string, ...args: any[]): void {
    classHolder.childWindowManager?.sendMessage(channel, ...args);
  }

  public showContextMenu(parentWindow?: BrowserWindow) {
    if (parentWindow !== undefined) {
      this.setCurrentParentWindow(parentWindow);
    }

    const childManager = classHolder.childWindowManager;
    if (!childManager) return;

    const targetParent = childManager.getCurrentParentWindow();
    if (!targetParent || targetParent.isDestroyed()) return;

    const childView = childManager.ensureView(targetParent);
    childManager.setActiveType('contextMenu');

    const parentBounds = targetParent.getContentBounds();
    const cursorScreenPoint = screen.getCursorScreenPoint();
    const relCursorX = cursorScreenPoint.x - parentBounds.x;
    const relCursorY = cursorScreenPoint.y - parentBounds.y;
    const [parentW, parentH] = targetParent.getContentSize();
    const customContextPosition = childManager.getCustomPosition();

    if (customContextPosition) {
      this.currentCursorPosition = customContextPosition;
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

    childManager.setPreparingShow(true);
    childView.setBounds({x: -5000, y: -5000, width: 2000, height: 2000});
    contextMenuIpc.send.requestShow();
  }

  /**
   * Called by the renderer when it is ready to show, with its final calculated size.
   */
  public applySizeAndShow(data: ElementResizeData) {
    const childManager = classHolder.childWindowManager;
    if (!childManager) return;

    const childView = childManager.getView();
    if (!childView || childView.webContents.isDestroyed()) return;
    const targetParent = childManager.getCurrentParentWindow();
    if (!targetParent || targetParent.isDestroyed()) return;

    const {width, height} = data;
    const isValid = (val: any) => typeof val === 'number' && Number.isFinite(val) && val > 0;
    if (!isValid(width) || !isValid(height)) return;

    const contentW = Math.max(20, Math.min(Math.ceil(width), 4096));
    const contentH = Math.max(20, Math.min(Math.ceil(height), 4096));

    const [parentW, parentH] = targetParent.getContentSize();
    const customContextPosition = childManager.getCustomPosition();
    const clickPoint = customContextPosition
      ? {x: Math.floor(customContextPosition.x), y: Math.floor(customContextPosition.y)}
      : this.currentCursorPosition || {
          x: Math.floor((parentW - contentW) / 2),
          y: Math.floor((parentH - contentH) / 2),
        };

    let newX = clickPoint.x;
    let newY = clickPoint.y;

    if (newX + contentW > parentW) {
      newX = clickPoint.x - (customContextPosition ? Math.floor(contentW / 2) : contentW);
    }
    if (newY + contentH > parentH) {
      newY = clickPoint.y - contentH;
    }

    newX = Math.max(0, Math.min(newX, parentW - contentW));
    newY = Math.max(0, Math.min(newY, parentH - contentH));

    childView.setBounds({
      x: Math.floor(newX),
      y: Math.floor(newY),
      width: contentW,
      height: contentH,
    });
    childView.webContents.focus();
    childManager.setVisible(true);
  }

  public hideContextMenu(focusParent: boolean = true) {
    classHolder.childWindowManager?.hide(focusParent);
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

    const childManager = classHolder.childWindowManager;
    if (!childManager || !childManager.isShowing()) return;

    const childView = childManager.getView();
    if (!childView || childView.webContents.isDestroyed()) return;
    const targetParent = childManager.getCurrentParentWindow();
    if (!targetParent || targetParent.isDestroyed()) return;

    const contentW = Math.max(20, Math.min(Math.ceil(width), 4096));
    const contentH = Math.max(20, Math.min(Math.ceil(height), 4096));

    const [parentW, parentH] = targetParent.getContentSize();
    const customContextPosition = childManager.getCustomPosition();
    const currentBounds = childView.getBounds();

    const clickPoint = customContextPosition
      ? {x: Math.floor(customContextPosition.x), y: Math.floor(customContextPosition.y)}
      : this.currentCursorPosition || {
          x: currentBounds.x,
          y: currentBounds.y,
        };

    let newX = clickPoint.x;
    let newY = clickPoint.y;

    if (newX + contentW > parentW) {
      newX = clickPoint.x - (customContextPosition ? Math.floor(contentW / 2) : contentW);
    }
    if (newY + contentH > parentH) {
      newY = clickPoint.y - contentH;
    }

    newX = Math.max(0, Math.min(newX, parentW - contentW));
    newY = Math.max(0, Math.min(newY, parentH - contentH));

    try {
      childView.setBounds({
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
