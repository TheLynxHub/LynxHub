import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {ScreenShareSources} from '@lynx_common/types/shareScreen';
import {isLinux, isWin} from '@lynx_common/utils';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
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
  private _selectorView?: WebContentsView;
  private mainWindow?: BrowserWindow;
  private availableSources: DesktopCapturerSource[] = [];
  private handlersRegistered = false;
  private activeCancel?: () => void;

  public start() {
    const {appManager} = classHolder;
    this.requestHandler = this.requestHandler.bind(this);

    session.fromPartition('persist:lynxhub_browser').setDisplayMediaRequestHandler(this.requestHandler);
    session.defaultSession.setDisplayMediaRequestHandler(this.requestHandler);

    this.registerSourceHandlers();

    const mainWindow = appManager?.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.mainWindow = mainWindow;
      if (!isLinux) {
        this.initSelectorView();
      }
      mainWindow.on('close', () => this.cleanup());
    }
  }

  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents || webContents.isDestroyed()) return;
    lynxIpc.send(webContents, channel, ...args);
  }

  private cleanup() {
    this.mainWindow = undefined;
    this.availableSources = [];
    this.activeCancel = undefined;
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
    if (isLinux) {
      desktopCapturer
        .getSources({types: ['screen', 'window']})
        .then(sources => {
          if (sources.length > 0) {
            callback({video: sources[0]});
          } else {
            callback({});
          }
        })
        .catch(err => {
          console.error('Error fetching screen sources on Linux:', err);
          callback({});
        });
      return;
    }

    this.showSelector();
    this.startShare(callback);
  }

  private onDone() {
    this.availableSources = [];
    this.activeCancel = undefined;

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
      this.activeCancel = undefined;
    };

    const cancelShare = () => {
      if (offStartShare) offStartShare();
      cleanupListeners();

      try {
        callback({});
      } catch (e) {
        console.error('Error in cancel callback:', e);
      }

      this.onDone();
    };

    this.activeCancel = cancelShare;

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

    offCancel = shareScreenIpc.once.cancel(cancelShare);
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

  private initSelectorView() {
    if (this._selectorView && !this._selectorView.webContents.isDestroyed()) {
      return;
    }

    this._selectorView = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.cjs'),
        sandbox: false,
        backgroundThrottling: false,
      },
    });
    this._selectorView.webContents.setBackgroundThrottling(false);
    this._selectorView.setBackgroundColor('#00000000');

    this._selectorView.webContents.on('before-input-event', (_, input) => {
      if (input.key.toLowerCase() === 'escape') {
        this.activeCancel?.();
      }
    });

    this.loadSelectorContent();

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      try {
        this.mainWindow.contentView.removeChildView(this._selectorView);
      } catch {
        // Ignored
      }
      this.mainWindow.contentView.addChildView(this._selectorView);
      this._selectorView.setBounds({x: -5000, y: -5000, width: 0, height: 0});
    }
  }

  private showSelector() {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (!this._selectorView || this._selectorView.webContents.isDestroyed()) {
      this.initSelectorView();
    }

    const [winW, winH] = this.mainWindow.getContentSize();
    const width = Math.min(620, winW);
    const height = Math.min(480, winH);
    const x = Math.floor((winW - width) / 2);
    const y = Math.floor((winH - height) / 2);

    try {
      this.mainWindow.contentView.removeChildView(this._selectorView!);
    } catch {
      // Ignored
    }
    this.mainWindow.contentView.addChildView(this._selectorView!);
    this._selectorView!.setBounds({x, y, width, height});
    this._selectorView!.webContents.focus();
    shareScreenIpc.send.requestSources();
  }

  private loadSelectorContent() {
    if (!this._selectorView || this._selectorView.webContents.isDestroyed()) return;

    const url =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? `${process.env['ELECTRON_RENDERER_URL']}/shareScreen.html`
        : path.join(__dirname, `../renderer/shareScreen.html`);

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this._selectorView.webContents.loadURL(url);
    } else {
      this._selectorView.webContents.loadFile(url);
    }
  }

  get selectorView(): WebContentsView | undefined {
    return this._selectorView;
  }

  public getWebContent(): WebContents | undefined {
    return this._selectorView && !this._selectorView.webContents.isDestroyed()
      ? this._selectorView.webContents
      : undefined;
  }
}
