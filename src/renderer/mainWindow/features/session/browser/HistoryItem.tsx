import {Card, CloseButton, Tooltip} from '@heroui/react';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {FavIcons} from '@lynx_common/types/ipc';
import {formatWebAddress, getCacheUrl, getUrlName} from '@lynx_common/utils';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import {EarthIcon} from '@solar-icons/react/bold-duotone';
import {X} from 'lucide-react';
import {memo, MouseEvent, useCallback, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

type Props = {
  recent: string;
  type: 'recent' | 'favorite';
  favIconMap: Map<string, FavIcons>;
  onDataChange: () => void;
};

const HistoryItem = memo(({recent, type, favIconMap, onDataChange}: Props) => {
  const activeTab = useTabsState('activeTab');
  const [imgError, setImgError] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  // Get favicon from the map passed by parent (no IPC call needed)
  const favItem = useMemo(() => favIconMap.get(formatWebAddress(recent)), [favIconMap, recent]);

  const favIcon = getCacheUrl(favItem?.favIcon);
  const displayName = favItem?.title || getUrlName(recent);

  const openRecent = useCallback(() => {
    dispatch(cardsActions.setRunningCardCustomAddress({tabId: activeTab, address: recent}));
  }, [dispatch, activeTab, recent]);

  const openNewTab = useCallback(
    (e: MouseEvent) => {
      if (e.button === 1) window.open(recent);
    },
    [recent],
  );

  const handleRemove = useCallback(() => {
    if (type === 'recent') {
      storageUtilsIpc.send.removeBrowserRecent(recent);
    } else {
      storageUtilsIpc.send.removeBrowserFavorite(recent);
    }
    // Notify parent to refresh data (single IPC call for all items)
    onDataChange();
  }, [type, recent, onDataChange]);

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Card
          variant="secondary"
          onClick={openRecent}
          onMouseUp={openNewTab}
          className="h-32 w-40 cursor-pointer shadow-none">
          <Card.Content className="group flex-col items-center justify-center gap-y-3 shrink-0 text-center">
            {favIcon && !imgError ? (
              <img
                src={favIcon}
                alt={`${displayName} icon`}
                className="size-8 rounded-xl"
                onError={() => setImgError(true)}
              />
            ) : (
              <EarthIcon className="size-8" />
            )}
            <span className="w-full truncate text-wrap line-clamp-1 text-sm">{displayName}</span>

            <CloseButton
              onPress={handleRemove}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200">
              <X className="text-danger size-3.5" />
            </CloseButton>
          </Card.Content>
        </Card>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow>
        <Tooltip.Arrow />
        <p>{favItem?.title || recent}</p>
      </Tooltip.Content>
    </Tooltip>
  );
});

export default HistoryItem;
