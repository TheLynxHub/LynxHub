import {DownloadItemInfo} from '@lynx_common/types/downloadManager';
import contextMenuIpc from '@lynx_shared/ipc/contextMenu';
import windowDialogsIpc from '@lynx_shared/ipc/dialogsWindow';
import downloadManagerIpc from '@lynx_shared/ipc/downloadManager';
import {isEmpty} from 'lodash-es';
import {useEffect} from 'react';
import {useDispatch} from 'react-redux';

import {MenuTypes} from './consts';
import {contextActions} from './redux/reducer';
import {ContextDispatch} from './redux/store';

/**
 * Custom hook to handle IPC events for showing different context menu layouts.
 * Listens for events from the main process and updates the Redux state accordingly.
 */
export default function useShowEvents() {
  const dispatch = useDispatch<ContextDispatch>();

  useEffect(() => {
    // Right Click Menu
    const offInitView = contextMenuIpc.on.rightClick((params, navHistory, contextId) => {
      const hasLinkItems = !isEmpty(params.linkURL);
      const hasImageItems = params.mediaType === 'image';
      const hasTextSelection = !isEmpty(params.selectionText);
      const hasEditItems =
        params.editFlags.canUndo ||
        params.editFlags.canRedo ||
        params.editFlags.canCut ||
        params.editFlags.canCopy ||
        params.editFlags.canPaste ||
        params.editFlags.canSelectAll;
      const isActionsAvailable = hasLinkItems || hasEditItems || hasImageItems || hasTextSelection;

      dispatch(
        contextActions.showLayout({
          key: 'rightClick',
          value: {id: contextId, contextMenuParams: params, navigationHistory: navHistory},
          layout: MenuTypes.RightClick,
        }),
      );

      dispatch(
        contextActions.updateRightClickParams({
          hasEditItems,
          hasImageItems,
          hasLinkItems,
          hasTextSelection,
          isActionsAvailable,
        }),
      );
    });

    // Zoom Control
    const offZoom = contextMenuIpc.on.zoom((id, zoomFactor) => {
      dispatch(
        contextActions.showLayout({
          key: 'browserScale',
          value: {id, factor: zoomFactor * 100},
          layout: MenuTypes.BrowserScale,
        }),
      );
    });

    // Find in Page
    const offFind = contextMenuIpc.on.find((id, selectedText) => {
      dispatch(
        contextActions.showLayout({
          key: 'targetID',
          value: id,
          layout: MenuTypes.FindInPage,
        }),
      );

      if (selectedText) {
        dispatch(contextActions.setContextState({key: 'selectedText', value: selectedText}));
      }
    });

    // Close App Confirmation
    const offCloseApp = contextMenuIpc.on.closeApp(() => {
      dispatch(
        contextActions.showLayout({
          key: 'activeLayout',
          value: MenuTypes.CloseAppConfirm,
        }),
      );
    });

    // Terminate Process Confirmation
    const offTerminateProcess = contextMenuIpc.on.terminateProcess(value => {
      dispatch(
        contextActions.showLayout({
          key: 'targetID',
          value,
          layout: MenuTypes.TerminateProcessConfirm,
        }),
      );
    });

    // Terminate Process Confirmation
    const offSendExitProcess = contextMenuIpc.on.sendExitProcess(value => {
      dispatch(
        contextActions.showLayout({
          key: 'targetID',
          value,
          layout: MenuTypes.ProcessExitSignal,
        }),
      );
    });

    // Terminate Tab Confirmation
    const offTerminateTab = contextMenuIpc.on.terminateTab(value => {
      dispatch(
        contextActions.showLayout({
          key: 'targetID',
          value,
          layout: MenuTypes.TerminateTabConfirm,
        }),
      );
    });

    // Volume Control
    const offVolume = contextMenuIpc.on.volume(value => {
      dispatch(
        contextActions.showLayout({
          key: 'browserVolume',
          value,
          layout: MenuTypes.Volume,
        }),
      );
    });

    // Downloads Menu
    const OffDownloads = contextMenuIpc.on.downloads(() => {
      dispatch(
        contextActions.showLayout({
          key: 'activeLayout',
          value: MenuTypes.Downloads,
        }),
      );
    });

    // Prompt Dialog
    const offPrompt = windowDialogsIpc.promptShow((message: string, defaultValue?: string) => {
      dispatch(
        contextActions.showLayout({
          key: 'promptWindow',
          value: {message, defaultValue},
          layout: MenuTypes.Prompt,
        }),
      );
    });

    // Alert Dialog
    const offAlert = windowDialogsIpc.alertShow((message: string) => {
      dispatch(
        contextActions.showLayout({
          key: 'alertWindow',
          value: {message},
          layout: MenuTypes.Alert,
        }),
      );
    });

    // Confirm Dialog
    const offConfirm = windowDialogsIpc.confirmShow((message: string) => {
      dispatch(
        contextActions.showLayout({
          key: 'confirmWindow',
          value: {message},
          layout: MenuTypes.Confirm,
        }),
      );
    });

    // Download manager IPC listeners
    const offDlStart = downloadManagerIpc.on.dlStart(info => {
      const newItem: DownloadItemInfo = {
        ...info,
        bytesPerSecond: 0,
        etaSecond: 0,
        percent: 0,
        receivedBytes: 0,
        status: 'downloading',
      };
      dispatch(contextActions.addDownload(newItem));
    });

    const offProgress = downloadManagerIpc.on.progress(info => {
      dispatch(contextActions.updateDownloadProgress(info));
    });

    const offDone = downloadManagerIpc.on.done(info => {
      dispatch(
        contextActions.updateDownloadStatus({
          name: info.name,
          status: info.state === 'interrupted' ? 'cancelled' : info.state,
        }),
      );
    });

    return () => {
      offZoom();
      offFind();
      offInitView();
      offCloseApp();
      offTerminateProcess();
      offSendExitProcess();
      offTerminateTab();
      offVolume();
      OffDownloads();
      offPrompt();
      offAlert();
      offConfirm();
      offDlStart();
      offProgress();
      offDone();
    };
  }, [dispatch]);
}
