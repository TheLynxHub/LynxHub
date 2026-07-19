import {floatChatChannels} from '@lynx_common/consts/ipcChannels/floatChat';
import {CloseFloatChatWindow, ToggleFloatChatWindow} from '@lynx_main/childWindows/floatChat';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';

let cachedOnlineCards: any[] = [];
let cachedOnlineChatState: any = null;

export default function listenFloatChat() {
  // Toggle float window from main process or renderer
  lynxIpc.on(floatChatChannels.toggleFloatChatWindow, () => {
    ToggleFloatChatWindow();
  });

  // Close float window
  lynxIpc.on(floatChatChannels.closeFloatChat, () => {
    CloseFloatChatWindow();
  });

  // Store online cards list sent by main window
  lynxIpc.on(floatChatChannels.setOnlineCards, cards => {
    cachedOnlineCards = cards;
    // Also forward to float window if open
    const floatWin = classHolder.floatChatWindow;
    if (floatWin && !floatWin.isDestroyed()) {
      floatWin.webContents.send(floatChatChannels.setOnlineCards, cards);
    }
  });

  // Retrieve online cards list
  lynxIpc.handle(floatChatChannels.getOnlineCards, () => {
    return cachedOnlineCards;
  });

  // Store & sync state from main window to float window
  lynxIpc.on(floatChatChannels.syncState, state => {
    cachedOnlineChatState = state;
    const floatWin = classHolder.floatChatWindow;
    if (floatWin && !floatWin.isDestroyed()) {
      floatWin.webContents.send(floatChatChannels.syncState, state);
    }
  });

  // Retrieve cached state (for float chat initialization)
  lynxIpc.handle(floatChatChannels.syncState, () => {
    return cachedOnlineChatState;
  });

  // Forward actions from float window to main window
  lynxIpc.on(floatChatChannels.sendMessage, (cardId: string, text: string) => {
    classHolder.appManager?.sendMessage(floatChatChannels.sendMessage, cardId, text);
  });

  // Select thread
  lynxIpc.on(floatChatChannels.selectThread, (cardId: string, index: number) => {
    classHolder.appManager?.sendMessage(floatChatChannels.selectThread, cardId, index);
  });

  // Start new chat
  lynxIpc.on(floatChatChannels.newChat, (cardId: string) => {
    classHolder.appManager?.sendMessage(floatChatChannels.newChat, cardId);
  });

  // Open login
  lynxIpc.on(floatChatChannels.openLogin, (cardId: string) => {
    const mainWindow = classHolder.appManager?.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    classHolder.appManager?.sendMessage(floatChatChannels.openLogin, cardId);
    CloseFloatChatWindow();
  });

  // Set active card
  lynxIpc.on(floatChatChannels.setActiveCard, (cardId: string) => {
    classHolder.appManager?.sendMessage(floatChatChannels.setActiveCard, cardId);
  });
}
