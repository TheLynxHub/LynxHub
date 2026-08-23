import {sessionChannels} from '@lynx_common/consts/ipcChannels/session';
import {SessionCrashStatus, SessionSnapshot} from '@lynx_common/types';

import lynxIpc from './lynxIpc';

/**
 * Renderer-side IPC wrappers for session persistence and crash recovery.
 */
const sessionIpc = {
  /**
   * Saves a session snapshot ('current', 'last_closed', 'crashed').
   */
  saveSnapshot: (id: string, snapshot: SessionSnapshot) =>
    lynxIpc.invoke<boolean>(sessionChannels.saveSnapshot, id, snapshot),

  /**
   * Retrieves a saved session snapshot.
   */
  getSnapshot: (id: string) => lynxIpc.invoke<SessionSnapshot | null>(sessionChannels.getSnapshot, id),

  /**
   * Checks if an unexpected crash occurred and fetches any crashed session snapshot.
   */
  getCrashStatus: () => lynxIpc.invoke<SessionCrashStatus>(sessionChannels.getCrashStatus),

  /**
   * Clears the crashed session snapshot after restoring or dismissing.
   */
  clearCrashedSession: () => lynxIpc.invoke<boolean>(sessionChannels.clearCrashedSession),
};

export default sessionIpc;
