import {createWriteStream} from 'node:fs';
import {access, unlink} from 'node:fs/promises';
import * as https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';

import {isWin} from '@lynx_common/utils';
import ShowToastWindow from '@lynx_main/childWindows/toast';
import {getAppDirectory} from '@lynx_main/managers/dataFolder';
import {decompress} from '@lynxhub/7zip';

const DU_ZIP_URL = 'https://download.sysinternals.com/files/DU.zip';
const DU_BINARY_NAME = 'du64.exe';

/**
 * Downloads and extracts the DU.zip file from Sysinternals.
 * Uses a temporary file for download before extraction.
 *
 * @param savePath - The directory path where the extracted files should be saved
 * @throws Will throw if download or extraction fails
 */
async function downloadAndExtractDuZip(savePath: string): Promise<void> {
  const tempFilePath = path.join(os.tmpdir(), 'du.zip');

  try {
    await new Promise<void>((resolve, reject) => {
      const request = https.get(DU_ZIP_URL, async res => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download DU.zip: ${res.statusCode} ${res.statusMessage}`));
          res.resume(); // Consume response data to free up memory
          return;
        }

        try {
          const fileStream = createWriteStream(tempFilePath);
          await pipeline(res, fileStream);
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      request.on('error', reject);
    });

    await decompress(tempFilePath, savePath);
  } finally {
    // Clean up temp file, ignoring errors if it doesn't exist
    await unlink(tempFilePath).catch(() => {});
  }
}

/**
 * Downloads the DU utility (Disk Usage) if it's not already installed.
 * Only runs on Windows as it's a Windows-specific utility.
 * Shows a toast window if download fails.
 */
export default async function downloadDU(): Promise<void> {
  if (!isWin) return;

  const duBinPath = path.join(getAppDirectory('Binaries'), 'DiskUsage', DU_BINARY_NAME);

  try {
    await access(duBinPath);
  } catch {
    // Binary doesn't exist, try to download it
    try {
      const savePath = path.join(getAppDirectory('Binaries'), 'DiskUsage');
      await downloadAndExtractDuZip(savePath);
    } catch (e) {
      console.error('Failed to download DU64:', e);

      ShowToastWindow({
        title: 'Download Failed',
        message:
          'Could not download du64, which is needed for folder size calculation. ' +
          'Please check your internet connection and restart the app to try again.',
        type: 'warning',
        buttons: ['close', 'restart'],
      });
    }
  }
}
