import {BookmarksState} from '@lynx/types/reducers';
import {BookmarkBarVisibility, BookmarkFolder, BookmarkNode} from '@lynx_common/types/bookmarks';
import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {useSelector} from 'react-redux';

import {RootState} from '../store';

type BookmarksStateValueByKey = {
  [K in keyof BookmarksState]: BookmarksState[K];
};

const initialState: BookmarksState = {
  tree: {
    id: 'bookmarks_bar',
    type: 'folder',
    title: 'Bookmarks Bar',
    parentId: null,
    order: 0,
    createdAt: 0,
    updatedAt: 0,
    children: [],
  },
  all: [],
  visibility: 'browser_open',
  editModal: {
    isOpen: false,
    mode: 'add',
  },
};

const bookmarksSlice = createSlice({
  name: 'bookmarks',
  initialState,
  reducers: {
    setTree: (state, action: PayloadAction<BookmarkFolder>) => {
      state.tree = action.payload;
    },
    setAll: (state, action: PayloadAction<BookmarkNode[]>) => {
      state.all = action.payload;
    },
    setVisibility: (state, action: PayloadAction<BookmarkBarVisibility>) => {
      state.visibility = action.payload;
    },
    openEditModal: (state, action: PayloadAction<{mode: 'add' | 'edit'; item?: BookmarkNode; parentId?: string}>) => {
      state.editModal = {
        isOpen: true,
        mode: action.payload.mode,
        item: action.payload.item,
        parentId: action.payload.parentId,
      };
    },
    closeEditModal: state => {
      state.editModal.isOpen = false;
      state.editModal.item = undefined;
      state.editModal.parentId = undefined;
    },
  },
});

export const useBookmarksState = <T extends keyof BookmarksState>(name: T): BookmarksStateValueByKey[T] =>
  useSelector((state: RootState) => state.bookmarks[name]);

export const bookmarksActions = bookmarksSlice.actions;
export default bookmarksSlice.reducer;
