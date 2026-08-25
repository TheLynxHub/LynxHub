import {Checkbox} from '@heroui/react';
import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {
  AddFolderIcon,
  BookmarkIcon,
  CopyIcon,
  FolderOpenIcon,
  PenIcon,
  SquareShareLineIcon,
  TrashBin2Icon,
} from '@solar-icons/react/bold-duotone';
import {memo, useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {MenuTypes} from '../consts';
import {contextActions, useContextState} from '../redux/reducer';
import {ContextDispatch} from '../redux/store';
import Separator from './right_click/Separator';
import {ActionButton, createActionHandler} from './right_click/Utils';

/**
 * Layout for Bookmark Context Menu.
 * Supports context actions for Bookmark items, Folder items, and empty bar area.
 */
const BookmarkContextMenu = memo(function BookmarkContextMenu() {
  const dispatch = useDispatch<ContextDispatch>();
  const payload = useContextState('bookmarkContextMenu');

  const targetType = payload?.targetType ?? 'bar';
  const bookmarkId = payload?.bookmarkId;
  const folderId = payload?.folderId;
  const url = payload?.url;
  const isIconOnly = Boolean(payload?.showIconOnly);

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

  const handleToggleShowIconOnly = useCallback(
    (selected: boolean) => {
      contextMenuIpc.send.hideWindow();
      if (bookmarkId) {
        bookmarksIpc.update(bookmarkId, {
          showIconOnly: selected,
        });
      }
    },
    [bookmarkId],
  );

  const handleEdit = useCallback(async () => {
    const id = bookmarkId || folderId;
    if (id) {
      const all = await bookmarksIpc.getAll();
      const item = all.find(b => b.id === id);
      if (item) {
        dispatch(
          contextActions.showLayout({
            key: 'bookmarkEditMenu',
            value: {mode: 'edit', item},
            layout: MenuTypes.BookmarkEditMenu,
          }),
        );
      }
    }
  }, [bookmarkId, folderId, dispatch]);

  const handleDelete = createActionHandler(async () => {
    const id = bookmarkId || folderId;
    if (id) {
      await bookmarksIpc.remove(id);
    }
  });

  const handleAddBookmark = useCallback(() => {
    dispatch(
      contextActions.showLayout({
        key: 'bookmarkEditMenu',
        value: {
          mode: 'add',
          parentId: folderId || 'bookmarks_bar',
        },
        layout: MenuTypes.BookmarkEditMenu,
      }),
    );
  }, [folderId, dispatch]);

  const handleAddFolder = useCallback(() => {
    dispatch(
      contextActions.showLayout({
        key: 'bookmarkEditMenu',
        value: {
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
        },
        layout: MenuTypes.BookmarkEditMenu,
      }),
    );
  }, [folderId, dispatch]);

  return (
    <div className="overflow-hidden px-1.5 flex flex-col gap-y-1 py-2 min-w-[210px]">
      {targetType === 'bookmark' && url && (
        <>
          <ActionButton
            title="Open in New Tab"
            onPress={handleOpenInNewTab}
            icon={<SquareShareLineIcon className="size-4 text-accent" />}
          />
          <ActionButton
            onPress={handleCopyLink}
            title="Copy Link Address"
            icon={<CopyIcon className="size-4 text-muted" />}
          />
          <Checkbox className="w-full" isSelected={isIconOnly} onChange={handleToggleShowIconOnly}>
            <Checkbox.Content
              className={
                'w-full flex items-center gap-x-2 text-sm text-foreground select-none ' +
                'py-2.5 px-3 rounded-xl cursor-pointer hover:bg-surface-tertiary transition-colors duration-100'
              }>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <span className="pointer-events-none text-nowrap">Show Icon Only</span>
            </Checkbox.Content>
          </Checkbox>
          <ActionButton title="Edit..." onPress={handleEdit} icon={<PenIcon className="size-4 text-warning" />} />
          <ActionButton title="Delete" onPress={handleDelete} icon={<TrashBin2Icon className="size-4 text-danger" />} />
          <Separator />
        </>
      )}

      {targetType === 'folder' && (
        <>
          <ActionButton
            title="Open All in New Tabs"
            onPress={handleOpenAllInNewTabs}
            icon={<FolderOpenIcon className="size-4 text-accent" />}
          />
          <ActionButton title="Rename..." onPress={handleEdit} icon={<PenIcon className="size-4 text-warning" />} />
          <ActionButton
            title="Delete Folder"
            onPress={handleDelete}
            icon={<TrashBin2Icon className="size-4 text-danger" />}
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
