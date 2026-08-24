import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {ScreenShareSources} from '@lynx_common/types/shareScreen';
import {isLinux, isMac, isWin} from '@lynx_common/utils';
import {shareScreenIpc} from '@lynx_main/ipc/shareScreen';
import classHolder from '@lynx_main/managers/classHolder';
import {
  BrowserWindow,
  desktopCapturer,
  DesktopCapturerSource,
  DisplayMediaRequestHandlerHandlerRequest,
  session,
  Streams,
  WebContents,
  WebContentsView,
} from 'electron';

export default class ShareScreenManager {
  private _selectorWindow?: BrowserWindow;
  private _selectorView?: WebContentsView;
  private mainWindow?: BrowserWindow;
  private availableSources: DesktopCapturerSource[] = [];
  private handlersRegistered = false;

  public start() {
    const {appManager} = classHolder;
    this.requestHandler = this.requestHandler.bind(this);

    session.fromPartition('persist:lynxhub_browser').setDisplayMediaRequestHandler(this.requestHandler);
    session.defaultSession.setDisplayMediaRequestHandler(this.requestHandler);

    const mainWindow = appManager?.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.mainWindow = mainWindow;
      mainWindow.on('close', () => this.cleanup());
    }
  }

  private cleanup() {
    this.mainWindow = undefined;
    this.availableSources = [];
    if (this._selectorWindow && !this._selectorWindow.isDestroyed()) {
      this._selectorWindow.close();
    }
    if (this._selectorView && !this._selectorView.webContents.isDestroyed()) {
      try {
        (this._selectorView.webContents as any).close?.();
      } catch {
        // Ignored
      }
      this._selectorView = undefined;
    }
  }

  private requestHandler(_: DisplayMediaRequestHandlerHandlerRequest, callback: (streams: Streams) => void) {
    this.showSelector();
    this.startShare(callback);
    this.registerSourceHandlers();
  }

  private onDone() {
    this.availableSources = [];
    this.handlersRegistered = false;

    if (isLinux) {
      if (
        this._selectorView &&
        !this._selectorView.webContents.isDestroyed() &&
        this.mainWindow &&
        !this.mainWindow.isDestroyed()
      ) {
        try {
          this.mainWindow.contentView.removeChildView(this._selectorView);
        } catch {
          // Ignored
        }
        this._selectorView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
      }
      this._selectorView = undefined;
      shareScreenIpc.removeHandler.getScreenSources();
      shareScreenIpc.removeHandler.getWindowSources();
      return;
    }

    this._selectorWindow?.close();
    this._selectorWindow?.on('closed', () => {
      this._selectorWindow = undefined;
      shareScreenIpc.removeHandler.getScreenSources();
      shareScreenIpc.removeHandler.getWindowSources();
    });
  }

  /**
   * Manages the share initiation process.
   * Listens for start or cancel events from the renderer.
   */
  private startShare(callback: (streams: Streams) => void) {
    let offStartShare: (() => void) | undefined;
    let offCancel: (() => void) | undefined;

    const cleanupListeners = () => {
      if (offStartShare) offStartShare = undefined;
      if (offCancel) offCancel = undefined;
    };

    offStartShare = shareScreenIpc.once.startShare(data => {
      if (offCancel) offCancel();
      cleanupListeners();

      const target = this.availableSources.find(
        item => (data.type === 'windows' ? item.id : item.display_id) === data.id,
      );

      if (target) {
        const mainFrame = this.mainWindow?.webContents.mainFrame;
        const audio = mainFrame || (isWin && data.shareAudio ? 'loopback' : undefined);
        callback({video: target, audio});
      } else {
        try {
          callback({});
        } catch (e) {
          console.error('Error in share callback:', e);
        }
      }

      this.onDone();
    });

    offCancel = shareScreenIpc.once.cancel(() => {
      if (offStartShare) offStartShare();
      cleanupListeners();

      try {
        callback({});
      } catch (e) {
        console.error('Error in cancel callback:', e);
      }

      this.onDone();
    });
  }

  private registerSourceHandlers() {
    if (this.handlersRegistered) return;
    this.handlersRegistered = true;

    shareScreenIpc.handle.getScreenSources(() => this.fetchSources('screen'));
    shareScreenIpc.handle.getWindowSources(() => this.fetchSources('window'));
  }

  private fetchSources(type: 'screen' | 'window'): Promise<ScreenShareSources[]> {
    return new Promise((resolve, reject) => {
      desktopCapturer
        .getSources({types: [type], fetchWindowIcons: true, thumbnailSize: {width: 400, height: 300}})
        .then(sources => {
          this.availableSources.push(...sources);
          resolve(this.mapSources(sources));
        })
        .catch(reject);
    });
  }

  private mapSources(sources: DesktopCapturerSource[]): ScreenShareSources[] {
    return sources.map(source => ({
      displayId: source.display_id,
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail?.toDataURL(),
      icon: source.appIcon?.toDataURL(),
    }));
  }

  private showSelector() {
    if (isLinux) {
      if (this._selectorView && !this._selectorView.webContents.isDestroyed()) {
        try {
          (this._selectorView.webContents as any).close?.();
        } catch {
          // Ignored
        }
      }

      this._selectorView = new WebContentsView({
        webPreferences: {
          preload: path.join(__dirname, '../preload/index.cjs'),
          sandbox: false,
        },
      });
      this._selectorView.setBackgroundColor('#18181b');

      this.loadSelectorContent();

      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
      const [winW, winH] = this.mainWindow.getContentSize();
      const width = Math.min(620, winW);
      const height = Math.min(480, winH);
      const x = Math.floor((winW - width) / 2);
      const y = Math.floor((winH - height) / 2);

      try {
        this.mainWindow.contentView.removeChildView(this._selectorView);
      } catch {
        // Ignored
      }
      this.mainWindow.contentView.addChildView(this._selectorView);
      this._selectorView.setBounds({x, y, width, height});
      this._selectorView.webContents.focus();
      return;
    }

    this._selectorWindow = new BrowserWindow({
      frame: false,
      show: false,
      width: 620,
      height: 480,
      resizable: isWin,
      minWidth: isWin ? 620 : undefined,
      maxWidth: isWin ? 620 : undefined,
      minHeight: isWin ? 480 : undefined,
      maxHeight: isWin ? 480 : undefined,
      maximizable: false,
      minimizable: false,
      titleBarStyle: isMac ? 'customButtonsOnHover' : 'default',
      skipTaskbar: true,
      parent: this.mainWindow,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.cjs'),
        sandbox: false,
      },
    });

    this.positionSelectorWindow();

    this._selectorWindow.on('ready-to-show', () => {
      this._selectorWindow?.show();
    });

    this.loadSelectorContent();
  }

  private positionSelectorWindow() {
    if (!this.mainWindow || !this._selectorWindow) return;

    const mainBounds = this.mainWindow.getBounds();
    const width = 620;
    const height = 480;
    const x = mainBounds.x + (mainBounds.width - width) / 2;
    const y = mainBounds.y + 10;

    this._selectorWindow.setBounds({
      x: Math.floor(x),
      y: Math.floor(y),
      width,
      height,
    });
  }

  private loadSelectorContent() {
    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/shareScreen.html`
        : path.join(__dirname, `../renderer/shareScreen.html`);

    if (isLinux) {
      if (!this._selectorView || this._selectorView.webContents.isDestroyed()) return;
      if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        this._selectorView.webContents.loadURL(url);
      } else {
        this._selectorView.webContents.loadFile(url);
      }
      return;
    }

    if (!this._selectorWindow) return;

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this._selectorWindow.loadURL(url);
    } else {
      this._selectorWindow.loadFile(url);
    }
  }

  get selectorWindow(): BrowserWindow | undefined {
    return this._selectorWindow;
  }

  get selectorView(): WebContentsView | undefined {
    return this._selectorView;
  }

  public getWebContent(): WebContents | undefined {
    if (isLinux) {
      return this._selectorView && !this._selectorView.webContents.isDestroyed()
        ? this._selectorView.webContents
        : undefined;
    }
    return this._selectorWindow && !this._selectorWindow.webContents.isDestroyed()
      ? this._selectorWindow.webContents
      : undefined;
  }
}
