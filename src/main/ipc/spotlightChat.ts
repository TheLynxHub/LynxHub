import {spotlightChatChannels} from '@lynx_common/consts/ipcChannels/spotlightChat';
import {CloseSpotlightWindow, ToggleSpotlightWindow} from '@lynx_main/childWindows/spotlightChat';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';

let cachedOnlineCards: any[] = [];
let cachedOnlineChatState: any = null;

export default function listenSpotlightChat() {
  // Toggle spotlight window from main process or renderer
  lynxIpc.on(spotlightChatChannels.toggleSpotlightWindow, () => {
    ToggleSpotlightWindow();
  });

  // Close spotlight window
  lynxIpc.on(spotlightChatChannels.closeSpotlight, () => {
    CloseSpotlightWindow();
  });

  // Store online cards list sent by main window
  lynxIpc.on(spotlightChatChannels.setOnlineCards, (_event, cards) => {
    cachedOnlineCards = cards;
    // Also forward to spotlight window if open
    const spotlightWin = classHolder.spotlightChatWindow;
    if (spotlightWin && !spotlightWin.isDestroyed()) {
      spotlightWin.webContents.send(spotlightChatChannels.setOnlineCards, cards);
    }
  });

  // Retrieve online cards list
  lynxIpc.handle(spotlightChatChannels.getOnlineCards, () => {
    return cachedOnlineCards;
  });

  // Store & sync state from main window to spotlight window
  lynxIpc.on(spotlightChatChannels.syncState, (_event, state) => {
    cachedOnlineChatState = state;
    const spotlightWin = classHolder.spotlightChatWindow;
    if (spotlightWin && !spotlightWin.isDestroyed()) {
      spotlightWin.webContents.send(spotlightChatChannels.syncState, state);
    }
  });

  // Retrieve cached state (for spotlight initialization)
  lynxIpc.handle(spotlightChatChannels.syncState, () => {
    return cachedOnlineChatState;
  });

  // Forward actions from spotlight window to main window
  lynxIpc.on(spotlightChatChannels.sendMessage, (_event, cardId: string, text: string) => {
    classHolder.appManager?.sendMessage(spotlightChatChannels.sendMessage, cardId, text);
  });

  lynxIpc.on(spotlightChatChannels.selectThread, (_event, cardId: string, index: number) => {
    classHolder.appManager?.sendMessage(spotlightChatChannels.selectThread, cardId, index);
  });

  lynxIpc.on(spotlightChatChannels.newChat, (_event, cardId: string) => {
    classHolder.appManager?.sendMessage(spotlightChatChannels.newChat, cardId);
  });

  lynxIpc.on(spotlightChatChannels.openLogin, (_event, cardId: string) => {
    const mainWindow = classHolder.appManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    classHolder.appManager?.sendMessage(spotlightChatChannels.openLogin, cardId);
    CloseSpotlightWindow();
  });
}
