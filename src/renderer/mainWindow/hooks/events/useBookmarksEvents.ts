import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import storageIpc from '@lynx_shared/ipc/storage';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions} from '../../redux/reducers/bookmarks';
import {cardsActions} from '../../redux/reducers/cards';
import {AppDispatch, getStore} from '../../redux/store';

/**
 * Global listener for bookmarks events (tree changes, modal open triggers, storage sync, bookmark open navigation).
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

    const offOpenBookmark = bookmarksIpc.on.openBookmark(({url, newTab}) => {
      if (newTab) {
        contextMenuIpc.send.rightClickItems.newTab(url);
      } else {
        const store = getStore();
        const state = store.getState();
        const activeTab = state.tabs.activeTab;
        const runningCards = state.cards.runningCard;
        const activeRunningCard = runningCards.find(card => card.tabId === activeTab);
        const hasBrowser = activeRunningCard && activeRunningCard.type !== 'terminal';

        if (hasBrowser) {
          dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: url}));
          dispatch(cardsActions.setRunningCardView({tabId: activeTab, view: 'browser'}));
        } else {
          contextMenuIpc.send.rightClickItems.newTab(url);
        }
      }
    });

    return () => {
      offChanged();
      offOpenModal();
      offOpenBookmark();
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
