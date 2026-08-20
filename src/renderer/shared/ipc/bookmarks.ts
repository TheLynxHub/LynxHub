import {bookmarksChannels} from '@lynx_common/consts/ipcChannels/bookmarks';
import {BookmarkFolder, BookmarkNode, CreateBookmarkInput, UpdateBookmarkInput} from '@lynx_common/types/bookmarks';

import lynxIpc from './lynxIpc';

const bookmarksIpc = {
  getTree: () => lynxIpc.invoke<BookmarkFolder>(bookmarksChannels.getTree),
  getAll: () => lynxIpc.invoke<BookmarkNode[]>(bookmarksChannels.getAll),
  add: (input: CreateBookmarkInput) => lynxIpc.invoke<BookmarkNode>(bookmarksChannels.add, input),
  update: (id: string, updates: UpdateBookmarkInput) =>
    lynxIpc.invoke<BookmarkNode | null>(bookmarksChannels.update, id, updates),
  remove: (id: string) => lynxIpc.invoke<void>(bookmarksChannels.remove, id),
  reorder: (items: {id: string; order: number; parentId: string | null}[]) =>
    lynxIpc.invoke<void>(bookmarksChannels.reorder, items),
  openBookmark: (payload: {url: string; newTab?: boolean}) => lynxIpc.send(bookmarksChannels.openBookmark, payload),

  on: {
    changed: (callback: () => void): (() => void) => lynxIpc.on(bookmarksChannels.onChanged, callback),
    openBookmark: (callback: (payload: {url: string; newTab?: boolean}) => void): (() => void) =>
      lynxIpc.on(bookmarksChannels.openBookmark, callback),
  },
};

export default bookmarksIpc;
