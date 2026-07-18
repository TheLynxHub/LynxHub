import {spotlightChatChannels} from '@lynx_common/consts/ipcChannels/spotlightChat';

import lynxIpc from './lynxIpc';

const spotlightChatIpc = {
  toggleSpotlightWindow: () => lynxIpc.send(spotlightChatChannels.toggleSpotlightWindow),
  closeSpotlight: () => lynxIpc.send(spotlightChatChannels.closeSpotlight),
  setOnlineCards: (cards: any[]) => lynxIpc.send(spotlightChatChannels.setOnlineCards, cards),
  getOnlineCards: () => lynxIpc.invoke<any[]>(spotlightChatChannels.getOnlineCards),
  syncState: (state: any) => lynxIpc.send(spotlightChatChannels.syncState, state),
  getCachedState: () => lynxIpc.invoke<any>(spotlightChatChannels.syncState),
  onSyncState: (callback: (state: any) => void) => lynxIpc.on(spotlightChatChannels.syncState, callback),
  onSetOnlineCards: (callback: (cards: any[]) => void) => lynxIpc.on(spotlightChatChannels.setOnlineCards, callback),
  sendMessage: (cardId: string, text: string) => lynxIpc.send(spotlightChatChannels.sendMessage, cardId, text),
  selectThread: (cardId: string, index: number) => lynxIpc.send(spotlightChatChannels.selectThread, cardId, index),
  newChat: (cardId: string) => lynxIpc.send(spotlightChatChannels.newChat, cardId),
  openLogin: (cardId: string) => lynxIpc.send(spotlightChatChannels.openLogin, cardId),
  setActiveCard: (cardId: string) => lynxIpc.send(spotlightChatChannels.setActiveCard, cardId),
  onSendMessage: (callback: (cardId: string, text: string) => void) =>
    lynxIpc.on(spotlightChatChannels.sendMessage, callback),
  onSelectThread: (callback: (cardId: string, index: number) => void) =>
    lynxIpc.on(spotlightChatChannels.selectThread, callback),
  onNewChat: (callback: (cardId: string) => void) => lynxIpc.on(spotlightChatChannels.newChat, callback),
  onOpenLogin: (callback: (cardId: string) => void) => lynxIpc.on(spotlightChatChannels.openLogin, callback),
  onSetActiveCard: (callback: (cardId: string) => void) => lynxIpc.on(spotlightChatChannels.setActiveCard, callback),
};

export default spotlightChatIpc;
