import {floatChatChannels} from '@lynx_common/consts/ipcChannels/floatChat';

import lynxIpc from './lynxIpc';

const floatChatIpc = {
  toggleFloatChatWindow: () => lynxIpc.send(floatChatChannels.toggleFloatChatWindow),
  closeFloatChat: () => lynxIpc.send(floatChatChannels.closeFloatChat),
  setOnlineCards: (cards: any[]) => lynxIpc.send(floatChatChannels.setOnlineCards, cards),
  getOnlineCards: () => lynxIpc.invoke<any[]>(floatChatChannels.getOnlineCards),
  syncState: (state: any) => lynxIpc.send(floatChatChannels.syncState, state),
  getCachedState: () => lynxIpc.invoke<any>(floatChatChannels.syncState),
  onSyncState: (callback: (state: any) => void) => lynxIpc.on(floatChatChannels.syncState, callback),
  onSetOnlineCards: (callback: (cards: any[]) => void) => lynxIpc.on(floatChatChannels.setOnlineCards, callback),
  sendMessage: (cardId: string, text: string) => lynxIpc.send(floatChatChannels.sendMessage, cardId, text),
  selectThread: (cardId: string, index: number) => lynxIpc.send(floatChatChannels.selectThread, cardId, index),
  newChat: (cardId: string) => lynxIpc.send(floatChatChannels.newChat, cardId),
  openLogin: (cardId: string) => lynxIpc.send(floatChatChannels.openLogin, cardId),
  setActiveCard: (cardId: string) => lynxIpc.send(floatChatChannels.setActiveCard, cardId),
  onSendMessage: (callback: (cardId: string, text: string) => void) =>
    lynxIpc.on(floatChatChannels.sendMessage, callback),
  onSelectThread: (callback: (cardId: string, index: number) => void) =>
    lynxIpc.on(floatChatChannels.selectThread, callback),
  onNewChat: (callback: (cardId: string) => void) => lynxIpc.on(floatChatChannels.newChat, callback),
  onOpenLogin: (callback: (cardId: string) => void) => lynxIpc.on(floatChatChannels.openLogin, callback),
  onSetActiveCard: (callback: (cardId: string) => void) => lynxIpc.on(floatChatChannels.setActiveCard, callback),
  onWindowShown: (callback: () => void) => lynxIpc.on('floatChat:window-shown', callback),
};

export default floatChatIpc;
