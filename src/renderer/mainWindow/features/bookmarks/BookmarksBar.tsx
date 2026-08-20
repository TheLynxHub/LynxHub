import {ScrollShadow} from '@heroui/react';
import {RunningCard} from '@lynx/types';
import {
  BookmarkFolder as BookmarkFolderType,
  BookmarkItem as BookmarkItemType,
  BookmarkNode,
} from '@lynx_common/types/bookmarks';
import {isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {AnimatePresence, motion, Reorder, Transition, Variants} from 'framer-motion';
import {memo, useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {bookmarksActions} from '../../redux/reducers/bookmarks';
import {AppDispatch} from '../../redux/store';
import BookmarkFolder from './BookmarkFolder';
import BookmarkItem from './BookmarkItem';
import {useBookmarks} from './useBookmarks';

type Props = {
  runningCard?: RunningCard;
  className?: string;
};

const itemVariants: Variants = {
  initial: {opacity: 0, scale: 0.85},
  animate: {opacity: 1, scale: 1},
  exit: {opacity: 0, scale: 0.8},
};

const itemTransition: Transition = {
  layout: {type: 'spring', stiffness: 500, damping: 30},
  opacity: {duration: 0.15},
  scale: {duration: 0.15},
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
  const {tree, visibility, reorderBookmarks} = useBookmarks();
  const dispatch = useDispatch<AppDispatch>();

  const isVisible = isBookmarksBarVisible(visibility, runningCard);
  const [localNodes, setLocalNodes] = useState<BookmarkNode[]>(tree.children);
  const [isOrdering, setIsOrdering] = useState(false);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalNodes(tree.children);
    }
  }, [tree.children]);

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

  const onReorder = useCallback((newNodes: BookmarkNode[]) => {
    isDraggingRef.current = true;
    setIsOrdering(true);
    setLocalNodes(newNodes);
  }, []);

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true;
    setIsOrdering(true);
  }, []);

  const handleReorderEnd = useCallback(() => {
    setTimeout(() => {
      isDraggingRef.current = false;
      setIsOrdering(false);
    }, 150);

    const isOrderChanged = localNodes.some((node, index) => node.id !== tree.children[index]?.id);
    if (isOrderChanged) {
      // Immediately update local redux tree to prevent visual jump
      dispatch(
        bookmarksActions.setTree({
          ...tree,
          children: localNodes,
        }),
      );

      // Persist new order via IPC
      const reorderedPayload = localNodes.map((node, index) => ({
        id: node.id,
        order: index,
        parentId: node.parentId || 'bookmarks_bar',
      }));
      reorderBookmarks(reorderedPayload);
    }
  }, [localNodes, tree, dispatch, reorderBookmarks]);

  if (!isVisible) return null;

  return (
    <ScrollShadow
      className={
        (runningCard ? 'absolute top-10 left-0 right-0 z-10 ' : 'w-full mb-1 shrink-0 rounded-xl ') +
        'h-8 px-2 flex items-center bg-surface select-none ' +
        (className || '')
      }
      size={24}
      role="toolbar"
      ref={containerRef}
      onWheel={handleWheel}
      orientation="horizontal"
      aria-label="Bookmarks bar"
      onContextMenu={handleBarContextMenu}
      hideScrollBar>
      <AnimatePresence initial={false} mode="popLayout">
        {localNodes.length === 0 ? (
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
          <Reorder.Group
            axis="x"
            as="div"
            values={localNodes}
            onReorder={onReorder}
            onMouseUp={handleReorderEnd}
            className="flex items-center gap-1 h-full min-w-0">
            {localNodes.map(node => (
              <Reorder.Item
                as="div"
                exit="exit"
                value={node}
                key={node.id}
                layout="position"
                initial="initial"
                animate="animate"
                dragElastic={0.05}
                dragMomentum={false}
                variants={itemVariants}
                transition={itemTransition}
                onDragEnd={handleReorderEnd}
                onDragStart={handleDragStart}
                className="relative shrink-0"
                dragConstraints={containerRef}>
                {node.type === 'folder' ? (
                  <BookmarkFolder isOrdering={isOrdering} folder={node as BookmarkFolderType} />
                ) : (
                  <BookmarkItem isOrdering={isOrdering} item={node as BookmarkItemType} />
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </AnimatePresence>
    </ScrollShadow>
  );
});

BookmarksBar.displayName = 'BookmarksBar';

export default BookmarksBar;
