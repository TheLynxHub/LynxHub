import {stat} from 'node:fs/promises';
import {Worker} from 'node:worker_threads';

import {applicationIpc} from '@lynx_main/ipc/application';

const WORKER_CODE = `
  const {parentPort, workerData} = require('node:worker_threads');
  const {opendir} = require('node:fs/promises');
  const {statSync} = require('node:fs');
  const path = require('node:path');

  async function calculateSize(dir) {
    let totalSize = 0;
    async function walk(current) {
      try {
        const dirHandle = await opendir(current);
        const subdirs = [];
        for await (const entry of dirHandle) {
          const fullPath = path.join(current, entry.name);
          if (entry.isFile()) {
            try {
              totalSize += statSync(fullPath).size;
            } catch {
              // Skip unreadable files or permission errors
            }
          } else if (entry.isDirectory() && !entry.isSymbolicLink()) {
            subdirs.push(fullPath);
          }
        }
        await Promise.all(subdirs.map(walk));
      } catch {
        // Skip inaccessible subdirectories
      }
    }
    await walk(dir);
    return totalSize;
  }

  calculateSize(workerData.target)
    .then(size => {
      parentPort.postMessage({size});
    })
    .catch(err => {
      parentPort.postMessage({error: err?.message || String(err)});
    });
`;

/**
 * Calculates the size of a folder recursively on a background worker thread
 * so the Electron main event loop and UI remain 100% smooth and non-blocking.
 *
 * @param target - The absolute path to the target folder.
 * @returns A promise that resolves to the folder size in bytes. Returns 0 on error.
 */
export default async function calcFolderSize(target: string): Promise<number> {
  // Check if the target path exists and is a directory
  try {
    const stats = await stat(target);
    if (!stats.isDirectory()) {
      const message = `The provided path is not a directory: ${target}`;
      console.error(message);
      applicationIpc.send.showToast(message, 'danger');
      return 0;
    }
  } catch (err: any) {
    let message: string;
    if (err.code === 'ENOENT') {
      message = `The specified path does not exist: ${target}`;
      console.error(message);
      applicationIpc.send.showToast(message, 'danger');
    } else {
      message = `Error accessing the path: ${target}. Details: ${err.message}`;
      console.error(message);
      applicationIpc.send.showToast(message, 'danger');
    }
    return 0;
  }

  return new Promise<number>(resolve => {
    try {
      const worker = new Worker(WORKER_CODE, {eval: true, workerData: {target}});

      worker.on('message', (data: {size?: number; error?: string}) => {
        if (data.error) {
          console.error(`Error in folder size worker for '${target}':`, data.error);
          resolve(0);
        } else {
          resolve(data.size ?? 0);
        }
      });

      worker.on('error', err => {
        console.error(`Folder size worker error on '${target}':`, err);
        resolve(0);
      });

      worker.on('exit', code => {
        if (code !== 0) {
          console.error(`Folder size worker stopped with exit code ${code} on '${target}'`);
          resolve(0);
        }
      });
    } catch (err) {
      console.error('Failed to spawn folder size worker:', err);
      resolve(0);
    }
  });
}
