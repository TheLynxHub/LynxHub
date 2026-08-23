import {sessionChannels} from '@lynx_common/consts/ipcChannels/session';
import {SessionCrashStatus, SessionSnapshot} from '@lynx_common/types';
import {MainHT} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';

/**
 * Initializes listeners for tab and session state persistence events.
 */
export default function listenSession() {
  const storageManager = classHolder.storageManager;

  // Saves a session snapshot
  sessionIpc.handle.saveSnapshot((id, snapshot) => {
    storageManager.saveSessionSnapshot(id, snapshot);
    return true;
  });

  // Gets a session snapshot by ID
  sessionIpc.handle.getSnapshot(id => {
    return storageManager.getSessionSnapshot(id);
  });

  // Checks crash status on startup
  sessionIpc.handle.getCrashStatus(() => {
    return storageManager.getCrashStatus();
  });

  // Clears crashed session snapshot
  sessionIpc.handle.clearCrashedSession(() => {
    storageManager.clearCrashedSession();
    return true;
  });
}

/**
 * IPC interface for session storage and crash recovery.
 */
export const sessionIpc = {
  handle: {
    /** Handles saving session snapshot */
    saveSnapshot: (callback: (id: string, snapshot: SessionSnapshot) => MainHT<boolean>) =>
      lynxIpc.handle(sessionChannels.saveSnapshot, callback),
    /** Handles getting session snapshot */
    getSnapshot: (callback: (id: string) => MainHT<SessionSnapshot | null>) =>
      lynxIpc.handle(sessionChannels.getSnapshot, callback),
    /** Handles getting crash recovery status */
    getCrashStatus: (callback: () => MainHT<SessionCrashStatus>) =>
      lynxIpc.handle(sessionChannels.getCrashStatus, callback),
    /** Handles clearing crashed session snapshot */
    clearCrashedSession: (callback: () => MainHT<boolean>) =>
      lynxIpc.handle(sessionChannels.clearCrashedSession, callback),
  },
};
