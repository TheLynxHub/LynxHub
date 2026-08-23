import classHolder from '@lynx_main/managers/classHolder';

import {emitMainIpcEventSync} from './ipcEvents';

/**
 * Creates a sender function that sends IPC messages to a specific manager's window.
 * @param managerKey - The key of the manager in classHolder.
 * @returns A function that sends a message on a specific channel.
 */
const createSender = <K extends keyof typeof classHolder>(managerKey: K) => {
  return (channel: string, ...args: any[]) => {
    const eventStart = Date.now();
    const beforeEvent = {
      phase: 'before' as const,
      method: 'send' as const,
      channel,
      args: [...args],
      timestamp: eventStart,
      context: {
        source: 'sender',
        target: String(managerKey),
      },
    };

    emitMainIpcEventSync(beforeEvent);

    const emitAfter = (status: 'success' | 'error', error?: unknown): void => {
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status,
        durationMs: Date.now() - eventStart,
        error,
      });
    };

    const trySend = (manager: unknown): boolean => {
      if (!(manager && typeof manager === 'object' && 'sendMessage' in manager)) {
        return false;
      }

      try {
        (manager as any).sendMessage(channel, ...args);
        emitAfter('success');
      } catch (error) {
        emitAfter('error', error);
        throw error;
      }

      return true;
    };

    if (trySend(classHolder[managerKey])) {
      return;
    }

    classHolder
      .waitForClass(managerKey)
      .then(manager => {
        if (trySend(manager)) {
          return;
        }

        const error = new Error(`Manager "${String(managerKey)}" does not support sendMessage.`);
        emitAfter('error', error);
        console.error(error.message);
      })
      .catch(error => {
        emitAfter('error', error);
      });
  };
};

const sendToMain = createSender('appManager');
const sendToLinkPreview = createSender('linkPreviewManager');
const sendToContextMenu = createSender('contextMenuManager');
const sendToBookmarkTooltip = createSender('bookmarkTooltipManager');
const sendToQuickWeb = createSender('quickWindowManager');

export {sendToBookmarkTooltip, sendToContextMenu, sendToLinkPreview, sendToMain, sendToQuickWeb};
