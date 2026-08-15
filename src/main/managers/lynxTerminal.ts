import fs from 'node:fs';
import path from 'node:path';

import {isWin, removeExtraEndings, terminalLineEnding} from '@lynx_common/utils';
import {ptyIpc} from '@lynx_main/ipc/pty';
import {determineShell} from '@lynx_main/utils';
import {app} from 'electron';
import pty from 'node-pty';
import treeKill from 'tree-kill';

import classHolder from './classHolder';

/**
 * Manages pseudo-terminal (PTY) processes for different shells.
 * Handles spawning, resizing, data transmission, and cleanup of terminal sessions.
 */
export default class LynxTerminal {
  private isRunning: boolean;
  private process: pty.IPty | undefined;

  public onData?: (data: string) => void;
  public id: string;

  constructor(id: string, dir?: string, sendDataToRenderer = false, cols = 150, rows = 150) {
    const {storageManager} = classHolder;
    this.id = id;

    const {useConpty} = storageManager.getData('terminal');

    // Validate directory - fall back to home if invalid or inaccessible
    let validatedDir: string = app.getPath('home');
    if (dir && dir.trim().length > 0) {
      try {
        fs.accessSync(dir, fs.constants.R_OK);
        validatedDir = path.resolve(dir);
      } catch {
        console.warn(`Directory ${dir} is not accessible, falling back to home directory`);
      }
    }

    this.process = pty.spawn(determineShell(), [], {
      cwd: validatedDir,
      cols,
      rows,
      env: process.env,
      // 'auto' uses default behavior, 'yes' forces ConPTY on Windows
      useConpty: useConpty === 'auto' ? undefined : useConpty === 'yes',
    });

    this.isRunning = true;

    this.process.onData(data => {
      if (!this.isRunning) return;
      if (this.onData) {
        this.onData(data);
      } else if (sendDataToRenderer) {
        ptyIpc.send.onData(this.id, data);
        if (this.process) ptyIpc.send.onTitle(this.id, this.process.process);
      }
    });

    this.process.onExit(() => {
      if (!this.isRunning) return;
      ptyIpc.send.onExit(this.id);
    });
  }

  /**
   * Asynchronously stops the terminal process.
   * Ensures the process is killed and resources are freed.
   */
  public async stopAsync(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.isRunning && this.process) {
        this.isRunning = false;
        const {storageManager} = classHolder;
        const {autoExitSignalBeforeKill, sendYWithExit} = storageManager.getData('terminal');

        if (autoExitSignalBeforeKill) {
          this.write('\x03');
          if (sendYWithExit) {
            this.write('y' + terminalLineEnding);
          }
        }

        // Register exit handler BEFORE killing to avoid race condition
        this.process.onExit(() => {
          this.process = undefined;
          resolve();
        });

        const doKill = () => {
          if (this.process) {
            this.process.kill();
            treeKill(this.process.pid);
          }
        };

        if (autoExitSignalBeforeKill) {
          setTimeout(doKill, 200);
        } else {
          doKill();
        }

        // Safety timeout in case onExit never fires (e.g. process already dead)
        setTimeout(() => {
          this.process = undefined;
          resolve();
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Synchronously requests the terminal process to stop.
   * Note: Does not wait for the process to actually exit.
   */
  public stop(): void {
    if (this.isRunning && this.process) {
      this.isRunning = false;
      const {storageManager} = classHolder;
      const {autoExitSignalBeforeKill, sendYWithExit} = storageManager.getData('terminal');

      if (autoExitSignalBeforeKill) {
        this.write('\x03');
        if (sendYWithExit) {
          this.write('y' + terminalLineEnding);
        }
      }

      // Register exit handler BEFORE killing to avoid race condition
      this.process.onExit(() => {
        this.process = undefined;
      });

      const doKill = () => {
        if (this.process) {
          this.process.kill();
          treeKill(this.process.pid);
        }
      };

      if (autoExitSignalBeforeKill) {
        setTimeout(doKill, 200);
      } else {
        doKill();
      }
    }
  }

  /**
   * Resizes the PTY process window.
   * @param cols - Number of columns.
   * @param rows - Number of rows.
   */
  public resize(cols: number, rows: number): void {
    if (this.isRunning && this.process) {
      this.process.resize(cols, rows);
    }
  }

  /**
   * Clears the terminal screen.
   * Sends clear commands appropriate for the OS and shell.
   */
  public clear(): void {
    if (this.isRunning && this.process) {
      // Standard ANSI escape for clearing screen (or Ctrl+L equivalent)
      const clearEscape = isWin ? '\x1b' : '\x15';

      this.write(clearEscape);
      this.write(`clear${terminalLineEnding}`);
      this.write(clearEscape);

      this.process.clear();
    }
  }

  /**
   * Writes data to the PTY process.
   * @param data - The data to write, either a string or an array of strings.
   */
  public write(data: string | string[]): void {
    if (!this.isRunning) return;

    if (Array.isArray(data)) {
      data.forEach(text => this.process?.write(removeExtraEndings(text, terminalLineEnding)));
    } else {
      this.process?.write(removeExtraEndings(data, terminalLineEnding));
    }
  }
}
