import {Avatar, ScrollShadow} from '@heroui/react';
import {BookmarkFolder, BookmarkItem as BookmarkItemType, BookmarkNode} from '@lynx_common/types/bookmarks';
import {getCacheUrl} from '@lynx_common/utils';
import bookmarksIpc from '@lynx_shared/ipc/bookmarks';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {
  AltArrowLeftIcon,
  AltArrowRightIcon,
  EarthIcon,
  FolderIcon,
  FolderOpenIcon,
} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useEffect, useMemo, useState} from 'react';

import {useContextState} from '../redux/reducer';
import Separator from './right_click/Separator';
import {ActionButton, createActionHandler} from './right_click/Utils';

type BookmarkRowProps = {
  item: BookmarkItemType;
};

const BookmarkRow = memo(function BookmarkRow({item}: BookmarkRowProps) {
  const [imgError, setImgError] = useState(false);

  const domainFavicon = useMemo(() => {
    if (item.favIcon) return item.favIcon;
    if (!item.url) return undefined;
    try {
      const parsed = new URL(item.url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
    } catch {
      return undefined;
    }
  }, [item.favIcon, item.url]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!item.url) return;
      const isNewTab = e.button === 1 || e.ctrlKey || e.metaKey;
      bookmarksIpc.openBookmark({url: item.url, newTab: isNewTab});
      contextMenuIpc.send.hideWindow();
    },
    [item.url],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      contextMenuIpc.send.openBookmarkContextMenu(
        {
          targetType: 'bookmark',
          bookmarkId: item.id,
          title: item.title,
          url: item.url,
          parentId: item.parentId,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [item.id, item.title, item.url, item.parentId],
  );

  return (
    <div
      onMouseDown={e => {
        if (e.button === 1) handleClick(e);
      }}
      className={
        'w-full hover:bg-surface-tertiary transition-colors duration-100 py-2 px-2.5 gap-x-2.5 ' +
        'flex items-center text-xs text-foreground cursor-pointer shrink-0 rounded-xl select-none min-w-0'
      }
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}>
      <div className="shrink-0 size-4 flex items-center justify-center">
        {domainFavicon && !imgError ? (
          <Avatar className="size-3.5 rounded-none bg-transparent">
            <Avatar.Image alt={item.title} src={getCacheUrl(domainFavicon)} onError={() => setImgError(true)} />
            <Avatar.Fallback className="bg-transparent">
              <EarthIcon className="size-3.5 text-muted-foreground" />
            </Avatar.Fallback>
          </Avatar>
        ) : (
          <EarthIcon className="size-3.5 text-muted-foreground" />
        )}
      </div>
      <span className="truncate text-xs font-normal leading-none flex-1 min-w-0">{item.title || item.url}</span>
    </div>
  );
});

type FolderRowProps = {
  folder: BookmarkFolder;
  onDrillDown: (folderId: string) => void;
};

const FolderRow = memo(function FolderRow({folder, onDrillDown}: FolderRowProps) {
  const handleClick = useCallback(() => {
    onDrillDown(folder.id);
  }, [folder.id, onDrillDown]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      contextMenuIpc.send.openBookmarkContextMenu(
        {
          targetType: 'folder',
          folderId: folder.id,
          title: folder.title,
          parentId: folder.parentId,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [folder.id, folder.title, folder.parentId],
  );

  return (
    <div
      className={
        'w-full hover:bg-surface-tertiary transition-colors duration-100 py-2 px-2.5 gap-x-2.5 ' +
        'flex items-center text-xs text-foreground cursor-pointer shrink-0 rounded-xl select-none min-w-0'
      }
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}>
      <FolderIcon className="size-4 text-warning shrink-0" />
      <span className="truncate text-xs font-medium leading-none flex-1 min-w-0">{folder.title}</span>
      <AltArrowRightIcon className="size-3.5 text-muted-foreground shrink-0" />
    </div>
  );
});

/**
 * Layout for displaying bookmark folder contents inside the context menu child window.
 * Supports recursive folder drill-down, open-all actions, and right-click menus.
 */
export default function BookmarkFolderMenu() {
  const payload = useContextState('bookmarkFolderMenu');
  const [tree, setTree] = useState<BookmarkFolder | null>(null);
  const [allNodes, setAllNodes] = useState<BookmarkNode[]>([]);
  const [folderStack, setFolderStack] = useState<string[]>(payload?.folderId ? [payload.folderId] : []);

  const refreshData = useCallback(async () => {
    try {
      const [treeData, allData] = await Promise.all([bookmarksIpc.getTree(), bookmarksIpc.getAll()]);
      setTree(treeData);
      setAllNodes(allData);
    } catch (err) {
      console.error('Failed to load bookmarks in folder menu:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
    return bookmarksIpc.on.changed(refreshData);
  }, [refreshData]);

  useEffect(() => {
    if (payload?.folderId) {
      setFolderStack([payload.folderId]);
    }
  }, [payload?.folderId]);

  const currentFolderId = folderStack[folderStack.length - 1];

  const findFolderInTree = useCallback((node: BookmarkFolder | null, id: string): BookmarkFolder | null => {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children) {
      if (child.type === 'folder') {
        const found = findFolderInTree(child as BookmarkFolder, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const currentFolder = useMemo(() => {
    if (!tree || !currentFolderId) return null;
    return findFolderInTree(tree, currentFolderId);
  }, [tree, currentFolderId, findFolderInTree]);

  const parentFolderTitle = useMemo(() => {
    if (folderStack.length <= 1) return null;
    const parentId = folderStack[folderStack.length - 2];
    const parentNode = allNodes.find(n => n.id === parentId);
    return parentNode?.title || 'Back';
  }, [folderStack, allNodes]);

  const handleDrillDown = useCallback((folderId: string) => {
    setFolderStack(prev => [...prev, folderId]);
  }, []);

  const handleGoBack = useCallback(() => {
    setFolderStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleOpenAllInTabs = createActionHandler(() => {
    if (!currentFolder) return;
    currentFolder.children.forEach(child => {
      if (child.type === 'bookmark' && child.url) {
        bookmarksIpc.openBookmark({url: child.url, newTab: true});
      }
    });
  });

  const hasBookmarks = currentFolder ? currentFolder.children.some(c => c.type === 'bookmark' && c.url) : false;

  return (
    <div className="overflow-hidden px-1.5 flex flex-col gap-y-1 py-2 min-w-[230px] max-w-[320px]">
      {folderStack.length > 1 && (
        <>
          <div
            className={
              'w-full hover:bg-surface-tertiary transition-colors duration-100 py-1.5 px-2.5 gap-x-2 ' +
              'flex items-center text-xs text-primary font-medium cursor-pointer shrink-0 rounded-xl select-none'
            }
            tabIndex={0}
            role="button"
            onClick={handleGoBack}>
            <AltArrowLeftIcon className="size-3.5 shrink-0" />
            <span className="truncate">Back to {parentFolderTitle}</span>
          </div>
          <Separator />
        </>
      )}

      {hasBookmarks && (
        <>
          <ActionButton
            title="Open All in Tabs"
            onPress={handleOpenAllInTabs}
            className="text-xs py-2 text-primary"
            icon={<FolderOpenIcon className="size-4 text-primary" />}
          />
          <Separator />
        </>
      )}

      {!currentFolder || currentFolder.children.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground italic select-none">Empty folder</div>
      ) : (
        <ScrollShadow size={24} orientation="vertical" className="max-h-72 flex flex-col gap-0.5" hideScrollBar>
          {currentFolder.children.map(child =>
            child.type === 'folder' ? (
              <FolderRow key={child.id} onDrillDown={handleDrillDown} folder={child as BookmarkFolder} />
            ) : (
              <BookmarkRow key={child.id} item={child as BookmarkItemType} />
            ),
          )}
        </ScrollShadow>
      )}
    </div>
  );
}
