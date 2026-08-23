import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {ElementResizeData} from '@lynx_common/types';
import {isLinux, isMac, isWin} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import {contextMenuIpc} from '@lynx_main/ipc/contextMenu';
import {dialogBlurred} from '@lynx_main/ipc/dialogsWindow';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import {downloadImageToClipboard} from '@lynx_main/ipc/methods/windowUtils';
import classHolder from '@lynx_main/managers/classHolder';
import {BrowserWindow, BrowserWindowConstructorOptions, clipboard, Menu, screen, shell, WebContents} from 'electron';

export default class ContextMenuManager {
  private contextMenuWindow?: BrowserWindow;
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
    if (this.contextMenuWindow && !this.contextMenuWindow.isDestroyed()) {
      this.contextMenuWindow.close();
    }

    this.contextMenuWindow = new BrowserWindow({...ContextMenuManager.CONTEXT_WINDOW_CONFIG, parent: mainWindow});
    this.mainWindow = mainWindow;
    this.currentParentWindow = mainWindow;

    mainWindow.on('focus', () => {
      this.setCurrentParentWindow(this.mainWindow);
    });

    this.setupWindowListeners();
    this.loadWindowContent();
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
    if (!this.contextMenuWindow) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.contextMenuWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/contextMenu.html`);
    } else {
      this.contextMenuWindow.loadFile(path.join(__dirname, `../renderer/contextMenu.html`));
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
    if (this.contextMenuWindow && !this.contextMenuWindow.isDestroyed()) {
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
        const template: Electron.MenuItemConstructorOptions[] = [];

        // 1. Navigation
        const navHistory = {
          canGoBack: contents.navigationHistory.canGoBack(),
          canGoForward: contents.navigationHistory.canGoForward(),
        };
        template.push({
          label: 'Back',
          enabled: navHistory.canGoBack,
          click: () => contents.navigationHistory.goBack(),
        });
        template.push({
          label: 'Forward',
          enabled: navHistory.canGoForward,
          click: () => contents.navigationHistory.goForward(),
        });
        template.push({
          label: 'Reload',
          click: () => contents.reload(),
        });
        template.push({type: 'separator'});

        // 2. Suggestions
        if (params.dictionarySuggestions && params.dictionarySuggestions.length > 0) {
          params.dictionarySuggestions.forEach(suggestion => {
            template.push({
              label: suggestion,
              click: () => contents.replaceMisspelling(suggestion),
            });
          });
          template.push({type: 'separator'});
        }

        // 3. Link items
        if (params.linkURL) {
          template.push({
            label: 'Open Link in New Tab',
            click: () => {
              applicationIpc.send.onNewTab(params.linkURL);
            },
          });
          template.push({
            label: 'Open Link in Default Browser',
            click: () => {
              shell.openExternal(params.linkURL);
            },
          });
          template.push({
            label: 'Copy Link Address',
            click: () => {
              clipboard.writeText(params.linkURL);
            },
          });
          template.push({type: 'separator'});
        }

        // 4. Image items
        if (params.mediaType === 'image' && params.srcURL) {
          template.push({
            label: 'Open Image in New Tab',
            click: () => {
              applicationIpc.send.onNewTab(params.srcURL);
            },
          });
          template.push({
            label: 'Copy Image',
            click: () => {
              downloadImageToClipboard(params.srcURL);
            },
          });
          template.push({
            label: 'Save Image',
            click: () => {
              contents.downloadURL(params.srcURL);
            },
          });
          template.push({
            label: 'Copy Image Address',
            click: () => {
              clipboard.writeText(params.srcURL);
            },
          });
          template.push({
            label: 'Search Web for Image',
            click: () => {
              applicationIpc.send.onNewTab(
                `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(params.srcURL)}`,
              );
            },
          });
          template.push({type: 'separator'});
        }

        // 5. Selection text
        if (params.selectionText) {
          template.push({
            label: 'Search with Google',
            click: () => {
              const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(params.selectionText)}`;
              applicationIpc.send.onNewTab(searchUrl);
            },
          });
          template.push({type: 'separator'});
        }

        // 6. Edit operations
        if (params.editFlags) {
          const {canUndo, canRedo, canCut, canCopy, canPaste, canSelectAll} = params.editFlags;
          let hasEdit = false;
          if (canUndo) {
            template.push({
              label: 'Undo',
              click: () => contents.undo(),
            });
            hasEdit = true;
          }
          if (canRedo) {
            template.push({
              label: 'Redo',
              click: () => contents.redo(),
            });
            hasEdit = true;
          }
          if (canCut && params.selectionText) {
            template.push({
              label: 'Cut',
              click: () => contents.cut(),
            });
            hasEdit = true;
          }
          if (canCopy && params.selectionText) {
            template.push({
              label: 'Copy',
              click: () => contents.copy(),
            });
            hasEdit = true;
          }
          if (canPaste) {
            template.push({
              label: 'Paste',
              click: () => contents.paste(),
            });
            hasEdit = true;
          }
          if (canSelectAll) {
            template.push({
              label: 'Select All',
              click: () => contents.selectAll(),
            });
            hasEdit = true;
          }
          if (hasEdit) {
            template.push({type: 'separator'});
          }
        }

        // 7. Inspect Element
        template.push({
          label: 'Inspect Element',
          click: () => {
            contents.inspectElement(params.x, params.y);
          },
        });

        const targetWindow = BrowserWindow.fromWebContents(contents) || this.mainWindow;
        const menu = Menu.buildFromTemplate(template);
        menu.popup({window: targetWindow});
        return;
      }

      if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

      const targetWindow = BrowserWindow.fromWebContents(contents) || this.mainWindow;
      this.setCurrentParentWindow(targetWindow);
      this.setCustomContextPosition(undefined);
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

  public getWebContent(): WebContents | undefined {
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
    if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

    if (parentWindow !== undefined) {
      this.setCurrentParentWindow(parentWindow);
    } else if (!this.currentParentWindow || this.currentParentWindow.isDestroyed()) {
      this.setCurrentParentWindow(this.mainWindow);
    }

    // Capture the exact cursor position at the time of the click
    // so that if the user moves the mouse before the renderer replies,
    // the menu doesn't open at the wrong location.
    this.currentCursorPosition = screen.getCursorScreenPoint();

    // We must show the window (with opacity 0) so that Chromium runs the rendering pipeline.
    // If the window is completely hidden, requestAnimationFrame and ResizeObserver will not fire.
    this.contextMenuWindow.setOpacity(0);

    // Set a large initial size so the renderer can measure without scrollbars wrapping text
    this.contextMenuWindow.setBounds({width: 2000, height: 2000});

    this.contextMenuWindow.show();

    // Send request to renderer to calculate size and get back to us
    contextMenuIpc.send.requestShow();
  }

  /**
   * Called by the renderer when it is ready to show, with its final calculated size.
   */
  public applySizeAndShow(data: ElementResizeData) {
    if (!this.contextMenuWindow || this.contextMenuWindow.isDestroyed()) return;

    this.resizeContextMenu(data);
    this.positionContextMenuAtCursor();

    // Now that it's sized and positioned correctly, make it instantly visible
    this.contextMenuWindow.setOpacity(1);
  }

  public hideContextMenu(focusParent: boolean = true) {
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
   * Ensures the window stays within safe bounds (20x20 to 4096x4096).
   */
  public resizeContextMenu(data: ElementResizeData) {
    const window = this.contextMenuWindow;
    if (!window || window.isDestroyed()) return;

    if (!data || typeof data !== 'object') return;

    const {width, height, dpr} = data;
    const isValid = (val: any) => typeof val === 'number' && Number.isFinite(val) && val > 0;

    if (!isValid(width) || !isValid(height)) return;

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
