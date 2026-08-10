import classHolder from '@lynx_main/managers/classHolder';

import listenActions from './actions';
import listenApplication from './application';
import listenContextMenu from './contextMenu';
import listenFiles from './filesIpc';
import listenGit from './gitIpc';
import listenModules, {listenModuleApi} from './plugins/modules';
import listenPlugins from './plugins/plugins';
import listenPty from './pty';
import listenStatics from './statics';
import listenStorage, {listenStorageUtils} from './storage';
import listenUserImages from './userImages';
import listenUtils from './utils';

/**
 * Initializes managers that have IPC channels.
 */
async function listenManagers() {
  try {
    const [moduleManager, extensionManager, linkPreviewManager] = await Promise.all([
      classHolder.waitForClass('moduleManager'),
      classHolder.waitForClass('extensionManager'),
      classHolder.waitForClass('linkPreviewManager'),
    ]);

    moduleManager.listenForChannels();
    extensionManager.listenForChannels();
    linkPreviewManager.listenForChannels();
  } catch (err: any) {
    console.error('Failed to initialize managers for IPC channels:', err?.message || err);
  }
}

/**
 * Main entry point for initializing all IPC listeners.
 */
export async function listenToIpcChannels() {
  listenStorage();
  listenStorageUtils();
  listenActions();

  await listenApplication();
  listenFiles();
  listenUserImages();

  listenGit();
  listenUtils();
  listenPty();

  await listenModules();
  listenModuleApi();

  await listenManagers();

  await listenPlugins();
  await listenContextMenu();

  await listenStatics();
}
