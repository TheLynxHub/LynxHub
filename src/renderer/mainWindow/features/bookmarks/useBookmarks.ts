import {BookmarkNode, CreateBookmarkInput, UpdateBookmarkInput} from '@lynx_common/types/bookmarks';
import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import storageIpc from '@lynx_shared/ipc/storage';
import {useCallback, useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions, useBookmarksState} from '../../redux/reducers/bookmarks';
import {AppDispatch} from '../../redux/store';

export function useBookmarks() {
  const dispatch = useDispatch<AppDispatch>();
  const tree = useBookmarksState('tree');
  const all = useBookmarksState('all');
  const visibility = useBookmarksState('visibility');
  const editModal = useBookmarksState('editModal');

  const fetchBookmarks = useCallback(async () => {
    try {
      const [treeData, allData] = await Promise.all([bookmarksIpc.getTree(), bookmarksIpc.getAll()]);
      dispatch(bookmarksActions.setTree(treeData));
      dispatch(bookmarksActions.setAll(allData));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  }, [dispatch]);

  // Initial load and listen for changes
  useEffect(() => {
    fetchBookmarks();

    const offChanged = bookmarksIpc.on.changed(() => {
      fetchBookmarks();
    });

    const offOpenModal = bookmarksIpc.on.openAddEditModal(payload => {
      dispatch(bookmarksActions.openEditModal(payload));
    });

    return () => {
      offChanged();
      offOpenModal();
    };
  }, [fetchBookmarks, dispatch]);

  // Sync visibility with storage
  useEffect(() => {
    storageIpc.get('browser').then(data => {
      if (data?.bookmarksBarVisibility) {
        dispatch(bookmarksActions.setVisibility(data.bookmarksBarVisibility));
      }
    });
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

  const openAddModal = useCallback(
    (parentId?: string, defaultItem?: Partial<BookmarkNode>) => {
      dispatch(
        bookmarksActions.openEditModal({
          mode: 'add',
          parentId: parentId || 'bookmarks_bar',
          item: defaultItem as BookmarkNode | undefined,
        }),
      );
    },
    [dispatch],
  );

  const openEditModal = useCallback(
    (item: BookmarkNode) => {
      dispatch(
        bookmarksActions.openEditModal({
          mode: 'edit',
          item,
          parentId: item.parentId || 'bookmarks_bar',
        }),
      );
    },
    [dispatch],
  );

  const closeModal = useCallback(() => {
    dispatch(bookmarksActions.closeEditModal());
  }, [dispatch]);

  return {
    tree,
    all,
    visibility,
    editModal,
    addBookmark,
    updateBookmark,
    removeBookmark,
    openAddModal,
    openEditModal,
    closeModal,
    fetchBookmarks,
  };
}
