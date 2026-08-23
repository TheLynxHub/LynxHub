import {quickWebChannels} from '@lynx_common/consts/ipcChannels/quickWeb';
import type {CanGoType, QuickWebNavState} from '@lynx_common/types/ipc';
import type {QuickWebItem, QuickWebStorage} from '@lynx_common/types/storage';

import lynxIpc from './lynxIpc';

export const quickWebIpc = {
  send: {
    toggleWindow: () => lynxIpc.send(quickWebChannels.toggleWindow),
    showWindow: () => lynxIpc.send(quickWebChannels.showWindow),
    hideWindow: () => lynxIpc.send(quickWebChannels.hideWindow),
    minimizeWindow: () => lynxIpc.send(quickWebChannels.minimizeWindow),
    closeWindow: () => lynxIpc.send(quickWebChannels.closeWindow),
    setAlwaysOnTop: (alwaysOnTop: boolean) => lynxIpc.send(quickWebChannels.setAlwaysOnTop, alwaysOnTop),

    loadUrl: (url: string) => lynxIpc.send(quickWebChannels.loadUrl, url),
    selectItem: (itemId: string) => lynxIpc.send(quickWebChannels.selectItem, itemId),
    goBack: () => lynxIpc.send(quickWebChannels.goBack),
    goForward: () => lynxIpc.send(quickWebChannels.goForward),
    reload: () => lynxIpc.send(quickWebChannels.reload),
    stop: () => lynxIpc.send(quickWebChannels.stop),
    openInMainTab: (url?: string) => lynxIpc.send(quickWebChannels.openInMainTab, url),
    openExternal: (url?: string) => lynxIpc.send(quickWebChannels.openExternal, url),
    toggleDevTools: () => lynxIpc.send(quickWebChannels.toggleDevTools),

    updateConfig: (updates: Partial<QuickWebStorage>) => lynxIpc.send(quickWebChannels.updateConfig, updates),
    addItem: (item: Omit<QuickWebItem, 'id' | 'order'> & {id?: string}) => lynxIpc.send(quickWebChannels.addItem, item),
    updateItem: (id: string, updates: Partial<QuickWebItem>) => lynxIpc.send(quickWebChannels.updateItem, id, updates),
    removeItem: (id: string) => lynxIpc.send(quickWebChannels.removeItem, id),
    reorderItems: (items: QuickWebItem[]) => lynxIpc.send(quickWebChannels.reorderItems, items),
  },

  invoke: {
    getConfig: () => lynxIpc.invoke<QuickWebStorage>(quickWebChannels.getConfig),
    isWindowVisible: () => lynxIpc.invoke<boolean>(quickWebChannels.isWindowVisible),
  },

  on: {
    onStateChange: (callback: (state: QuickWebNavState) => void) =>
      lynxIpc.on(quickWebChannels.onStateChange, callback),
    onCanGo: (callback: (canGo: CanGoType) => void) => lynxIpc.on(quickWebChannels.onCanGo, callback),
    onLoading: (callback: (isLoading: boolean) => void) => lynxIpc.on(quickWebChannels.onLoading, callback),
    onTitleChange: (callback: (title: string) => void) => lynxIpc.on(quickWebChannels.onTitleChange, callback),
    onFavIconChange: (callback: (favIcon: string) => void) => lynxIpc.on(quickWebChannels.onFavIconChange, callback),
    onUrlChange: (callback: (url: string) => void) => lynxIpc.on(quickWebChannels.onUrlChange, callback),
    onConfigChange: (callback: (config: QuickWebStorage) => void) =>
      lynxIpc.on(quickWebChannels.onConfigChange, callback),
    onWindowVisibilityChange: (callback: (visible: boolean) => void) =>
      lynxIpc.on(quickWebChannels.onWindowVisibilityChange, callback),
    onPinnedChange: (callback: (isPinned: boolean) => void) => lynxIpc.on(quickWebChannels.onPinnedChange, callback),
  },
};

export default quickWebIpc;
