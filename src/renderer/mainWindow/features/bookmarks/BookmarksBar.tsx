import {ScrollShadow} from '@heroui/react';
import {RunningCard} from '@lynx/types';
import {BookmarkFolder as BookmarkFolderType, BookmarkItem as BookmarkItemType} from '@lynx_common/types/bookmarks';
import {isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {AnimatePresence, motion} from 'framer-motion';
import {memo, useCallback} from 'react';

import BookmarkFolder from './BookmarkFolder';
import BookmarkItem from './BookmarkItem';
import {useBookmarks} from './useBookmarks';

type Props = {
  runningCard?: RunningCard;
  className?: string;
};

/**
 * Checks whether the bookmarks bar should be visible based on visibility settings and card state.
 */
export function isBookmarksBarVisible(
  visibility: 'always' | 'browser_open' | 'never',
  runningCard?: RunningCard,
): boolean {
  if (visibility === 'never') return false;
  if (visibility === 'always') return true;
  if (visibility === 'browser_open') {
    if (!runningCard) return false;
    if (runningCard.type === 'terminal') return false;
    return runningCard.currentView === 'browser';
  }
  return false;
}

const BookmarksBar = memo(({runningCard, className}: Props) => {
  const {tree, visibility} = useBookmarks();

  const isVisible = isBookmarksBarVisible(visibility, runningCard);

  const handleBarContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLinux) bookmarkTooltipIpc.hide();

    contextMenuIpc.send.openBookmarkContextMenu(
      {
        targetType: 'bar',
      },
      {x: e.clientX, y: e.clientY},
    );
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.currentTarget.scrollLeft += e.deltaY;
    }
  }, []);

  if (!isVisible) return null;

  return (
    <ScrollShadow
      className={
        (runningCard ? 'absolute top-10 left-0 right-0 z-10 ' : 'w-full mb-1 shrink-0 rounded-xl ') +
        'h-8 px-2 flex items-center gap-1 bg-surface select-none ' +
        (className || '')
      }
      size={24}
      role="toolbar"
      onWheel={handleWheel}
      orientation="horizontal"
      aria-label="Bookmarks bar"
      onContextMenu={handleBarContextMenu}
      hideScrollBar>
      <AnimatePresence initial={false} mode="popLayout">
        {tree.children.length === 0 ? (
          <motion.span
            exit={{opacity: 0}}
            key="empty-bookmarks"
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 0.15}}
            className="text-[11px] text-muted-foreground italic px-2 select-none shrink-0">
            No bookmarks yet. Right click to add.
          </motion.span>
        ) : (
          tree.children.map(node =>
            node.type === 'folder' ? (
              <BookmarkFolder key={node.id} folder={node as BookmarkFolderType} />
            ) : (
              <BookmarkItem key={node.id} item={node as BookmarkItemType} />
            ),
          )
        )}
      </AnimatePresence>
    </ScrollShadow>
  );
});

BookmarksBar.displayName = 'BookmarksBar';

export default BookmarksBar;
