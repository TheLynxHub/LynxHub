import {BookmarkFolder as BookmarkFolderType} from '@lynx_common/types/bookmarks';
import {isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {FolderIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useRef} from 'react';

import {useBookmarks} from './useBookmarks';

type Props = {
  folder: BookmarkFolderType;
};

const BookmarkFolder = memo(({folder}: Props) => {
  const btnRef = useRef<HTMLDivElement>(null);
  const {visibility} = useBookmarks();

  const handleClick = useCallback(() => {
    if (!btnRef.current) return;
    if (!isLinux) bookmarkTooltipIpc.hide();
    const rect = btnRef.current.getBoundingClientRect();
    contextMenuIpc.send.openBookmarkFolderMenu(
      {
        folderId: folder.id,
        title: folder.title,
      },
      {x: Math.floor(rect.x), y: Math.floor(rect.y + rect.height)},
    );
  }, [folder.id, folder.title]);

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

  return (
    <div
      className={
        'flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs ' +
        'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ' +
        'text-foreground shrink-0 max-w-[180px] select-none'
      }
      ref={btnRef}
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}>
      <div className="flex items-center gap-1.5 min-w-0">
        <FolderIcon className="size-3.5 text-warning shrink-0" />
        <span className="truncate text-xs font-medium leading-none">{folder.title}</span>
      </div>
    </div>
  );
});

BookmarkFolder.displayName = 'BookmarkFolder';

export default BookmarkFolder;
