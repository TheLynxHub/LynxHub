import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {
  AddFolderIcon,
  BookmarkIcon,
  CopyIcon,
  FolderOpenIcon,
  PenIcon,
  SquareShareLineIcon,
  TrashBinTrashIcon,
} from '@solar-icons/react/bold-duotone';
import {memo} from 'react';

import {useContextState} from '../redux/reducer';
import Separator from './right_click/Separator';
import {ActionButton, createActionHandler} from './right_click/Utils';

/**
 * Layout for Bookmark Context Menu.
 * Supports context actions for Bookmark items, Folder items, and empty bar area.
 */
const BookmarkContextMenu = memo(function BookmarkContextMenu() {
  const payload = useContextState('bookmarkContextMenu');

  const targetType = payload?.targetType ?? 'bar';
  const bookmarkId = payload?.bookmarkId;
  const folderId = payload?.folderId;
  const url = payload?.url;

  const handleOpenInNewTab = createActionHandler(() => {
    if (url) {
      contextMenuIpc.send.rightClickItems.newTab(url);
    }
  });

  const handleOpenAllInNewTabs = createActionHandler(async () => {
    if (folderId) {
      const all = await bookmarksIpc.getAll();
      const children = all.filter(b => b.parentId === folderId && b.type === 'bookmark' && b.url);
      children.forEach(c => {
        if (c.url) contextMenuIpc.send.rightClickItems.newTab(c.url);
      });
    }
  });

  const handleCopyLink = createActionHandler(() => {
    if (url) {
      navigator.clipboard.writeText(url);
    }
  });

  const handleEdit = createActionHandler(async () => {
    const id = bookmarkId || folderId;
    if (id) {
      const all = await bookmarksIpc.getAll();
      const item = all.find(b => b.id === id);
      if (item) {
        bookmarksIpc.openAddEditModal({mode: 'edit', item});
      }
    }
  });

  const handleDelete = createActionHandler(async () => {
    const id = bookmarkId || folderId;
    if (id) {
      await bookmarksIpc.remove(id);
    }
  });

  const handleAddBookmark = createActionHandler(() => {
    bookmarksIpc.openAddEditModal({
      mode: 'add',
      parentId: folderId || 'bookmarks_bar',
    });
  });

  const handleAddFolder = createActionHandler(() => {
    bookmarksIpc.openAddEditModal({
      mode: 'add',
      parentId: folderId || 'bookmarks_bar',
      item: {
        id: '',
        type: 'folder',
        title: 'New folder',
        parentId: folderId || 'bookmarks_bar',
        order: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });
  });

  return (
    <div className="overflow-hidden px-1.5 flex flex-col gap-y-1 py-2 min-w-[210px]">
      {targetType === 'bookmark' && url && (
        <>
          <ActionButton
            title="Open in New Tab"
            onPress={handleOpenInNewTab}
            icon={<SquareShareLineIcon className="size-4 text-primary" />}
          />
          <ActionButton
            onPress={handleCopyLink}
            title="Copy Link Address"
            icon={<CopyIcon className="size-4 text-default-500" />}
          />
          <ActionButton title="Edit..." onPress={handleEdit} icon={<PenIcon className="size-4 text-warning" />} />
          <ActionButton
            title="Delete"
            onPress={handleDelete}
            icon={<TrashBinTrashIcon className="size-4 text-danger" />}
          />
          <Separator />
        </>
      )}

      {targetType === 'folder' && (
        <>
          <ActionButton
            title="Open All in New Tabs"
            onPress={handleOpenAllInNewTabs}
            icon={<FolderOpenIcon className="size-4 text-primary" />}
          />
          <ActionButton title="Rename..." onPress={handleEdit} icon={<PenIcon className="size-4 text-warning" />} />
          <ActionButton
            title="Delete Folder"
            onPress={handleDelete}
            icon={<TrashBinTrashIcon className="size-4 text-danger" />}
          />
          <Separator />
        </>
      )}

      <ActionButton
        title="Add Bookmark..."
        onPress={handleAddBookmark}
        icon={<BookmarkIcon className="size-4 text-success" />}
      />
      <ActionButton
        title="Add Folder..."
        onPress={handleAddFolder}
        icon={<AddFolderIcon className="size-4 text-amber-500" />}
      />
    </div>
  );
});

export default BookmarkContextMenu;
