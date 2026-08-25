import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import {useCallback, useEffect, useRef, useState} from 'react';

import {MenuTypes} from './consts';
import BookmarkContextMenu from './layouts/BookmarkContextMenu';
import BookmarkEditMenu from './layouts/BookmarkEditMenu';
import BookmarkFolderMenu from './layouts/BookmarkFolderMenu';
import BookmarkTooltip from './layouts/BookmarkTooltip';
import BrowserScale from './layouts/BrowserScale';
import CloseApp from './layouts/confirm_warn/CloseApp';
import ForceReload from './layouts/confirm_warn/ForceReload';
import ProcessExitSignal from './layouts/confirm_warn/ProcessExitSignal';
import TerminateMultipleTabs from './layouts/confirm_warn/TerminateMultipleTabs';
import TerminateProcess from './layouts/confirm_warn/TerminateProcess';
import TerminateTab from './layouts/confirm_warn/TerminateTab';
import DownloadMenu from './layouts/downloads';
import FindInPage from './layouts/FindInPage';
import LinkPreview from './layouts/LinkPreview';
import QuickWebSwitcher from './layouts/QuickWebSwitcher';
import RightClick from './layouts/right_click';
import ShareScreen from './layouts/share_screen/ShareScreen';
import TabContextMenu from './layouts/TabContextMenu';
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
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  useShowEvents();

  useEffect(() => {
    if (!element) return;

    const sendResize = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(Math.ceil(element.scrollWidth), Math.ceil(rect.width));
      const height = Math.max(Math.ceil(element.scrollHeight), Math.ceil(rect.height));

      if (width < 1 || height < 1) return;

      const dpr = window.devicePixelRatio || 1;
      contextMenuIpc.send.resizeWindow({width, height, dpr, x: rect.x, y: rect.y});
    };

    const resizeObserver = new ResizeObserver(() => {
      sendResize();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [element]);

  useEffect(() => {
    return contextMenuIpc.on.requestShow(() => {
      // We must wait for React to finish its layout and the DOM to be updated.
      // We'll use a small timeout to ensure ResizeObserver has a chance to fire
      // and state reconciliation is fully applied.
      setTimeout(() => {
        const node = elementRef.current;
        if (!node) return;

        const rect = node.getBoundingClientRect();
        const width = Math.max(Math.ceil(node.scrollWidth), Math.ceil(rect.width));
        const height = Math.max(Math.ceil(node.scrollHeight), Math.ceil(rect.height));

        const dpr = window.devicePixelRatio || 1;
        contextMenuIpc.send.showReady({width, height, dpr, x: rect.x, y: rect.y});
      }, 10);
    });
  }, []);

  if (!activeLayout) return null;

  if (activeLayout === MenuTypes.ShareScreen) {
    return <ShareScreen />;
  }

  if (activeLayout === MenuTypes.BookmarkTooltip) {
    return <BookmarkTooltip />;
  }

  if (activeLayout === MenuTypes.LinkPreview) {
    return <LinkPreview />;
  }

  return (
    <div
      className={
        'flex size-fit flex-col overflow-hidden rounded-2xl border border-border ' +
        'bg-surface text-foreground shadow-2xl'
      }
      ref={containerRef}>
      {activeLayout === MenuTypes.BrowserScale && <BrowserScale />}
      {activeLayout === MenuTypes.FindInPage && <FindInPage />}
      {activeLayout === MenuTypes.RightClick && <RightClick />}
      {activeLayout === MenuTypes.CloseAppConfirm && <CloseApp />}
      {activeLayout === MenuTypes.TerminateProcessConfirm && <TerminateProcess />}
      {activeLayout === MenuTypes.TerminateTabConfirm && <TerminateTab />}
      {activeLayout === MenuTypes.TerminateMultipleTabsConfirm && <TerminateMultipleTabs />}
      {activeLayout === MenuTypes.Volume && <VolumeMenu />}
      {activeLayout === MenuTypes.Downloads && <DownloadMenu />}
      {activeLayout === MenuTypes.Prompt && <PromptWindow />}
      {activeLayout === MenuTypes.Alert && <AlertWindow />}
      {activeLayout === MenuTypes.Confirm && <ConfirmWindow />}
      {activeLayout === MenuTypes.ProcessExitSignal && <ProcessExitSignal />}
      {activeLayout === MenuTypes.ForceReloadConfirm && <ForceReload />}
      {activeLayout === MenuTypes.BookmarkContextMenu && <BookmarkContextMenu />}
      {activeLayout === MenuTypes.BookmarkFolderMenu && <BookmarkFolderMenu />}
      {activeLayout === MenuTypes.BookmarkEditMenu && <BookmarkEditMenu />}
      {activeLayout === MenuTypes.TabContextMenu && <TabContextMenu />}
      {activeLayout === MenuTypes.QuickWebSwitcher && <QuickWebSwitcher />}
    </div>
  );
}
