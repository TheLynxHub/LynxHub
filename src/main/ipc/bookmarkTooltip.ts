import {bookmarkTooltipChannels} from '@lynx_common/consts/ipcChannels/bookmarkTooltip';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';
import {sendToBookmarkTooltip} from './sender';

export async function listenBookmarkTooltip() {
  const tooltipManager = await classHolder.waitForClass('bookmarkTooltipManager');

  bookmarkTooltipIpc.on.showTooltip(data => tooltipManager.show(data));
  bookmarkTooltipIpc.on.hideTooltip(() => tooltipManager.hide());
  bookmarkTooltipIpc.on.resizeTooltip((width, height) => tooltipManager.resizeWindow(width, height));
}

export const bookmarkTooltipIpc = {
  send: {
    onData: (data: {title: string; url: string}) => sendToBookmarkTooltip(bookmarkTooltipChannels.onTooltipData, data),
  },
  on: {
    showTooltip: (
      callback: (data: {title: string; url: string; x: number; y: number; width?: number; height?: number}) => void,
    ) => lynxIpc.on(bookmarkTooltipChannels.showTooltip, callback),
    hideTooltip: (callback: () => void) => lynxIpc.on(bookmarkTooltipChannels.hideTooltip, callback),
    resizeTooltip: (callback: (width: number, height: number) => void) =>
      lynxIpc.on(bookmarkTooltipChannels.resizeTooltip, callback),
  },
};
