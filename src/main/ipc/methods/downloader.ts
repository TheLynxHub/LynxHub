// Downloader IPC methods - Handles file downloads with progress tracking
import path from 'node:path';

import {utilsIpc} from '@lynx_main/ipc/utils';
import classHolder from '@lynx_main/managers/classHolder';
import {app, DownloadItem, net} from 'electron';
import {download} from 'electron-dl';

// Tracks the currently active download item.
// Note: This implementation currently supports tracking only one download at a time via IPC cancellation.
let currentDownloadItem: DownloadItem | undefined;

/**
 * Initiates a file download from a URL.
 * @param url - The URL of the file to download.
 */
export function downloadFile(url: string): void {
  const {appManager} = classHolder;
  const window = appManager?.getMainWindow();

  if (!window) {
    console.error('Failed to download file: window object is undefined!');
    utilsIpc.send.onDownloadFile({
      stage: 'failed',
    });
    return;
  }

  // Cancel any existing download before starting a new one
  if (currentDownloadItem) {
    try {
      currentDownloadItem.cancel();
    } catch {
      // Ignore error during cancellation
    }
    currentDownloadItem = undefined;
  }

  if (net && typeof net.isOnline === 'function' && !net.isOnline()) {
    console.warn('Cannot download file: network is offline');
    utilsIpc.send.onDownloadFile({
      stage: 'failed',
    });
    return;
  }

  let hasFailed = false;

  const notifyFailure = (err?: unknown) => {
    if (hasFailed) return;
    hasFailed = true;
    if (err) {
      console.error('Failed to download file: ', err);
    }
    utilsIpc.send.onDownloadFile({
      stage: 'failed',
    });
    if (currentDownloadItem) {
      try {
        currentDownloadItem.cancel();
      } catch {
        // Ignore error during cancellation
      }
      currentDownloadItem = undefined;
    }
  };

  download(window, url, {
    showBadge: false,
    directory: path.join(app.getPath('downloads'), 'LynxHub'),
    onStarted: item => {
      currentDownloadItem = item;
      item.on('updated', (_event, state) => {
        if (state === 'interrupted') {
          console.warn('Download interrupted (e.g. network lost or disconnected)');
          notifyFailure('Download item state became interrupted');
        }
      });
    },
    onProgress: progress => {
      if (hasFailed) return;
      utilsIpc.send.onDownloadFile({
        stage: 'progress',
        percentage: progress.percent,
        downloaded: progress.transferredBytes,
        total: progress.totalBytes,
        fileName: currentDownloadItem?.getFilename() || '',
      });
    },
  })
    .then(item => {
      if (hasFailed) return;
      utilsIpc.send.onDownloadFile({
        stage: 'done',
        finalPath: item.savePath,
      });
      // Clear the current item reference on success
      if (currentDownloadItem === item) {
        currentDownloadItem = undefined;
      }
    })
    .catch(e => {
      notifyFailure(e);
    });
}

/**
 * Cancels the currently active download.
 */
export function cancelDownload(): void {
  if (currentDownloadItem) {
    try {
      currentDownloadItem.cancel();
    } catch {
      // Ignore error during cancellation
    }
    currentDownloadItem = undefined;
  }
}
