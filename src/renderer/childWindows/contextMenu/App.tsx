import {useElementResizing} from '@lynx/utils/hooks';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {useEffect} from 'react';

import {MenuTypes} from './consts';
import BrowserScale from './layouts/BrowserScale';
import CloseApp from './layouts/confirm_warn/CloseApp';
import ProcessExitSignal from './layouts/confirm_warn/ProcessExitSignal';
import TerminateProcess from './layouts/confirm_warn/TerminateProcess';
import TerminateTab from './layouts/confirm_warn/TerminateTab';
import DownloadMenu from './layouts/downloads';
import FindInPage from './layouts/FindInPage';
import RightClick from './layouts/right_click';
import VolumeMenu from './layouts/Volume';
import AlertWindow from './layouts/window_dialogs/Alert';
import ConfirmWindow from './layouts/window_dialogs/Confirm';
import PromptWindow from './layouts/window_dialogs/Prompt';
import {useContextState} from './redux/reducer';
import useShowEvents from './useShowEvents';

/**
 * Main Context Menu component.
 * Renders different layouts based on the active layout state.
 * Handles window resizing based on content.
 */
export default function ContextMenu() {
  const activeLayout = useContextState('activeLayout');
  const containerRef = useElementResizing(contextMenuIpc.send.resizeWindow);

  useShowEvents();

  useEffect(() => {
    return contextMenuIpc.on.requestShow(() => {
      // We must wait for React to finish its layout and the DOM to be updated.
      // We'll use a small timeout to ensure ResizeObserver has a chance to fire
      // and state reconciliation is fully applied.
      setTimeout(() => {
        const element = containerRef.current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const width = Math.max(Math.ceil(element.scrollWidth), Math.ceil(rect.width));
        const height = Math.max(Math.ceil(element.scrollHeight), Math.ceil(rect.height));

        const dpr = window.devicePixelRatio || 1;
        contextMenuIpc.send.showReady({width, height, dpr, x: rect.x, y: rect.y});
      }, 10);
    });
  }, [containerRef]);

  return (
    <div ref={containerRef} className={`flex size-fit flex-col overflow-hidden bg-surface`}>
      {activeLayout === MenuTypes.BrowserScale && <BrowserScale />}
      {activeLayout === MenuTypes.FindInPage && <FindInPage />}
      {activeLayout === MenuTypes.RightClick && <RightClick />}
      {activeLayout === MenuTypes.CloseAppConfirm && <CloseApp />}
      {activeLayout === MenuTypes.TerminateProcessConfirm && <TerminateProcess />}
      {activeLayout === MenuTypes.TerminateTabConfirm && <TerminateTab />}
      {activeLayout === MenuTypes.Volume && <VolumeMenu />}
      {activeLayout === MenuTypes.Downloads && <DownloadMenu />}
      {activeLayout === MenuTypes.Prompt && <PromptWindow />}
      {activeLayout === MenuTypes.Alert && <AlertWindow />}
      {activeLayout === MenuTypes.Confirm && <ConfirmWindow />}
      {activeLayout === MenuTypes.ProcessExitSignal && <ProcessExitSignal />}
    </div>
  );
}
