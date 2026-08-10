import {ExtensionIpcEventsApi, MainIpcHookMethod} from '@lynx_common/types/ipcEvents';
import MainWindowManager from '@lynx_main/mainWindow';
import StorageManager from '@lynx_main/storageSqlite/storageOperations';
import {Scope} from '@sentry/node';
import {MenuItem, MenuItemConstructorOptions} from 'electron';
import * as pty from 'node-pty';

import ModuleManager from '../modules';
import {MainIpcApi} from './ipcWrapper';

/**
 * Union type for Electron menu items.
 */
export type ElectronMenuItem = MenuItemConstructorOptions | MenuItem;

/**
 * Callback type for synchronous void functions.
 */
export type SyncVoidCallback = () => void;

/**
 * Callback type for asynchronous void functions.
 */
export type AsyncVoidCallback = () => Promise<void>;

/**
 * Callback type for functions that return a tray item and its index.
 */
export type TrayItemCallback = () => {item: ElectronMenuItem; index: number};

/**
 * Function type to register a synchronous callback.
 */
export type RegisterSyncCallback = (callback: SyncVoidCallback) => void;

/**
 * Function type to register an asynchronous callback.
 */
export type RegisterAsyncCallback = (callback: AsyncVoidCallback) => void;

/**
 * Function type to register a tray item callback.
 */
export type RegisterTrayItemCallback = (callback: TrayItemCallback) => void;

/**
 * Structure for storing registered extension callbacks.
 */
export type ExtensionCallbacks = {
  listenForChannels: SyncVoidCallback[];
  onAppReady: AsyncVoidCallback[];
  onReadyToShow: SyncVoidCallback[];
  trayMenu_AddItem: TrayItemCallback[];
};

/**
 * The public API exposed to extensions in the main process.
 */
export type ExtensionMainApi = {
  /**
   * Registers a callback to listen for specific IPC channels.
   * This allows communication between the main process and renderer processes.
   * @param callback - The function to execute.
   */
  listenForChannels: RegisterSyncCallback;

  /**
   * Registers a callback to be executed when the application is ready.
   * This corresponds to `app.whenReady()`.
   * @param callback - The async function to execute.
   */
  onAppReady: RegisterAsyncCallback;

  /**
   * Registers a callback to be executed when the main window is ready to show.
   * This corresponds to the `ready-to-show` event.
   * @param callback - The function to execute.
   */
  onReadyToShow: RegisterSyncCallback;

  /**
   * Listen to main-process IPC lifecycle hooks (before/after).
   * Includes `send`, `on`, `once`, and `handle` method events.
   */
  ipcEvents: ExtensionIpcEventsApi<MainIpcHookMethod>;

  /**
   * Initializes Sentry for the extension node process.
   * @param dsn - The Sentry DSN.
   */
  initNodeSentry: (dsn: string) => Scope;

  /**
   * Registers a callback to add an item to the tray menu.
   * @param callback - The function that returns the menu item and its index.
   */
  trayMenu_AddItem: RegisterTrayItemCallback;
};

/**
 * Utility functions exposed to extensions in the main process.
 */
export type MainExtensionUtils = {
  /**
   * Retrieves the `StorageManager` instance.
   * @returns A promise that resolves to the `StorageManager`.
   */
  getStorageManager: () => Promise<StorageManager>;

  /**
   * Retrieves the `MainWindowManager` instance.
   * @returns A promise that resolves to the `MainWindowManager`.
   */
  getAppManager: () => Promise<MainWindowManager>;

  /**
   * Retrieves the `ModuleManager` instance.
   * @returns A promise that resolves to the `ModuleManager`.
   */
  getModuleManager: () => Promise<ModuleManager>;

  /**
   * Access to `node-pty` for terminal operations.
   */
  nodePty: typeof pty;
};

/**
 * Interface for the main entry point of an extension.
 */
export type ExtensionImport_Main = {
  /**
   * Initializes the extension.
   * @param lynxApi - The API provided by LynxHub.
   * @param utils - Utility functions provided by LynxHub.
   */
  initialExtension: (lynxApi: ExtensionMainApi, utils: MainExtensionUtils, mainIpc: MainIpcApi) => Promise<void>;
};
