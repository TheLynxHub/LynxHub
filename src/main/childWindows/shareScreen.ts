import {ScreenShareSources, ScreenShareStart} from '@lynx_common/types/shareScreen';
import {isLinux, isWin} from '@lynx_common/utils';
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
  private mainWindow?: BrowserWindow;
  private availableSources: DesktopCapturerSource[] = [];
  private handlersRegistered = false;

  public start() {
    const {appManager} = classHolder;
    this.requestHandler = this.requestHandler.bind(this);

    session.fromPartition('persist:lynxhub_browser').setDisplayMediaRequestHandler(this.requestHandler);
    session.defaultSession.setDisplayMediaRequestHandler(this.requestHandler);

    this.registerSourceHandlers();

    const mainWindow = appManager?.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      this.mainWindow = mainWindow;
      mainWindow.on('close', () => this.cleanup());
    }
  }

  public sendMessage(channel: string, ...args: any[]): void {
    classHolder.childWindowManager?.sendMessage(channel, ...args);
  }

  private cleanup() {
    this.mainWindow = undefined;
    this.availableSources = [];
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
    classHolder.childWindowManager?.hide(true);
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

    classHolder.childWindowManager?.setEscapeHandler(cancelShare);

    offStartShare = shareScreenIpc.once.startShare((data: ScreenShareStart) => {
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

  private showSelector() {
    const mainWindow = this.mainWindow || classHolder.childWindowManager?.getCurrentParentWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const childManager = classHolder.childWindowManager;
    if (!childManager) return;
    const childView = childManager.ensureView(mainWindow);
    childManager.setActiveType('shareScreen');

    const [winW, winH] = mainWindow.getContentSize();
    const width = Math.min(620, winW);
    const height = Math.min(480, winH);
    const x = Math.floor((winW - width) / 2);
    const y = Math.floor((winH - height) / 2);

    childView.setBounds({x, y, width, height});
    childView.webContents.focus();
    childManager.setVisible(true);
    shareScreenIpc.send.requestSources();
  }

  get selectorView(): WebContentsView | undefined {
    return classHolder.childWindowManager?.getView();
  }

  public getWebContent(): WebContents | undefined {
    return classHolder.childWindowManager?.getWebContent();
  }
}
