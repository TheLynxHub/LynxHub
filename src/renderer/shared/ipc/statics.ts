import {staticsChannels} from '@lynx_common/consts/ipcChannels/statics';
import type {AppUpdateData, AppUpdateInsiderData, NotificationData, PatreonSupporter} from '@lynx_common/types';

import lynxIpc from './lynxIpc';

type OptionalList<T> = T[] | undefined;

const staticsIpc = {
  // Pulls latest static data from server
  pull: () => lynxIpc.invoke<void>(staticsChannels.pull),

  // Gets app release information
  getReleases: () => lynxIpc.invoke<AppUpdateData | undefined>(staticsChannels.getReleases),

  // Gets insider build information
  getInsider: () => lynxIpc.invoke<AppUpdateInsiderData | undefined>(staticsChannels.getInsider),

  // Gets notification data
  getNotification: () => lynxIpc.invoke<OptionalList<NotificationData>>(staticsChannels.getNotification),

  // Gets Patreon supporters list
  getPatrons: () => lynxIpc.invoke<OptionalList<PatreonSupporter>>(staticsChannels.getPatrons),
};

export default staticsIpc;
