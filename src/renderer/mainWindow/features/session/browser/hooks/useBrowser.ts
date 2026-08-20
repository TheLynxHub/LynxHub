import {useIsActiveTab} from '@lynx/layouts/tabs/utils';
import {cardsActions, useCardsState} from '@lynx/redux/reducers/cards';
import {useVolumeState} from '@lynx/redux/reducers/volume';
import {AppDispatch} from '@lynx/redux/store';
import {RunningCard} from '@lynx/types';
import browserIpc from '@lynx_shared/ipc/browser';
import {isEmpty} from 'lodash-es';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch} from 'react-redux';

import {triggerActions, useTriggerState} from '../../../../redux/reducers/triggers';
import {FailedLoad} from '../BrowserError';

export function useBrowser(runningCard: RunningCard) {
  const {currentView, id, webUIAddress, customAddress, type, tabId} = runningCard;
  const dispatch = useDispatch<AppDispatch>();
  const isActiveTab = useIsActiveTab(tabId);
  const browserDomReadyIds = useCardsState('browserDomReadyIds');
  const tabVolumes = useVolumeState('tabVolumes');
  const tabMuted = useVolumeState('tabMuted');
  const globalMuted = useVolumeState('globalMuted');
  const clearBrowserFail = useTriggerState('clearBrowserFail');

  const volumeAppliedRef = useRef(false);

  const [failedLoad, setFailedLoad] = useState<FailedLoad | undefined>(undefined);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  const isDomReady = useMemo(() => browserDomReadyIds.includes(id), [browserDomReadyIds, id]);

  const finalAddress = useMemo(() => customAddress || webUIAddress, [customAddress, webUIAddress]);
  const previousFinalAddress = useRef<string>('');

  useEffect(() => {
    if (clearBrowserFail) {
      setFailedLoad(undefined);
      dispatch(triggerActions.clear('clearBrowserFail'));
    }
  }, [clearBrowserFail]);

  useEffect(() => {
    // Only load URL if finalAddress actually changed (not just from redirect sync)
    if (finalAddress !== previousFinalAddress.current) {
      previousFinalAddress.current = finalAddress;

      if (finalAddress) {
        // Load the URL when finalAddress changes from user action
        browserIpc.send.loadURL(id, finalAddress);
      } else {
        // Load about:blank to establish navigation history entry for empty page
        browserIpc.send.loadURL(id, 'about:blank');
      }
    }
  }, [id, finalAddress]);

  useEffect(() => {
    if (isActiveTab) browserIpc.send.focusWebView(id);
  }, [isActiveTab, id]);

  // Apply volume settings when browser becomes dom-ready
  useEffect(() => {
    if (isDomReady && !volumeAppliedRef.current) {
      volumeAppliedRef.current = true;

      const applyVolumeSettings = async () => {
        const tabVolume = tabVolumes[tabId] ?? 100;
        const isTabMuted = tabMuted[tabId] || false;

        // These calls may silently fail during page load - that's expected
        await browserIpc.invoke.setVolume(id, tabVolume);

        // Apply effective mute (tab muted OR global muted)
        const effectiveMute = isTabMuted || globalMuted;
        await browserIpc.invoke.setMuted(id, effectiveMute);
      };

      applyVolumeSettings();
    }
  }, [isDomReady, id, tabId, tabVolumes, tabMuted, globalMuted]);

  useEffect(() => {
    const offFailed = browserIpc.on.failedLoadUrl((targetID, errorCode, errorDescription, validatedURL) => {
      if (targetID === id) {
        setFailedLoad({errorCode, errorDescription, validatedURL});
      }
    });

    const offClearFailed = browserIpc.on.clearFailed(targetID => {
      if (targetID === id) setFailedLoad(undefined);
    });

    const offUrlChange = browserIpc.on.urlChanged((targetID, url) => {
      if (targetID === id) {
        setCurrentUrl(url);
        // Sync customAddress with actual browser URL for back/forward navigation
        // But don't sync during redirects - only sync when user explicitly navigates
        if (url === 'about:blank' && customAddress) {
          // Clear customAddress when navigating back to blank page
          dispatch(cardsActions.setRunningCardCustomAddress({tabId, address: ''}));
          previousFinalAddress.current = '';
        } else if (url !== 'about:blank' && customAddress !== url) {
          // Only update if this is a back/forward navigation, not a redirect
          // Check if the URL is significantly different (not just a redirect in the same domain)
          try {
            const currentOrigin = new URL(url).origin;
            const customOrigin = customAddress ? new URL(customAddress).origin : '';
            const isBackForwardNav = !customAddress || currentOrigin !== customOrigin;

            if (isBackForwardNav) {
              dispatch(cardsActions.setRunningCardCustomAddress({tabId, address: url}));
              previousFinalAddress.current = url;
            }
          } catch {
            // If URL parsing fails, treat as back/forward navigation
            dispatch(cardsActions.setRunningCardCustomAddress({tabId, address: url}));
            previousFinalAddress.current = url;
          }
        }
      }
    });

    return () => {
      offFailed();
      offClearFailed();
      offUrlChange();
    };
  }, [id, customAddress, tabId, dispatch]);

  useEffect(() => {
    const validAddress = !isEmpty(runningCard.customAddress || runningCard.webUIAddress) && !failedLoad;
    const isOnBlankPage = currentUrl === 'about:blank';
    const shouldShowWebview = validAddress && !isOnBlankPage && isActiveTab && runningCard.currentView === 'browser';
    browserIpc.send.setVisible(runningCard.id, shouldShowWebview);
  }, [runningCard, isActiveTab, failedLoad, currentUrl]);

  const handleReload = useCallback(() => {
    browserIpc.send.reload(id);
  }, [id]);

  useEffect(() => {
    if (currentView === 'browser' && isActiveTab) browserIpc.send.focus(id);
  }, [currentView, id, isActiveTab]);

  const showEmptyPage = isEmpty(finalAddress) || currentUrl === 'about:blank';

  return {
    failedLoad,
    handleReload,
    showEmptyPage,
    currentView,
    type,
  };
}
