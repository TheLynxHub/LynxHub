import MainWindowManager from '@lynx_main/mainWindow';
import StorageManager from '@lynx_main/storageSqlite/storageOperations';
import * as pty from 'node-pty';

import ModuleManager from '../modules';
import {MainExtensionUtils} from './types';

/**
 * Utility class implementation for extensions.
 * Provides access to core managers and node-pty using SQLite storage.
 */
export default class ExtensionUtils implements MainExtensionUtils {
  public nodePty = pty;
  private readonly extensionName: string;

  private storageResolver!: (manager: StorageManager) => void;
  private appResolver!: (manager: MainWindowManager) => void;
  private moduleResolver!: (manager: ModuleManager) => void;

  private readonly storagePromise: Promise<StorageManager>;
  private readonly appPromise: Promise<MainWindowManager>;
  private readonly modulePromise: Promise<ModuleManager>;

  constructor(extensionName: string) {
    this.extensionName = extensionName;
    this.storagePromise = new Promise(resolve => {
      this.storageResolver = resolve;
    });
    this.appPromise = new Promise(resolve => {
      this.appResolver = resolve;
    });
    this.modulePromise = new Promise(resolve => {
      this.moduleResolver = resolve;
    });
  }

  public getStorageManager(): Promise<StorageManager> {
    return this.storagePromise;
  }

  public getAppManager(): Promise<MainWindowManager> {
    return this.appPromise;
  }

  public getModuleManager(): Promise<ModuleManager> {
    return this.modulePromise;
  }

  public setStorageManager(manager: StorageManager): void {
    if (this.storageResolver) {
      const extensionName = this.extensionName;

      // Create Proxy wrapper for storage manager targeting SQLite extension storage
      const extensionStorageManager = new Proxy(manager, {
        get(target, prop, receiver) {
          if (prop === 'getCustomData') {
            return (id: string) => {
              const val = target.getExtensionData(extensionName, id);
              if (val !== undefined) return val;
              return target.getCustomData(id);
            };
          }
          if (prop === 'setCustomData') {
            return (id: string, data: any) => {
              target.setExtensionData(extensionName, id, data);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      });

      this.storageResolver(extensionStorageManager as unknown as StorageManager);
    }
  }

  public setAppManager(manager: MainWindowManager): void {
    if (this.appResolver) {
      this.appResolver(manager);
    }
  }

  public setModuleManager(manager: ModuleManager): void {
    if (this.moduleResolver) {
      this.moduleResolver(manager);
    }
  }
}
