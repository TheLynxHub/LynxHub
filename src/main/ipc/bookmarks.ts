import {bookmarksChannels} from '@lynx_common/consts/ipcChannels/bookmarks';
import {BookmarkFolder, BookmarkNode, CreateBookmarkInput, UpdateBookmarkInput} from '@lynx_common/types/bookmarks';
import {MainHT} from '@lynx_common/types/ipc';
import classHolder from '@lynx_main/managers/classHolder';

import lynxIpc from './ipcWrapper';
import {sendToMain} from './sender';

export async function listenBookmarks() {
  const storageManager = classHolder.storageManager;

  bookmarksIpc.handle.getTree(() => storageManager.getBookmarksTree());
  bookmarksIpc.handle.getAll(() => storageManager.getAllBookmarks());

  bookmarksIpc.handle.add(input => {
    const created = storageManager.addBookmark(input);
    bookmarksIpc.send.onChanged();
    return created;
  });

  bookmarksIpc.handle.update((id, updates) => {
    const updated = storageManager.updateBookmark(id, updates);
    bookmarksIpc.send.onChanged();
    return updated;
  });

  bookmarksIpc.handle.remove(id => {
    storageManager.removeBookmark(id);
    bookmarksIpc.send.onChanged();
  });

  bookmarksIpc.handle.reorder(items => {
    storageManager.reorderBookmarks(items);
    bookmarksIpc.send.onChanged();
  });

  // Forward openAddEditModal requests from child windows to mainWindow
  bookmarksIpc.on.openAddEditModal(payload => {
    bookmarksIpc.send.openAddEditModal(payload);
  });
}

export const bookmarksIpc = {
  on: {
    openAddEditModal: (callback: (payload: {mode: 'add' | 'edit'; item?: BookmarkNode; parentId?: string}) => void) =>
      lynxIpc.on(bookmarksChannels.openAddEditModal, callback),
  },
  send: {
    onChanged: () => sendToMain(bookmarksChannels.onChanged),
    openAddEditModal: (payload: {mode: 'add' | 'edit'; item?: BookmarkNode; parentId?: string}) =>
      sendToMain(bookmarksChannels.openAddEditModal, payload),
  },
  handle: {
    getTree: (callback: () => MainHT<BookmarkFolder>) => lynxIpc.handle(bookmarksChannels.getTree, callback),
    getAll: (callback: () => MainHT<BookmarkNode[]>) => lynxIpc.handle(bookmarksChannels.getAll, callback),
    add: (callback: (input: CreateBookmarkInput) => MainHT<BookmarkNode>) =>
      lynxIpc.handle(bookmarksChannels.add, callback),
    update: (callback: (id: string, updates: UpdateBookmarkInput) => MainHT<BookmarkNode | null>) =>
      lynxIpc.handle(bookmarksChannels.update, callback),
    remove: (callback: (id: string) => MainHT<void>) => lynxIpc.handle(bookmarksChannels.remove, callback),
    reorder: (callback: (items: {id: string; order: number; parentId: string | null}[]) => MainHT<void>) =>
      lynxIpc.handle(bookmarksChannels.reorder, callback),
  },
};
