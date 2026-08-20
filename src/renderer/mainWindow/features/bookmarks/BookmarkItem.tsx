import {Avatar} from '@heroui/react';
import {BookmarkItem as BookmarkItemType} from '@lynx_common/types/bookmarks';
import {getCacheUrl, isLinux} from '@lynx_common/utils';
import bookmarkTooltipIpc from '@lynx_shared/ipc/bookmarkTooltip';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {EarthIcon} from '@solar-icons/react/bold-duotone';
import {memo, useCallback, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {cardsActions} from '../../redux/reducers/cards';
import {useTabsState} from '../../redux/reducers/tabs';
import {AppDispatch} from '../../redux/store';
import {useBookmarks} from './useBookmarks';

type Props = {
  item: BookmarkItemType;
  inDropdown?: boolean;
};

const BookmarkItem = memo(({item, inDropdown}: Props) => {
  const [imgError, setImgError] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const activeTab = useTabsState('activeTab');
  const {visibility} = useBookmarks();

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

  const handleMouseEnter = useCallback(() => {
    if (isLinux || !btnRef.current || !item.url) return;
    const rect = btnRef.current.getBoundingClientRect();
    bookmarkTooltipIpc.show({
      title: item.title,
      url: item.url,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }, [item.title, item.url]);

  const handleMouseLeave = useCallback(() => {
    if (isLinux) return;
    bookmarkTooltipIpc.hide();
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!item.url) return;
      if (e.button === 1 || e.ctrlKey || e.metaKey) {
        // Middle click or Ctrl+Click: Open in new tab
        contextMenuIpc.send.rightClickItems.newTab(item.url);
      } else if (e.button === 0) {
        // Left click: Navigate in current active tab
        dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: item.url}));
        dispatch(cardsActions.setRunningCardView({tabId: activeTab, view: 'browser'}));
      }
    },
    [item.url, activeTab, dispatch],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isLinux) bookmarkTooltipIpc.hide();

      contextMenuIpc.send.openBookmarkContextMenu(
        {
          targetType: 'bookmark',
          bookmarkId: item.id,
          title: item.title,
          url: item.url,
          bookmarksBarVisibility: visibility,
        },
        {x: e.clientX, y: e.clientY},
      );
    },
    [item.id, item.title, item.url, visibility],
  );

  const itemClass = inDropdown
    ? 'flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs ' +
      'hover:bg-default-100 dark:hover:bg-default-50/10 cursor-pointer transition-colors ' +
      'text-foreground select-none'
    : 'flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs ' +
      'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors ' +
      'text-foreground shrink-0 max-w-[180px] select-none';

  return (
    <div
      onMouseDown={e => {
        if (e.button === 1) handleClick(e);
      }}
      ref={btnRef}
      tabIndex={0}
      role="button"
      className={itemClass}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      title={isLinux && item.url ? `${item.title}\n${item.url}` : undefined}>
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

      <span className="truncate text-xs font-normal leading-none">{item.title || item.url}</span>
    </div>
  );
});

BookmarkItem.displayName = 'BookmarkItem';

export default BookmarkItem;
