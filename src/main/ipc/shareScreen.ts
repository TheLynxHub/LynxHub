import {screenShareChannels} from '@lynx_common/consts/ipcChannels/shareScreen';
import {MainHT} from '@lynx_common/types/ipc';
import {ScreenShareSources, ScreenShareStart} from '@lynx_common/types/shareScreen';

import lynxIpc from './ipcWrapper';
import {sendToShareScreen} from './sender';

/**
 * IPC interface for screen sharing operations.
 */
export const shareScreenIpc = {
  send: {
    /** Requests renderer to refresh sources */
    requestSources: () => sendToShareScreen(screenShareChannels.requestSources),
  },
  once: {
    /** Listens for start share request once */
    startShare: (callback: (data: ScreenShareStart) => void) => lynxIpc.once(screenShareChannels.startShare, callback),
    /** Listens for cancel share request once */
    cancel: (callback: () => void) => lynxIpc.once(screenShareChannels.cancel, callback),
  },
  handle: {
    /** Handles get screen sources request */
    getScreenSources: (callback: () => MainHT<ScreenShareSources[]>) =>
      lynxIpc.handle(screenShareChannels.getScreenSources, callback),
    /** Handles get window sources request */
    getWindowSources: (callback: () => MainHT<ScreenShareSources[]>) =>
      lynxIpc.handle(screenShareChannels.getWindowSources, callback),
  },
  removeHandler: {
    /** Removes get screen sources handler */
    getScreenSources: () => lynxIpc.removeHandler(screenShareChannels.getScreenSources),
    /** Removes get window sources handler */
    getWindowSources: () => lynxIpc.removeHandler(screenShareChannels.getWindowSources),
  },
};
