import {CreateBookmarkInput, UpdateBookmarkInput} from '@lynx_common/types/bookmarks';
import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions, useBookmarksState} from '../../redux/reducers/bookmarks';
import {AppDispatch} from '../../redux/store';

export function useBookmarks() {
  const dispatch = useDispatch<AppDispatch>();
  const tree = useBookmarksState('tree');
  const all = useBookmarksState('all');
  const visibility = useBookmarksState('visibility');

  const fetchBookmarks = useCallback(async () => {
    try {
      const [treeData, allData] = await Promise.all([bookmarksIpc.getTree(), bookmarksIpc.getAll()]);
      dispatch(bookmarksActions.setTree(treeData));
      dispatch(bookmarksActions.setAll(allData));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  }, [dispatch]);

  const addBookmark = useCallback(
    async (input: CreateBookmarkInput) => {
      const created = await bookmarksIpc.add(input);
      await fetchBookmarks();
      return created;
    },
    [fetchBookmarks],
  );

  const updateBookmark = useCallback(
    async (id: string, updates: UpdateBookmarkInput) => {
      const updated = await bookmarksIpc.update(id, updates);
      await fetchBookmarks();
      return updated;
    },
    [fetchBookmarks],
  );

  const removeBookmark = useCallback(
    async (id: string) => {
      await bookmarksIpc.remove(id);
      await fetchBookmarks();
    },
    [fetchBookmarks],
  );

  const reorderBookmarks = useCallback(
    async (items: {id: string; order: number; parentId: string | null}[]) => {
      await bookmarksIpc.reorder(items);
      await fetchBookmarks();
    },
    [fetchBookmarks],
  );

  return {
    tree,
    all,
    visibility,
    addBookmark,
    updateBookmark,
    removeBookmark,
    reorderBookmarks,
    fetchBookmarks,
  };
}
