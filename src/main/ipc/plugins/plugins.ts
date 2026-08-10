import {pluginChannels} from '@lynx_common/consts/ipcChannels/plugins';
import {SubscribeStages} from '@lynx_common/types';
import {MainHT} from '@lynx_common/types/ipc';
import {
  PluginAddresses,
  PluginInstalledItem,
  PluginItem,
  PluginSyncItem,
  UnloadedPlugins,
} from '@lynx_common/types/plugins';
import classHolder from '@lynx_main/managers/classHolder';
import {getList} from '@lynx_main/plugins/utils';
import AddBreadcrumb_Main from '@lynx_main/utils/breadcrumbs';

import lynxIpc from '../ipcWrapper';
import {sendToMain} from '../sender';

/**
 * Sets up IPC listeners for plugin management.
 */
export default async function listenPlugins() {
  const pluginManager = await classHolder.waitForClass('pluginManager');

  // Gets plugin server addresses
  pluginsIpc.handle.getAddresses(() => pluginManager.getAddresses());

  // Gets list of installed plugins
  pluginsIpc.handle.getInstalledList(() => pluginManager.getInstalledList());

  // Gets list of unloaded plugins
  pluginsIpc.handle.getUnloadedList(() => pluginManager.getUnloadedList());

  // Installs plugin from URL
  pluginsIpc.handle.install(async (url, targetVersion) => {
    AddBreadcrumb_Main(`Plugin Install Started: url:${url}`);
    try {
      const res = await pluginManager.install(url, targetVersion);
      AddBreadcrumb_Main(`Plugin Install Finished: url:${url}, success:${res}`);
      return res;
    } catch (err) {
      AddBreadcrumb_Main(`Plugin Install Error: url:${url}, error:${err}`);
      throw err;
    }
  });

  // Uninstalls plugin by ID
  pluginsIpc.handle.uninstall(async id => {
    AddBreadcrumb_Main(`Plugin Uninstall Started: id:${id}`);
    try {
      const res = await pluginManager.uninstall(id);
      AddBreadcrumb_Main(`Plugin Uninstall Finished: id:${id}, success:${res}`);
      return res;
    } catch (err) {
      AddBreadcrumb_Main(`Plugin Uninstall Error: id:${id}, error:${err}`);
      throw err;
    }
  });

  // Syncs plugin to specific version
  pluginsIpc.handle.sync(async (id, version) => {
    AddBreadcrumb_Main(`Plugin Sync Started: id:${id}, version:${version}`);
    try {
      const res = await pluginManager.syncItem(id, version);
      AddBreadcrumb_Main(`Plugin Sync Finished: id:${id}, success:${res}`);
      return res;
    } catch (err) {
      AddBreadcrumb_Main(`Plugin Sync Error: id:${id}, error:${err}`);
      throw err;
    }
  });

  // Syncs multiple plugins to their versions
  pluginsIpc.handle.syncAll(async items => {
    AddBreadcrumb_Main(`Plugins SyncAll Started: items:${JSON.stringify(items)}`);
    try {
      const res = await pluginManager.syncAll(items);
      AddBreadcrumb_Main(`Plugins SyncAll Finished: updatedItemsCount:${res.length}`);
      return res;
    } catch (err) {
      AddBreadcrumb_Main(`Plugins SyncAll Error: error:${err}`);
      throw err;
    }
  });

  // Checks for available sync updates based on subscription stage
  pluginsIpc.handle.checkForSync(stage => pluginManager.checkForSync(stage));

  // Gets list of available plugins for subscription stage
  pluginsIpc.handle.getList(stage => getList(stage));

  // Updates sync list entry for plugin
  pluginsIpc.handle.updateSyncList((id, version) => pluginManager.updateSyncItem(id, version));
}

/**
 * IPC interface for plugin operations.
 */
export const pluginsIpc = {
  send: {
    /** Sends an event when sync updates are available */
    onSyncAvailable: (cards: PluginSyncItem[]) => sendToMain(pluginChannels.onSyncAvailable, cards),
  },
  handle: {
    /** Gets list of available plugins from remote source */
    getList: (callback: (stage: SubscribeStages) => MainHT<PluginItem[]>) =>
      lynxIpc.handle(pluginChannels.getList, callback),
    /** Gets locally available plugin addresses */
    getAddresses: (callback: () => MainHT<PluginAddresses>) => lynxIpc.handle(pluginChannels.getAddresses, callback),
    /** Gets list of installed plugins */
    getInstalledList: (callback: () => MainHT<PluginInstalledItem[]>) =>
      lynxIpc.handle(pluginChannels.getInstalledList, callback),
    /** Gets list of unloaded plugins */
    getUnloadedList: (callback: () => MainHT<UnloadedPlugins[]>) =>
      lynxIpc.handle(pluginChannels.getUnloadedList, callback),
    /** Installs a plugin */
    install: (callback: (url: string, targetVersion?: string) => MainHT<boolean>) =>
      lynxIpc.handle(pluginChannels.install, callback),
    /** Uninstalls a plugin */
    uninstall: (callback: (id: string) => MainHT<boolean>) => lynxIpc.handle(pluginChannels.uninstall, callback),
    /** Syncs a single plugin to a version */
    sync: (callback: (id: string, version: string) => MainHT<boolean>) => lynxIpc.handle(pluginChannels.sync, callback),
    /** Syncs multiple plugins */
    syncAll: (callback: (items: {id: string; version: string; commit?: string}[]) => MainHT<string[]>) =>
      lynxIpc.handle(pluginChannels.syncAll, callback),
    /** Checks for updates */
    checkForSync: (callback: (stage: SubscribeStages) => MainHT<void>) =>
      lynxIpc.handle(pluginChannels.checkForSync, callback),
    /** Updates a specific item in the sync list */
    updateSyncList: (callback: (id: string, version: string) => MainHT<void>) =>
      lynxIpc.handle(pluginChannels.updateSyncList, callback),
  },
};
