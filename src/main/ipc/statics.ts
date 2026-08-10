import {staticsChannels} from '@lynx_common/consts/ipcChannels/statics';
import {AppUpdateData, AppUpdateInsiderData, NotificationData, PatreonSupporter} from '@lynx_common/types';
import {MainHT} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';

/**
 * Initializes listeners for static data events.
 */
export default async function listenStatics() {
  const staticManager = await classHolder.waitForClass('staticManager');

  // Pulls latest static data from server
  staticsIpc.handle.pull(() => staticManager.pull());

  // Gets app release information
  staticsIpc.handle.getReleases(() => staticManager.getReleases());

  // Gets insider build information
  staticsIpc.handle.getInsider(() => staticManager.getInsider());

  // Gets notification data
  staticsIpc.handle.getNotification(() => staticManager.getNotification());

  // Gets Patreon supporters list
  staticsIpc.handle.getPatrons(() => staticManager.getPatrons());
}

/**
 * IPC interface for static data operations.
 */
export const staticsIpc = {
  handle: {
    /** Handles pull request */
    pull: (callback: () => MainHT<void>) => lynxIpc.handle(staticsChannels.pull, callback),
    /** Handles get releases request */
    getReleases: (callback: () => MainHT<AppUpdateData | undefined>) =>
      lynxIpc.handle(staticsChannels.getReleases, callback),
    /** Handles get insider info request */
    getInsider: (callback: () => MainHT<AppUpdateInsiderData | undefined>) =>
      lynxIpc.handle(staticsChannels.getInsider, callback),
    /** Handles get notification request */
    getNotification: (callback: () => MainHT<NotificationData[] | undefined>) =>
      lynxIpc.handle(staticsChannels.getNotification, callback),
    /** Handles get patrons request */
    getPatrons: (callback: () => MainHT<PatreonSupporter[] | undefined>) =>
      lynxIpc.handle(staticsChannels.getPatrons, callback),
  },
};
