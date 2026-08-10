/**
 * IPC channels for static data retrieval.
 * Handles fetching releases, insider builds, notifications, modules, and extensions lists.
 */
export const staticsChannels = {
  pull: 'statics:pull',
  getReleases: 'statics:getReleases',
  getInsider: 'statics:getInsider',
  getNotification: 'statics:getNotification',
  getPatrons: 'statics:getPatrons',
} as const;
