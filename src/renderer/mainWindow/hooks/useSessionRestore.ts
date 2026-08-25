import {sessionActions, useSessionState} from '@lynx/redux/reducers/session';
import {AppDispatch, RootState} from '@lynx/redux/store';
import {isSameSessionState, restoreSessionSnapshot} from '@lynx/utils/sessionRestoreHelper';
import sessionIpc from '@lynx_shared/ipc/session';
import {useEffect, useRef} from 'react';
import {useDispatch, useStore} from 'react-redux';

/**
 * Hook to handle session restoration on app startup and crash detection.
 */
export default function useSessionRestore() {
  const config = useSessionState('config');
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const initializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function handleStartupRestore() {
      try {
        const crashStatus = await sessionIpc.getCrashStatus();

        if (crashStatus.hasCrashedSession && crashStatus.snapshot) {
          const state = store.getState();
          const isSame = isSameSessionState(
            {
              tabs: state.tabs.tabs,
              activeTab: state.tabs.activeTab,
              activePage: state.tabs.activePage,
              runningCards: state.cards.runningCard,
            },
            crashStatus.snapshot,
            config,
          );

          if (isSame) {
            await sessionIpc.clearCrashedSession();
            return;
          }

          if (config.restoreOnCrash === 'always') {
            restoreSessionSnapshot(crashStatus.snapshot, config, dispatch);
            await sessionIpc.clearCrashedSession();
            return;
          } else if (config.restoreOnCrash === 'ask') {
            dispatch(sessionActions.setCrashedSession(crashStatus.snapshot));
            return;
          } else {
            // 'never'
            await sessionIpc.clearCrashedSession();
          }
        }

        // Clean startup flow
        if (config.startupBehavior === 'restore_session') {
          const snapshot = (await sessionIpc.getSnapshot('last_closed')) || (await sessionIpc.getSnapshot('current'));
          if (snapshot && Array.isArray(snapshot.tabs) && snapshot.tabs.length > 0) {
            restoreSessionSnapshot(snapshot, config, dispatch);
          }
        }
      } catch (err) {
        console.warn('[SessionRestore] Error checking startup session restore:', err);
      }
    }

    handleStartupRestore();
  }, [config, dispatch]);
}
