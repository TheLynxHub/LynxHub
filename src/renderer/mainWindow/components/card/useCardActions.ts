import {UseOverlayStateReturn} from '@heroui/react';
import {extensionRendererApi} from '@lynx/plugins/extensions/loader';
import {getCardMethod, useAllCardMethods} from '@lynx/plugins/modules';
import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {useInstalledCard, useIsAutoUpdateExtensions, useUpdateAvailable, useUpdatingCard} from '@lynx/utils/hooks';
import ptyIpc from '@lynx_shared/ipc/pty';
import {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import utilsIpc from '@lynx_shared/ipc/utils';
import AddBreadcrumb_Renderer from '@lynx_shared/sentry/Breadcrumbs';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useDispatch} from 'react-redux';

import {useCardStore} from './store';

/**
 * Custom hook to handle card actions like starting, installing, and updating.
 */
export const useCardActions = (state: UseOverlayStateReturn, setType: (type: 'install' | 'update') => void) => {
  const dispatch = useDispatch<AppDispatch>();
  const allMethods = useAllCardMethods();

  const id = useCardStore(state => state.id);
  const extensionsDir = useCardStore(state => state.extensionsDir);

  const activeTab = useTabsState('activeTab');
  const runningCard = useCardsState('runningCard');
  const updatingExtensions = useCardsState('updatingExtensions');

  const card = useInstalledCard(id);
  const updating = useUpdatingCard(id);
  const updateAvailable = useUpdateAvailable(id);
  const autoUpdateExtensions = useIsAutoUpdateExtensions(id);

  const [isUpdatingExtensions, setIsUpdatingExtensions] = useState<boolean>(false);
  const [updateCount, setUpdateCount] = useState<string>('');

  const isRunning = useMemo(() => runningCard.some(item => item.id === id), [runningCard, id]);

  useEffect(() => {
    if (updatingExtensions && updatingExtensions.id === id) {
      if (updatingExtensions.step === 'done') {
        setIsUpdatingExtensions(false);
      } else {
        setUpdateCount(updatingExtensions.step);
      }
    }
  }, [updatingExtensions, id]);

  const startAi = useCallback(() => {
    extensionRendererApi.events.emit('before_card_start', {id});

    if (autoUpdateExtensions && card) {
      AddBreadcrumb_Renderer(`Updating AI Extensions ${id}`);
      utilsIpc.updateAllExtensions({id, dir: card.dir! + extensionsDir!});
      setIsUpdatingExtensions(true);
    } else {
      ptyIpc.process(id, id);
      storageUtilsIpc.invoke.recentlyUsedCards('update', id);
      dispatch(cardsActions.addRunningCard({tabId: activeTab, id}));
    }
  }, [id, autoUpdateExtensions, activeTab, dispatch, card, extensionsDir]);

  const install = useCallback(() => {
    AddBreadcrumb_Renderer(`Start Installing AI ${id}`);
    if (getCardMethod(allMethods, id, 'manager')) {
      extensionRendererApi.events.emit('before_card_install', {id});
      setType('install');
      state.open();
    }
  }, [id, allMethods, setType, state]);

  const openSession = useCallback(() => {
    if (!card?.dir) return;
    AddBreadcrumb_Renderer(`Open Session in card directory: ${id}`);
    dispatch(
      cardsActions.addRunningEmpty({
        tabId: activeTab,
        type: 'both',
        dir: card.dir,
      }),
    );
  }, [id, activeTab, dispatch, card?.dir]);

  return {
    startAi,
    install,
    openSession,
    isRunning,
    updating,
    updateAvailable,
    isUpdatingExtensions,
    updateCount,
  };
};
