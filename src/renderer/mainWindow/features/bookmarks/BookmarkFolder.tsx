import {BookmarkFolder as BookmarkFolderType} from '@lynx_common/types/bookmarks';
import {isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {FolderIcon} from '@solar-icons/react/bold-duotone';
import {motion, Transition, Variants} from 'framer-motion';
import {memo, useCallback, useRef} from 'react';

const folderVariants: Variants = {
  initial: {opacity: 0, scale: 0.85},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.8},
};

const folderTransition: Transition = {
  layout: {type: 'spring', stiffness: 500, damping: 30},
  opacity: {duration: 0.15},
  scale: {duration: 0.15},
};

type Props = {
  folder: BookmarkFolderType;
};

const BookmarkFolder = memo(({folder}: Props) => {
  const btnRef = useRef<HTMLDivElement>(null);

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
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [folder.id, folder.title],
  );

  return (
    <motion.div
      className={
        'flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs ' +
        'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ' +
        'text-foreground shrink-0 max-w-[180px] select-none'
      }
      exit="exit"
      ref={btnRef}
      tabIndex={0}
      role="button"
      layout="position"
      initial="initial"
      animate="animate"
      onClick={handleClick}
      variants={folderVariants}
      transition={folderTransition}
      onContextMenu={handleContextMenu}>
      <div className="flex items-center gap-1.5 min-w-0">
        <FolderIcon className="size-3.5 text-warning shrink-0" />
        <span className="truncate text-xs font-medium leading-none">{folder.title}</span>
      </div>
    </motion.div>
  );
});

BookmarkFolder.displayName = 'BookmarkFolder';

export default BookmarkFolder;
