import {windowDialogsChannels} from '@lynx_common/consts/ipcChannels/dialogsWindow';
import classHolder from '@lynx_main/managers/classHolder';
import {IpcMainEvent} from 'electron';

import lynxIpc from './ipcWrapper';
import {sendToContextMenu} from './sender';

let currentDialogEvent: IpcMainEvent | undefined = undefined;
let currentDialogDefaultResult: boolean | null | string = null;

/**
 * Called when the dialog window is blurred.
 * Sets the default result for the current dialog event.
 */
export const dialogBlurred = () => {
  if (currentDialogEvent) {
    currentDialogEvent.returnValue = currentDialogDefaultResult;
    currentDialogEvent = undefined;
  }
};

/**
 * Initializes listeners for dialog window events.
 */
export default async function listenDialogsWindow() {
  const [contextMenuManager, appManager] = await Promise.all([
    classHolder.waitForClass('contextMenuManager'),
    classHolder.waitForClass('appManager'),
  ]);

  const setCenterPosition = () => {
    const window = appManager.getMainWindow();
    if (window) {
      const {width, height} = window.getBounds();
      contextMenuManager.setCustomContextPosition({x: width / 2 - 150, y: height / 2 - 60});
    }
  };

  // Prompt dialog
  dialogsWindowIpc.on.onPrompt((event, message, defaultValue) => {
    setCenterPosition();

    dialogsWindowIpc.send.promptShow(message, defaultValue);

    currentDialogEvent = event;
    currentDialogDefaultResult = null;

    contextMenuManager.showContextMenu();
  });

  // Confirm dialog
  dialogsWindowIpc.on.onConfirm((event, message) => {
    setCenterPosition();

    dialogsWindowIpc.send.confirmShow(message);

    currentDialogEvent = event;
    currentDialogDefaultResult = false;

    contextMenuManager.showContextMenu();
  });

  // Alert dialog
  dialogsWindowIpc.on.onAlert((event, message) => {
    setCenterPosition();

    dialogsWindowIpc.send.alertShow(message);

    currentDialogEvent = event;
    currentDialogDefaultResult = null;

    contextMenuManager.showContextMenu();
  });

  // Dialog results
  dialogsWindowIpc.on.promptResult(result => {
    if (currentDialogEvent) {
      currentDialogEvent.returnValue = result;
      currentDialogEvent = undefined;
    }
  });

  dialogsWindowIpc.on.confirmResult(result => {
    if (currentDialogEvent) {
      currentDialogEvent.returnValue = result;
      currentDialogEvent = undefined;
    }
  });
}

/**
 * IPC interface for dialog window events.
 */
export const dialogsWindowIpc = {
  on: {
    /** Listens for prompt request */
    onPrompt: (callback: (event: IpcMainEvent, message: string, defaultValue?: string) => void) =>
      lynxIpc.onEvent(windowDialogsChannels.onPrompt, callback),
    /** Listens for confirm request */
    onConfirm: (callback: (event: IpcMainEvent, message: string) => void) =>
      lynxIpc.onEvent(windowDialogsChannels.onConfirm, callback),
    /** Listens for alert request */
    onAlert: (callback: (event: IpcMainEvent, message: string) => void) =>
      lynxIpc.onEvent(windowDialogsChannels.onAlert, callback),
    /** Listens for prompt result */
    promptResult: (callback: (result: string | null) => void) =>
      lynxIpc.on(windowDialogsChannels.promptResult, callback),
    /** Listens for confirm result */
    confirmResult: (callback: (result: boolean) => void) => lynxIpc.on(windowDialogsChannels.confirmResult, callback),
  },
  send: {
    /** Sends prompt show command to context menu (which renders the dialog) */
    promptShow: (message: string, defaultValue?: string) =>
      sendToContextMenu(windowDialogsChannels.promptShow, message, defaultValue),
    /** Sends confirm show command to context menu */
    confirmShow: (message: string) => sendToContextMenu(windowDialogsChannels.confirmShow, message),
    /** Sends alert show command to context menu */
    alertShow: (message: string) => sendToContextMenu(windowDialogsChannels.alertShow, message),
  },
};
