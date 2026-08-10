import path from 'node:path';

import {is} from '@electron-toolkit/utils';
import {isLinux, isMac, isWin} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import lynxIpc from '@lynx_main/ipc/ipcWrapper';
import classHolder from '@lynx_main/managers/classHolder';
import RegisterHotkeys from '@lynx_main/managers/hotkeys';
import {getUserAgent, getWindowColor, RelaunchApp} from '@lynx_main/utils';
import {app, BrowserWindow, BrowserWindowConstructorOptions, shell, WebContents} from 'electron';

import icon from '../../../resources/icon.png?asset';

type Listener = () => void;

/**
 * Manages the main application window and its lifecycle events.
 * Handles window creation, configuration, and inter-process communication.
 */
export default class MainWindowManager {
  private onCreateWindowListeners: Listener[] = [];
  private onReadyToShowListeners: Listener[] = [];

  private mainWindow?: BrowserWindow;

  private static readonly MAIN_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    frame: false,
    show: false,
    width: 1068,
    height: 768,
    minWidth: 800,
    minHeight: 560,
    icon,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      sandbox: false, // Required for some Node.js APIs in renderer
    },
  };

  /**
   * Registers a listener to be called when the window is created.
   * @param callback The function to call.
   */
  public onCreateWindow(callback: Listener) {
    this.onCreateWindowListeners.push(callback);
  }

  /**
   * Registers a listener to be called when the window is ready to show.
   * @param callback The function to call.
   */
  public onReadyToShow(callback: Listener) {
    this.onReadyToShowListeners.push(callback);
  }

  /**
   * Retrieves the main BrowserWindow instance.
   * @returns The BrowserWindow instance or undefined if not created or destroyed.
   */
  public getMainWindow(): BrowserWindow | undefined {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      this.mainWindow = undefined;
      return undefined;
    }
    return this.mainWindow;
  }

  /**
   * Retrieves the WebContents of the main window.
   * @returns The WebContents instance or undefined.
   */
  public getWebContent(): WebContents | undefined {
    const window = this.getMainWindow();
    return window?.webContents;
  }

  /**
   * Sends a message to the renderer process via IPC.
   * @param channel The IPC channel to send to.
   * @param args The arguments to send.
   */
  public sendMessage(channel: string, ...args: any[]): void {
    const webContents = this.getWebContent();
    if (!webContents) {
      console.warn('Failed to send message: WebContents not available.');
      return;
    }

    lynxIpc.send(webContents, channel, ...args);
  }

  /** Creates and configures the main application window. */
  private createMainWindow(): void {
    const {contextMenuManager, linkPreviewManager} = classHolder;

    this.mainWindow = new BrowserWindow(MainWindowManager.MAIN_WINDOW_CONFIG);
    this.mainWindow.setBackgroundColor(getWindowColor());

    RegisterHotkeys(this.mainWindow.webContents);

    this.setupMainWindowEventListeners();
    this.loadAppropriateURL(this.mainWindow, 'index.html');

    // Notify listeners
    this.onCreateWindowListeners.forEach(listener => listener());

    // Initialize child windows that depend on the main window
    contextMenuManager?.createWindow(this.mainWindow);
    linkPreviewManager?.createWindow(this.mainWindow);
  }

  /** Sets up event listeners for the main window. */
  private setupMainWindowEventListeners(): void {
    const mainWindow = this.getMainWindow();
    const webContents = this.getWebContent();

    if (!mainWindow || !webContents) return;

    // Show window when ready to prevent flickering
    mainWindow.once('ready-to-show', () => {
      webContents.setUserAgent(getUserAgent());
      // Small delay to ensure smooth transition
      setTimeout(() => {
        this.onReadyToShowListeners.forEach(listener => listener());
      }, 2000);
    });

    // Handle external links and new tabs
    webContents.setWindowOpenHandler(({url, disposition}) => {
      const {storageManager} = classHolder;
      const openExternal = storageManager.getData('app').openLinkExternal;

      if (openExternal) {
        try {
          const parsedUrl = new URL(url);
          const safeProtocols = ['http:', 'https:', 'mailto:'];
          if (safeProtocols.includes(parsedUrl.protocol)) {
            shell.openExternal(url);
          } else {
            console.warn('Blocked opening unsafe URL:', url);
          }
        } catch (error) {
          console.warn('Blocked opening invalid URL:', url);
        }
      } else {
        // disposition 'background-tab' usually corresponds to middle-click
        const openInBackground = disposition === 'background-tab';
        applicationIpc.send.onNewTab(url, openInBackground);
      }
      return {action: 'deny'};
    });

    mainWindow.on('close', () => {
      this.mainWindow = undefined;
    });

    mainWindow.on('minimize', this.handleMinimize);
    mainWindow.on('focus', this.handleFocus);

    // IPC state updates for UI synchronization
    mainWindow.on('focus', () => applicationIpc.send.changeWinState({name: 'focus', value: true}));
    mainWindow.on('blur', () => applicationIpc.send.changeWinState({name: 'focus', value: false}));

    mainWindow.on('maximize', () => applicationIpc.send.changeWinState({name: 'maximize', value: true}));
    mainWindow.on('unmaximize', () => applicationIpc.send.changeWinState({name: 'maximize', value: false}));

    mainWindow.on('enter-full-screen', () => applicationIpc.send.changeWinState({name: 'fullscreen', value: true}));
    mainWindow.on('leave-full-screen', () => applicationIpc.send.changeWinState({name: 'fullscreen', value: false}));
  }

  /** Handles the minimized event for the main window. */
  private handleMinimize = (): void => {
    const {storageManager, trayManager} = classHolder;
    const taskbarStatus = storageManager.getData('app').taskbarStatus;

    if (taskbarStatus === 'tray-minimized') {
      trayManager?.createTrayIcon();

      const mainWindow = this.getMainWindow();
      if (!mainWindow) return;

      if (isLinux) {
        mainWindow.hide();
      } else if (isMac && app.dock?.isVisible()) {
        app.dock?.hide();
      } else {
        mainWindow.setSkipTaskbar(true);
      }
    }
  };

  /** Handles the focus event for the main window. */
  private handleFocus = (): void => {
    const {storageManager, trayManager} = classHolder;
    const taskbarStatus = storageManager.getData('app').taskbarStatus;

    if (taskbarStatus === 'tray-minimized') {
      trayManager?.destroyTrayIcon();

      const mainWindow = this.getMainWindow();
      if (!mainWindow) return;

      if (isWin) {
        mainWindow.setSkipTaskbar(false);
      } else if (isMac && !app.dock?.isVisible()) {
        app.dock?.show();
      }
    }
  };

  /**
   * Loads the appropriate URL based on the environment (dev/prod).
   * @param window - The BrowserWindow to load the URL into.
   * @param htmlFile - The HTML file name.
   */
  private loadAppropriateURL(window: BrowserWindow, htmlFile: string): void {
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${htmlFile}`);
    } else {
      window.loadFile(path.join(__dirname, `../renderer/${htmlFile}`));
    }
  }

  /** Restarts the application. */
  public restart(): void {
    RelaunchApp();
  }

  /** Initializes and starts the application window. */
  public startApp(): void {
    this.createMainWindow();
  }
}
