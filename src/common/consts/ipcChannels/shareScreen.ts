/**
 * IPC channels for screen sharing operations.
 * Handles listing screen/window sources and managing the sharing session.
 */
export const screenShareChannels = {
  getScreenSources: 'screenShare-getScreenSources',
  getWindowSources: 'screenShare-getWindowSources',
  startShare: 'screenShare-startShare',
  cancel: 'screenShare-cancel',
  requestSources: 'screenShare-requestSources',
} as const;
