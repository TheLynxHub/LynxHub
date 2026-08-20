/**
 * IPC channels for Bookmarks management.
 */
export const bookmarksChannels = {
  getTree: 'bookmarks:getTree',
  getAll: 'bookmarks:getAll',
  add: 'bookmarks:add',
  update: 'bookmarks:update',
  remove: 'bookmarks:remove',
  reorder: 'bookmarks:reorder',
  onChanged: 'bookmarks:onChanged',
  openBookmark: 'bookmarks:openBookmark',
} as const;
