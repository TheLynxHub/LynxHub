import {ipcMain, IpcMainEvent, WebContents} from 'electron';

import {emitMainIpcEvent, emitMainIpcEventSync} from './ipcEvents';

/**
 * Sends a message to the specified WebContents.
 * @param webContents - The target WebContents.
 * @param channel - The channel name.
 * @param args - Arguments to send.
 */
const send = (webContents: WebContents, channel: string, ...args: any[]) => webContents.send(channel, ...args);

/**
 * Listens for a message on the specified channel.
 * @param channel - The channel name.
 * @param callback - The callback function.
 * @returns A function to remove the listener.
 */
const on = (channel: string, callback: (...args: any[]) => void) => {
  const subscription = (_: any, ...args: any[]) => {
    const eventStart = Date.now();
    const beforeEvent = {
      phase: 'before' as const,
      method: 'on' as const,
      channel,
      args: [...args],
      timestamp: eventStart,
    };

    emitMainIpcEventSync(beforeEvent);

    try {
      const result = callback(...args);
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'success',
        durationMs: Date.now() - eventStart,
        result,
      });
    } catch (error) {
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'error',
        durationMs: Date.now() - eventStart,
        error,
      });
      throw error;
    }
  };
  ipcMain.on(channel, subscription);
  return () => {
    ipcMain.removeListener(channel, subscription);
  };
};

/**
 * Listens for a message on the specified channel with ipc event.
 * @param channel - The channel name.
 * @param callback - The callback function.
 * @returns A function to remove the listener.
 */
const onEvent = (channel: string, callback: (event: IpcMainEvent, ...args: any[]) => void) => {
  const subscription = (event: IpcMainEvent, ...args: any[]) => {
    const eventStart = Date.now();
    const beforeEvent = {
      phase: 'before' as const,
      method: 'on' as const,
      channel,
      args: [...args],
      timestamp: eventStart,
    };

    emitMainIpcEventSync(beforeEvent);

    try {
      const result = callback(event, ...args);
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'success',
        durationMs: Date.now() - eventStart,
        result,
      });
    } catch (error) {
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'error',
        durationMs: Date.now() - eventStart,
        error,
      });
      throw error;
    }
  };
  ipcMain.on(channel, subscription);
  return () => {
    ipcMain.removeListener(channel, subscription);
  };
};

/**
 * Listens for a message on the specified channel once.
 * @param channel - The channel name.
 * @param callback - The callback function.
 * @returns A function to remove the listener.
 */
const once = (channel: string, callback: (...args: any[]) => void) => {
  const subscription = (_: any, ...args: any[]) => {
    const eventStart = Date.now();
    const beforeEvent = {
      phase: 'before' as const,
      method: 'once' as const,
      channel,
      args: [...args],
      timestamp: eventStart,
    };

    emitMainIpcEventSync(beforeEvent);

    try {
      const result = callback(...args);
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'success',
        durationMs: Date.now() - eventStart,
        result,
      });
    } catch (error) {
      emitMainIpcEventSync({
        ...beforeEvent,
        phase: 'after',
        status: 'error',
        durationMs: Date.now() - eventStart,
        error,
      });
      throw error;
    }
  };
  ipcMain.once(channel, subscription);
  return () => {
    ipcMain.removeListener(channel, subscription);
  };
};

/**
 * Handles a message on the specified channel.
 * @param channel - The channel name.
 * @param callback - The callback function.
 * @returns A function to remove the handler.
 */
const handle = <T>(channel: string, callback: (...args: any[]) => Promise<T> | T) => {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (_, ...args: any[]) => {
    const eventStart = Date.now();
    const beforeEvent = {
      phase: 'before' as const,
      method: 'handle' as const,
      channel,
      args: [...args],
      timestamp: eventStart,
    };

    await emitMainIpcEvent(beforeEvent);

    try {
      const result = await callback(...args);
      await emitMainIpcEvent({
        ...beforeEvent,
        phase: 'after',
        status: 'success',
        durationMs: Date.now() - eventStart,
        result,
      });
      return result;
    } catch (error) {
      await emitMainIpcEvent({
        ...beforeEvent,
        phase: 'after',
        status: 'error',
        durationMs: Date.now() - eventStart,
        error,
      });
      throw error;
    }
  });
  return () => {
    ipcMain.removeHandler(channel);
  };
};

/**
 * Removes a handler for the specified channel.
 * @param channel - The channel name.
 */
const removeHandler = (channel: string) => ipcMain.removeHandler(channel);

const lynxIpc = {send, on, onEvent, once, handle, removeHandler};

export default lynxIpc;
