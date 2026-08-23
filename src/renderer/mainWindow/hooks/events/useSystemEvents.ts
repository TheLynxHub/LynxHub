import {appActions} from '@lynx/redux/reducers/app';
import {cardsActions} from '@lynx/redux/reducers/cards';
import {hotkeysActions} from '@lynx/redux/reducers/hotkeys';
import {settingsActions} from '@lynx/redux/reducers/settings';
import {tabsActions, useTabsState} from '@lynx/redux/reducers/tabs';
import {AppDispatch} from '@lynx/redux/store';
import {PageTitleByPageId} from '@lynx_common/consts';
import applicationIpc from '@lynx_shared/ipc/application';
import browserIpc from '@lynx_shared/ipc/browser';
import ptyIpc from '@lynx_shared/ipc/pty';
import storageIpc, {storageUtilsIpc} from '@lynx_shared/ipc/storage';
import utilsIpc from '@lynx_shared/ipc/utils';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {bottomToast, topToast} from '../../layouts/ToastProviders';

/**
 * Handles online status events.
 */
export const useOnlineEvents = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const offOnline = applicationIpc.on.onOnline(isOnline => {
      dispatch(appActions.setAppState({key: 'isOnline', value: isOnline}));
    });

    return () => offOnline();
  }, [dispatch]);
};

/**
 * Fetches initial storage data (like last active page).
 */
export const useStorageData = () => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    storageIpc.get('app').then(app => {
      const startupBehavior = app.sessionRestore?.startupBehavior || (app.startupLastActivePage ? 'last_page' : 'home');
      if (startupBehavior === 'last_page') {
        const lastPage = app.lastPage;
        if (lastPage) {
          dispatch(
            tabsActions.setActivePage({
              pageID: lastPage,
              title: PageTitleByPageId[lastPage] || 'Page',
              isTerminal: false,
            }),
          );
        }
      }
    });
  }, [dispatch]);
};

/**
 * Handles toast notifications from the main process.
 */
export const useShowToast = () => {
  useEffect(() => {
    const removeListener = applicationIpc.on.onShowToast((message, type, placement) => {
      switch (placement || 'top') {
        case 'top':
          topToast[type](message);
          break;
        case 'bottom':
          bottomToast[type](message);
          break;
      }
    });

    return () => removeListener();
  }, []);
};

/**
 * Syncs hotkey configuration from the main process.
 */
export const useHotkeyEvents = () => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const removeListener = applicationIpc.on.onHotkeysChange(input => {
      dispatch(hotkeysActions.setInput(input));
    });

    return () => removeListener();
  }, [dispatch]);
};

/**
 * Central hub for general application state synchronization and IPC events.
 */
export const useIpcEvents = () => {
  const activeTab = useTabsState('activeTab');
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const removeListener_onInstalledCards = storageUtilsIpc.on.onInstalledCards(cards => {
      dispatch(cardsActions.setInstalledCards(cards));
    });
    const removeListener_onAutoUpdateCards = storageUtilsIpc.on.onAutoUpdateCards(cards => {
      dispatch(cardsActions.setAutoUpdate(cards));
    });
    const removeListener_onAutoUpdateExtensions = storageUtilsIpc.on.onAutoUpdateExtensions(cards => {
      dispatch(cardsActions.setAutoUpdateExtensions(cards));
    });
    const removeListener_onPinnedCardsChange = storageUtilsIpc.on.onPinnedCardsChange(cards => {
      dispatch(cardsActions.setPinnedCards(cards));
    });
    const removeListener_onRecentlyUsedCardsChange = storageUtilsIpc.on.onRecentlyUsedCardsChange(cards => {
      dispatch(cardsActions.setRecentlyUsedCards(cards));
    });
    const removeListener_onHomeCategory = storageUtilsIpc.on.onHomeCategory(data => {
      dispatch(cardsActions.setHomeCategory(data));
    });

    const removeListener_onDarkMode = applicationIpc.on.darkMode(isDark => {
      dispatch(appActions.setAppState({key: 'darkMode', value: isDark}));
    });

    const removeListener_onChangeState = applicationIpc.on.windowStateChange(state => {
      const {name, value} = state;
      switch (name) {
        case 'focus':
          dispatch(appActions.setAppState({key: 'onFocus', value}));
          break;
        case 'maximize':
          dispatch(appActions.setAppState({key: 'maximized', value}));
          break;
        case 'fullscreen':
          dispatch(appActions.setAppState({key: 'fullscreen', value}));
          break;
      }
    });

    const removeListener_onConfirmChange = storageUtilsIpc.on.onConfirmChange((type, enable) => {
      dispatch(settingsActions.setSettingsState({key: type, value: enable}));
    });

    const offDomReady = browserIpc.on.domReady((id, isReady) => {
      if (isReady) dispatch(cardsActions.addDomReady(id));
    });

    return () => {
      removeListener_onInstalledCards();
      removeListener_onAutoUpdateCards();
      removeListener_onAutoUpdateExtensions();
      removeListener_onPinnedCardsChange();
      removeListener_onRecentlyUsedCardsChange();
      removeListener_onHomeCategory();
      removeListener_onDarkMode();
      removeListener_onChangeState();
      removeListener_onConfirmChange();
      offDomReady();
    };
  }, [dispatch]);

  useEffect(() => {
    const removeListener = utilsIpc.onUpdateAllExtensions(updateInfo => {
      if (updateInfo.step === 'done') {
        ptyIpc.process(updateInfo.id, updateInfo.id);
        storageUtilsIpc.invoke.recentlyUsedCards('update', updateInfo.id);
        dispatch(cardsActions.addRunningCard({id: updateInfo.id, tabId: activeTab}));
        dispatch(cardsActions.setUpdatingExtensions(undefined));
      }
      dispatch(cardsActions.setUpdatingExtensions(updateInfo));
    });

    return () => removeListener();
  }, [dispatch, activeTab]);
};
