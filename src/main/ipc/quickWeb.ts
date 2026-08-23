import {quickWebChannels} from '@lynx_common/consts/ipcChannels/quickWeb';
import type {CanGoType, MainHT, QuickWebNavState} from '@lynx_common/types/ipc';
import type {QuickWebItem, QuickWebStorage} from '@lynx_common/types/storage';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';
import {sendToMain, sendToQuickWeb} from './sender';

export default function listenQuickWeb() {
  quickWebMainIpc.on.toggleWindow(() => {
    classHolder.quickWindowManager?.toggleWindow();
  });

  quickWebMainIpc.on.showWindow(() => {
    classHolder.quickWindowManager?.showWindow();
  });

  quickWebMainIpc.on.hideWindow(() => {
    classHolder.quickWindowManager?.hideWindow();
  });

  quickWebMainIpc.on.minimizeWindow(() => {
    classHolder.quickWindowManager?.minimizeWindow();
  });

  quickWebMainIpc.on.closeWindow(() => {
    classHolder.quickWindowManager?.closeWindow();
  });

  quickWebMainIpc.on.setAlwaysOnTop(alwaysOnTop => {
    classHolder.quickWindowManager?.setAlwaysOnTop(alwaysOnTop);
  });

  quickWebMainIpc.on.loadUrl(url => {
    classHolder.quickWindowManager?.loadUrl(url);
  });

  quickWebMainIpc.on.selectItem(itemId => {
    classHolder.quickWindowManager?.selectItem(itemId);
  });

  quickWebMainIpc.on.goBack(() => {
    classHolder.quickWindowManager?.goBack();
  });

  quickWebMainIpc.on.goForward(() => {
    classHolder.quickWindowManager?.goForward();
  });

  quickWebMainIpc.on.reload(() => {
    classHolder.quickWindowManager?.reload();
  });

  quickWebMainIpc.on.stop(() => {
    classHolder.quickWindowManager?.stop();
  });

  quickWebMainIpc.on.openInMainTab(url => {
    classHolder.quickWindowManager?.openInMainTab(url);
  });

  quickWebMainIpc.on.openExternal(url => {
    classHolder.quickWindowManager?.openExternal(url);
  });

  quickWebMainIpc.on.toggleDevTools(() => {
    classHolder.quickWindowManager?.toggleDevTools();
  });

  quickWebMainIpc.on.updateConfig(updates => {
    classHolder.quickWindowManager?.updateConfig(updates);
  });

  quickWebMainIpc.on.addItem(item => {
    classHolder.quickWindowManager?.addItem(item);
  });

  quickWebMainIpc.on.updateItem((id, updates) => {
    classHolder.quickWindowManager?.updateItem(id, updates);
  });

  quickWebMainIpc.on.removeItem(id => {
    classHolder.quickWindowManager?.removeItem(id);
  });

  quickWebMainIpc.on.reorderItems(items => {
    classHolder.quickWindowManager?.reorderItems(items);
  });

  quickWebMainIpc.handle.getConfig(() => {
    return classHolder.quickWindowManager?.getConfig() ?? classHolder.storageManager.getData('quickWeb');
  });

  quickWebMainIpc.handle.isWindowVisible(() => {
    return classHolder.quickWindowManager?.isWindowVisible() ?? false;
  });
}

export const quickWebMainIpc = {
  send: {
    onStateChange: (state: QuickWebNavState) => {
      sendToQuickWeb(quickWebChannels.onStateChange, state);
      sendToMain(quickWebChannels.onStateChange, state);
    },
    onCanGo: (canGo: CanGoType) => {
      sendToQuickWeb(quickWebChannels.onCanGo, canGo);
    },
    onLoading: (isLoading: boolean) => {
      sendToQuickWeb(quickWebChannels.onLoading, isLoading);
    },
    onTitleChange: (title: string) => {
      sendToQuickWeb(quickWebChannels.onTitleChange, title);
    },
    onFavIconChange: (favIcon: string) => {
      sendToQuickWeb(quickWebChannels.onFavIconChange, favIcon);
    },
    onUrlChange: (url: string) => {
      sendToQuickWeb(quickWebChannels.onUrlChange, url);
    },
    onConfigChange: (config: QuickWebStorage) => {
      sendToQuickWeb(quickWebChannels.onConfigChange, config);
      sendToMain(quickWebChannels.onConfigChange, config);
    },
    onWindowVisibilityChange: (visible: boolean) => {
      sendToQuickWeb(quickWebChannels.onWindowVisibilityChange, visible);
      sendToMain(quickWebChannels.onWindowVisibilityChange, visible);
    },
    onPinnedChange: (isPinned: boolean) => {
      sendToQuickWeb(quickWebChannels.onPinnedChange, isPinned);
    },
  },

  on: {
    toggleWindow: (callback: () => void) => lynxIpc.on(quickWebChannels.toggleWindow, callback),
    showWindow: (callback: () => void) => lynxIpc.on(quickWebChannels.showWindow, callback),
    hideWindow: (callback: () => void) => lynxIpc.on(quickWebChannels.hideWindow, callback),
    minimizeWindow: (callback: () => void) => lynxIpc.on(quickWebChannels.minimizeWindow, callback),
    closeWindow: (callback: () => void) => lynxIpc.on(quickWebChannels.closeWindow, callback),
    setAlwaysOnTop: (callback: (alwaysOnTop: boolean) => void) => lynxIpc.on(quickWebChannels.setAlwaysOnTop, callback),

    loadUrl: (callback: (url: string) => void) => lynxIpc.on(quickWebChannels.loadUrl, callback),
    selectItem: (callback: (itemId: string) => void) => lynxIpc.on(quickWebChannels.selectItem, callback),
    goBack: (callback: () => void) => lynxIpc.on(quickWebChannels.goBack, callback),
    goForward: (callback: () => void) => lynxIpc.on(quickWebChannels.goForward, callback),
    reload: (callback: () => void) => lynxIpc.on(quickWebChannels.reload, callback),
    stop: (callback: () => void) => lynxIpc.on(quickWebChannels.stop, callback),
    openInMainTab: (callback: (url?: string) => void) => lynxIpc.on(quickWebChannels.openInMainTab, callback),
    openExternal: (callback: (url?: string) => void) => lynxIpc.on(quickWebChannels.openExternal, callback),
    toggleDevTools: (callback: () => void) => lynxIpc.on(quickWebChannels.toggleDevTools, callback),

    updateConfig: (callback: (updates: Partial<QuickWebStorage>) => void) =>
      lynxIpc.on(quickWebChannels.updateConfig, callback),
    addItem: (callback: (item: Omit<QuickWebItem, 'id' | 'order'> & {id?: string}) => void) =>
      lynxIpc.on(quickWebChannels.addItem, callback),
    updateItem: (callback: (id: string, updates: Partial<QuickWebItem>) => void) =>
      lynxIpc.on(quickWebChannels.updateItem, callback),
    removeItem: (callback: (id: string) => void) => lynxIpc.on(quickWebChannels.removeItem, callback),
    reorderItems: (callback: (items: QuickWebItem[]) => void) => lynxIpc.on(quickWebChannels.reorderItems, callback),
  },

  handle: {
    getConfig: (callback: () => MainHT<QuickWebStorage>) => lynxIpc.handle(quickWebChannels.getConfig, callback),
    isWindowVisible: (callback: () => MainHT<boolean>) => lynxIpc.handle(quickWebChannels.isWindowVisible, callback),
  },
};
