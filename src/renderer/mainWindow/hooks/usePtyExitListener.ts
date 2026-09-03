import {useTerminalState} from '@lynx/redux/reducers/terminal';
import ptyIpc from '@lynx_shared/ipc/pty';
import {useEffect, useLayoutEffect, useRef} from 'react';

import {useRemoveTab} from '../layouts/tabs/utils';

/**
 * Application-level listener for PTY exit events.
 * Closes the associated tab when a terminal process exits if closeTabOnExit is enabled.
 */
export default function usePtyExitListener(): void {
  const closeTabOnExit = useTerminalState('closeTabOnExit');
  const removeTab = useRemoveTab();

  const removeTabRef = useRef(removeTab);
  const closeTabOnExitRef = useRef(closeTabOnExit);

  useLayoutEffect(() => {
    removeTabRef.current = removeTab;
    closeTabOnExitRef.current = closeTabOnExit;
  });

  useEffect(() => {
    const removeListener = ptyIpc.onExit(id => {
      if (closeTabOnExitRef.current) {
        removeTabRef.current({id});
      }
    });

    return () => removeListener();
  }, []);
}
