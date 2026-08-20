import {bookmarkTooltipChannels} from '@lynx_common/consts/ipcChannels/bookmarkTooltip';

import lynxIpc from './lynxIpc';

export type BookmarkTooltipShowInput = {
  title: string;
  url: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

const bookmarkTooltipIpc = {
  show: (data: BookmarkTooltipShowInput) => lynxIpc.send(bookmarkTooltipChannels.showTooltip, data),
  hide: () => lynxIpc.send(bookmarkTooltipChannels.hideTooltip),

  send: {
    resizeTooltip: (width: number, height: number) =>
      lynxIpc.send(bookmarkTooltipChannels.resizeTooltip, width, height),
  },

  on: {
    tooltipData: (callback: (data: {title: string; url: string}) => void): (() => void) =>
      lynxIpc.on(bookmarkTooltipChannels.onTooltipData, callback),
  },
};

export default bookmarkTooltipIpc;
