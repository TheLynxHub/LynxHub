import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import storageIpc from '@lynx_shared/ipc/storage';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions} from '../../redux/reducers/bookmarks';
import {AppDispatch} from '../../redux/store';

/**
 * Global listener for bookmarks events (tree changes, modal open triggers, storage sync).
 */
export const useBookmarksEvents = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const [treeData, allData] = await Promise.all([bookmarksIpc.getTree(), bookmarksIpc.getAll()]);
        dispatch(bookmarksActions.setTree(treeData));
        dispatch(bookmarksActions.setAll(allData));
      } catch (err) {
        console.error('Failed to fetch bookmarks in events:', err);
      }
    };

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
  }, [dispatch]);

  // Sync visibility with storage
  useEffect(() => {
    storageIpc.get('browser').then(data => {
      if (data?.bookmarksBarVisibility) {
        dispatch(bookmarksActions.setVisibility(data.bookmarksBarVisibility));
      }
    });
  }, [dispatch]);
};
