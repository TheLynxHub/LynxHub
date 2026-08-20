export type BookmarkItemType = 'bookmark' | 'folder';

export type BookmarkBarVisibility = 'browser_open' | 'always' | 'never';

export type BookmarkNewTabBehavior = 'browser' | 'both';

export type BookmarkNode = {
  id: string;
  type: BookmarkItemType;
  title: string;
  url?: string;
  favIcon?: string;
  parentId: string | null; // 'bookmarks_bar' or folder id
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type BookmarkFolder = BookmarkNode & {
  type: 'folder';
  children: BookmarkNode[];
};

export type BookmarkItem = BookmarkNode & {
  type: 'bookmark';
  url: string;
};

export type CreateBookmarkInput = {
  type: BookmarkItemType;
  title: string;
  url?: string;
  favIcon?: string;
  parentId?: string | null;
};

export type UpdateBookmarkInput = {
  title?: string;
  url?: string;
  favIcon?: string;
  parentId?: string | null;
  order?: number;
};

export type BookmarkContextMenuPayload = {
  targetType: 'bookmark' | 'folder' | 'bar';
  bookmarkId?: string;
  folderId?: string;
  title?: string;
  url?: string;
  parentId?: string | null;
};

export type BookmarkFolderMenuPayload = {
  folderId: string;
  title: string;
};

export type BookmarkEditMenuPayload = {
  mode: 'add' | 'edit';
  item?: BookmarkNode;
  parentId?: string | null;
  isAutoAdded?: boolean;
};
