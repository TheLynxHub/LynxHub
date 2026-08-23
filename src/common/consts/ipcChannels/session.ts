/**
 * IPC channels for tab and session state persistence and crash recovery.
 */
export const sessionChannels = {
  saveSnapshot: 'session:save-snapshot',
  getSnapshot: 'session:get-snapshot',
  getCrashStatus: 'session:get-crash-status',
  clearCrashedSession: 'session:clear-crashed-session',
} as const;
