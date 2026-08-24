import {screenShareChannels} from '@lynx_common/consts/ipcChannels/shareScreen';
import type {ScreenShareSources, ScreenShareStart} from '@lynx_common/types/shareScreen';

import lynxIpc from './lynxIpc';

const shareScreenIpc = {
  getScreenSources: () => lynxIpc.invoke<ScreenShareSources[]>(screenShareChannels.getScreenSources),
  getWindowSources: () => lynxIpc.invoke<ScreenShareSources[]>(screenShareChannels.getWindowSources),

  cancel: () => lynxIpc.send(screenShareChannels.cancel),
  startShare: (config: ScreenShareStart) => lynxIpc.send(screenShareChannels.startShare, config),

  onRequestSources: (callback: () => void) => lynxIpc.on(screenShareChannels.requestSources, callback),
};

export default shareScreenIpc;
