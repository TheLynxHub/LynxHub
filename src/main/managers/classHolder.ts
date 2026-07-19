import {clearInterval} from 'node:timers';

import {toMs} from '@lynx_common/utils';
import {applicationIpc} from '@lynx_main/ipc/application';
import ElectronAppManager from '@lynx_main/mainWindow';
import {PluginManager} from '@lynx_main/plugins';
import ExtensionManager from '@lynx_main/plugins/extensions';
import ModuleManager from '@lynx_main/plugins/modules';
import {ValidateCards} from '@lynx_main/plugins/modules/cardsValidator';
import StorageManager from '@lynx_main/storage/storageOperations';
import axios from 'axios';
import {app, BrowserWindow} from 'electron';

import BrowserDownloadManager from '../childWindows/browserDownloadManager';
import ContextMenuManager from '../childWindows/contextMenu';
import LinkPreviewManager from '../childWindows/linkPreview';
import ShareScreenManager from '../childWindows/shareScreen';
import BrowserManager from './browser';
import StaticsManager from './statics';
import TrayManager from './tray';

const ONLINE_CHECK_URL = 'https://google.com';
const ONLINE_CHECK_TIMEOUT = 4000;
const ONLINE_CHECK_INTERVAL = toMs(5, 'seconds');

/**
 * Singleton class to hold and manage instances of various managers and services.
 * Acts as a central dependency injection container for the application.
 */
class ClassHolder {
  private readonly _storageManager: StorageManager;

  private _moduleManager?: ModuleManager;
  private _extensionManager?: ExtensionManager;
  private _pluginManager?: PluginManager;

  private _staticManager?: StaticsManager;
  private _appManager?: ElectronAppManager;
  private _trayManager?: TrayManager;
  private _cardsValidator?: ValidateCards;
  private _contextMenuManager?: ContextMenuManager;
  private _linkPreviewManager?: LinkPreviewManager;
  private _browserDownloadManager?: BrowserDownloadManager;
  private _shareScreenManager?: ShareScreenManager;
  private _browserManager?: BrowserManager;

  private _toastWindow?: BrowserWindow;
  private _floatChatWindow?: BrowserWindow;

  private readonly _appStartTime: number;
  private _isOnline: boolean = true;
  private isOnlineInterval: NodeJS.Timeout | undefined = undefined;

  constructor() {
    this._storageManager = new StorageManager();
    this._appStartTime = Date.now();
    this.checkOnline();
  }

  /**
   * Periodically checks internet connectivity.
   * Updates the `isOnline` status and notifies the renderer process.
   */
  private async checkOnline() {
    const setResult = (isOnline: boolean) => {
      if (this._isOnline === isOnline) return;
      this.isOnline = isOnline;
      applicationIpc.send.onOnline(isOnline);
    };

    const checkStatus = () => {
      axios
        .request({url: ONLINE_CHECK_URL, timeout: ONLINE_CHECK_TIMEOUT})
        .then(response => {
          setResult(response.statusText.toLowerCase() === 'ok');
        })
        .catch(_ => {
          setResult(false);
        });
    };

    checkStatus();
    this.isOnlineInterval = setInterval(checkStatus, ONLINE_CHECK_INTERVAL);

    app.on('before-quit', () => {
      if (this.isOnlineInterval) {
        clearInterval(this.isOnlineInterval);
        this.isOnlineInterval = undefined;
      }
    });
  }

  /**
   * Initializes all manager instances.
   * Should be called during application startup.
   */
  public async initializeManagers() {
    this.moduleManager = new ModuleManager();

    this.extensionManager = new ExtensionManager();
    this.extensionManager.setStorageManager(this.storageManager);
    this.extensionManager.setModuleManager(this.moduleManager);

    this.pluginManager = new PluginManager(this.moduleManager, this.extensionManager);

    this.staticManager = new StaticsManager();
    this.appManager = new ElectronAppManager();
    this.extensionManager.setAppManager(this.appManager);
    this.trayManager = new TrayManager();
    this.cardsValidator = new ValidateCards();
    this.contextMenuManager = new ContextMenuManager();
    this.linkPreviewManager = new LinkPreviewManager();
  }

  /**
   * Checks if static requirements are met.
   */
  public async checkStaticsRequirements() {
    try {
      await this.staticManager?.checkRequirements();
    } catch (err) {
      console.warn('StaticsManager initialization failed:', (err as Error)?.message || err);
    }
  }

  /**
   * Waits for a specific manager class to be initialized.
   * @param className The name of the property to wait for.
   * @param options Timeout and interval options.
   * @returns The initialized manager instance.
   */
  public async waitForClass<K extends keyof this>(
    className: K,
    options: {timeout?: number; checkInterval?: number} = {},
  ): Promise<NonNullable<this[K]>> {
    const {timeout = 30000, checkInterval = 100} = options;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        const instance = this[className];

        if (instance !== undefined && instance !== null) {
          resolve(instance as NonNullable<this[K]>);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          reject(new Error(`Timeout waiting for ${String(className)} to be available`));
          return;
        }

        setTimeout(check, checkInterval);
      };

      check();
    });
  }

  // ----------------> Setters
  private set appManager(value: ClassHolder['_appManager']) {
    this._appManager = value;
  }
  private set trayManager(value: ClassHolder['_trayManager']) {
    this._trayManager = value;
  }
  private set cardsValidator(value: ClassHolder['_cardsValidator']) {
    this._cardsValidator = value;
  }
  private set contextMenuManager(value: ClassHolder['_contextMenuManager']) {
    this._contextMenuManager = value;
  }
  private set linkPreviewManager(value: ClassHolder['_linkPreviewManager']) {
    this._linkPreviewManager = value;
  }
  private set moduleManager(value: ClassHolder['_moduleManager']) {
    this._moduleManager = value;
  }
  private set extensionManager(value: ClassHolder['_extensionManager']) {
    this._extensionManager = value;
  }
  private set pluginManager(value: ClassHolder['_pluginManager']) {
    this._pluginManager = value;
  }
  private set staticManager(value: ClassHolder['_staticManager']) {
    this._staticManager = value;
  }
  private set isOnline(value: ClassHolder['_isOnline']) {
    this._isOnline = value;
  }
  set browserDownloadManager(value: ClassHolder['_browserDownloadManager']) {
    this._browserDownloadManager = value;
  }
  set shareScreenManager(value: ClassHolder['_shareScreenManager']) {
    this._shareScreenManager = value;
  }
  set toastWindow(value: ClassHolder['_toastWindow']) {
    this._toastWindow = value;
  }
  set floatChatWindow(value: ClassHolder['_floatChatWindow']) {
    this._floatChatWindow = value;
  }
  set browserManager(value: BrowserManager | undefined) {
    this._browserManager = value;
  }

  // ----------------> Getters
  get appStartTime(): number {
    return this._appStartTime;
  }
  get storageManager(): StorageManager {
    return this._storageManager;
  }
  get moduleManager() {
    return this._moduleManager;
  }
  get extensionManager() {
    return this._extensionManager;
  }
  get pluginManager() {
    return this._pluginManager;
  }
  get staticManager() {
    return this._staticManager;
  }
  get appManager() {
    return this._appManager;
  }
  get trayManager() {
    return this._trayManager;
  }
  get cardsValidator() {
    return this._cardsValidator;
  }
  get contextMenuManager() {
    return this._contextMenuManager;
  }
  get linkPreviewManager() {
    return this._linkPreviewManager;
  }
  get isOnline(): boolean {
    return this._isOnline;
  }
  get browserDownloadManager() {
    return this._browserDownloadManager;
  }
  get shareScreenManager() {
    return this._shareScreenManager;
  }
  get toastWindow() {
    return this._toastWindow;
  }
  get floatChatWindow() {
    return this._floatChatWindow;
  }
  get browserManager() {
    return this._browserManager;
  }
}

const classHolder = new ClassHolder();

export default classHolder;
