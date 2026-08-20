import {Button, Popover, ScrollShadow, Separator} from '@heroui/react';
import {BookmarkFolder as BookmarkFolderType, BookmarkItem as BookmarkItemType} from '@lynx_common/types/bookmarks';
import {isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {AltArrowDownIcon, FolderIcon, FolderOpenIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useState} from 'react';

import BookmarkItem from './BookmarkItem';
import {useBookmarks} from './useBookmarks';

type Props = {
  folder: BookmarkFolderType;
  inDropdown?: boolean;
};

const BookmarkFolder = memo(({folder, inDropdown}: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const {visibility} = useBookmarks();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLinux) bookmarkTooltipIpc.hide();

      contextMenuIpc.send.openBookmarkContextMenu(
        {
          targetType: 'folder',
          folderId: folder.id,
          title: folder.title,
          bookmarksBarVisibility: visibility,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [folder.id, folder.title, visibility],
  );

  const handleOpenAll = useCallback(() => {
    setIsOpen(false);
    folder.children.forEach(child => {
      if (child.type === 'bookmark' && child.url) {
        contextMenuIpc.send.rightClickItems.newTab(child.url);
      }
    });
  }, [folder.children]);

  const hasBookmarks = folder.children.some(c => c.type === 'bookmark');

  const folderClass = inDropdown
    ? 'flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs ' +
      'hover:bg-default-100 dark:hover:bg-default-50/10 cursor-pointer transition-colors ' +
      'text-foreground select-none'
    : 'flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs ' +
      'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ' +
      'text-foreground shrink-0 max-w-[180px] select-none';

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger>
        <div tabIndex={0} role="button" className={folderClass} onContextMenu={handleContextMenu}>
          <div className="flex items-center gap-1.5 min-w-0">
            <FolderIcon className="size-3.5 text-warning shrink-0" />
            <span className="truncate text-xs font-medium leading-none">{folder.title}</span>
          </div>
        </div>
      </Popover.Trigger>

      <Popover.Content placement="bottom start">
        <Popover.Dialog className="w-55 p-1.5 flex flex-col gap-1">
          {hasBookmarks && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onPress={handleOpenAll}
                className="justify-start text-xs font-normal h-7 px-2 text-primary"
                fullWidth>
                <FolderOpenIcon className="size-3.5" />
                Open All in Tabs
              </Button>
              <Separator className="my-0.5" />
            </>
          )}

          {folder.children.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">Empty folder</div>
          ) : (
            <ScrollShadow className="max-h-64 flex flex-col gap-0.5">
              {folder.children.map(child =>
                child.type === 'folder' ? (
                  <BookmarkFolder key={child.id} folder={child as BookmarkFolderType} inDropdown />
                ) : (
                  <BookmarkItem key={child.id} item={child as BookmarkItemType} inDropdown />
                ),
              )}
            </ScrollShadow>
          )}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
});

BookmarkFolder.displayName = 'BookmarkFolder';

export default BookmarkFolder;
