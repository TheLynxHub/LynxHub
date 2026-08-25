import {Card, CloseButton, Tooltip} from '@heroui/react';
import {BookmarkItem as BookmarkItemType} from '@lynx_common/types/bookmarks';
import {getCacheUrl} from '@lynx_common/utils';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {EarthIcon, TrashBin2Icon} from '@solar-icons/react/bold-duotone';
import {memo, MouseEvent, useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {cardsActions} from '../../../redux/reducers/cards';
import {useTabsState} from '../../../redux/reducers/tabs';
import {AppDispatch} from '../../../redux/store';
import {useBookmarks} from '../../bookmarks/useBookmarks';

type Props = {
  bookmark: BookmarkItemType;
};

const BookmarkCard = memo(({bookmark}: Props) => {
  const activeTab = useTabsState('activeTab');
  const [imgError, setImgError] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const {removeBookmark} = useBookmarks();

  const domainFavicon = useMemo(() => {
    if (bookmark.favIcon) return bookmark.favIcon;
    if (!bookmark.url) return undefined;
    try {
      const parsed = new URL(bookmark.url);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`;
    } catch {
      return undefined;
    }
  }, [bookmark.favIcon, bookmark.url]);

  const openBookmark = useCallback(() => {
    if (bookmark.url) {
      dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: bookmark.url}));
    }
  }, [dispatch, activeTab, bookmark.url]);

  const openNewTab = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1 && bookmark.url) {
        contextMenuIpc.send.rightClickItems.newTab(bookmark.url);
      }
    },
    [bookmark.url],
  );

  const handleRemove = useCallback(
    (e: any) => {
      e?.stopPropagation?.();
      removeBookmark(bookmark.id);
    },
    [bookmark.id, removeBookmark],
  );

  const favIcon = getCacheUrl(domainFavicon);

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Card
          variant="secondary"
          onClick={openBookmark}
          onMouseUp={openNewTab}
          className="h-32 w-40 cursor-pointer shadow-none relative">
          <Card.Content className="group flex-col items-center justify-center gap-y-3 shrink-0 text-center">
            {favIcon && !imgError ? (
              <img
                src={favIcon}
                className="size-8 rounded-xl"
                alt={`${bookmark.title} icon`}
                onError={() => setImgError(true)}
              />
            ) : (
              <EarthIcon className="size-8 text-accent" />
            )}
            <span className="w-full truncate text-wrap line-clamp-1 text-sm font-medium">
              {bookmark.title || bookmark.url}
            </span>

            <CloseButton
              onPress={handleRemove}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200">
              <TrashBin2Icon className="text-warning size-3.5" />
            </CloseButton>
          </Card.Content>
        </Card>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        <p>{bookmark.title}</p>
        <p className="text-[10px] text-muted-foreground">{bookmark.url}</p>
      </Tooltip.Content>
    </Tooltip>
  );
});

BookmarkCard.displayName = 'BookmarkCard';

export default BookmarkCard;
