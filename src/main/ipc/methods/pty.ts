import {isWin, terminalLineEnding} from '@lynx_common/utils';
import classHolder from '@lynx_main/managers/classHolder';
import LynxTerminal from '@lynx_main/managers/lynxTerminal';
import {getAbsolutePath, getExePath, isPortable} from '@lynx_main/utils';
import {app, shell} from 'electron';
import {isArray, isEmpty, isNil} from 'lodash-es';

import {applicationIpc} from '../application';

// Store active PTY processes
let ptyProcesses: LynxTerminal[] = [];

// Store last known dimensions for each terminal ID to preserve sizing across restarts
const lastTerminalSizes = new Map<string, {cols: number; rows: number}>();

/**
 * Creates a PTY manager with error handling.
 * Shows user-friendly error message if terminal creation fails.
 * @param id - The unique ID for the terminal session.
 * @param dir - The working directory for the terminal.
 * @param useConpty - Whether to use ConPTY on Windows.
 * @returns The created LynxTerminal instance or null if creation failed.
 */
function createPtyManager(id: string, dir: string, useConpty: boolean): LynxTerminal | null {
  try {
    const lastSize = lastTerminalSizes.get(id);
    return new LynxTerminal(id, dir, useConpty, lastSize?.cols ?? 150, lastSize?.rows ?? 150);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to create terminal process [${id}]:`, error);

    let userMessage = 'Failed to start terminal.';
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      userMessage = 'Terminal shell not found. Please check your system shell configuration.';
    } else if (errorMessage.includes('EACCES') || errorMessage.includes('permission')) {
      userMessage = 'Permission denied when starting terminal. Try running as administrator.';
    } else if (errorMessage.includes('spawn')) {
      userMessage = 'Failed to spawn terminal process. Your shell may be misconfigured.';
    }

    applicationIpc.send.showToast(userMessage, 'danger');
    return null;
  }
}

/**
 * Validates and returns a valid directory path, falling back to home if invalid.
 * @param dir - The directory path to validate.
 * @returns A valid directory path.
 */
function getValidDir(dir?: string): string {
  return dir && dir.trim().length > 0 ? dir : app.getPath('home');
}

/**
 * Helper to retrieve a PTY process by ID.
 * @param id - The PTY process ID.
 * @returns The LynxTerminal instance or undefined.
 */
function getPtyByID(id: string): LynxTerminal | undefined {
  return ptyProcesses.find(pty => pty.id === id);
}

/**
 * Writes data to the PTY.
 * @param id - The unique id of process running
 * @param data - The data to write.
 */
export function ptyWrite(id: string, data: string): void {
  getPtyByID(id)?.write(data);
}

/**
 * Clears the PTY content.
 * @param id - The unique id of process running.
 */
export function ptyClear(id: string): void {
  getPtyByID(id)?.clear();
}

/**
 * Resizes the PTY.
 * @param id - The unique id of process running
 * @param cols - The number of columns.
 * @param rows - The number of rows.
 */
export function ptyResize(id: string, cols: number, rows: number): void {
  lastTerminalSizes.set(id, {cols, rows});
  getPtyByID(id)?.resize(cols, rows);
}

/**
 * Runs multiple commands sequentially in the PTY.
 * @param id - The unique id of process running
 * @param commands - An array of commands to run.
 */
function runCommandsSequentially(id: string, commands: string[]): void {
  if (!isEmpty(commands)) {
    commands.forEach(command => ptyWrite(id, `${command}${terminalLineEnding}`));
  }
}

/**
 * Executes commands in the PTY.
 * @param id - The unique id of process running.
 * @param commands - A single command string or an array of command strings.
 */
function executeCommands(id: string, commands: string | string[] | undefined): void {
  if (!isNil(commands) && !isEmpty(commands)) {
    if (isArray(commands)) {
      runCommandsSequentially(id, commands);
    } else {
      ptyWrite(id, commands + terminalLineEnding);
    }
  }
}

/**
 * Retrieves extension pre-commands for a given ID.
 * @param id - The ID to look up.
 * @returns An array of pre-commands.
 */
function getExtPreCommands(id: string): string[] {
  const {storageManager} = classHolder;
  return storageManager.getData('cards').cardTerminalPreCommands.find(command => command.id === id)?.commands || [];
}

/**
 * Open pre-open items (files/folders) for a given card.
 * @param cardId - The ID of the card.
 */
function runPreOpen(cardId: string): void {
  const {storageManager} = classHolder;
  const preOpens = storageManager.getPreOpenById(cardId);
  if (preOpens) {
    preOpens.data.forEach(toOpen => {
      shell.openPath(toOpen.path).catch(err => {
        console.error(`Failed to open path ${toOpen.path}:`, err);
      });
    });
  }
}

/**
 * Stops a specific PTY process.
 * @param id - The unique id of process running.
 */
export function stopPty(id: string): void {
  const pty = getPtyByID(id);
  if (pty) {
    pty.stop();
    ptyProcesses = ptyProcesses.filter(p => p.id !== id);
  }
}

/**
 * Stops all active PTY processes.
 */
export async function stopAllPty(): Promise<void> {
  await Promise.all(ptyProcesses.map(pty => pty.stopAsync()));
  ptyProcesses = [];
}

/**
 * Starts an empty PTY process.
 * @param id - The unique id of process running.
 * @param dir - Optional working directory.
 */
export async function emptyPtyProcess(id: string, dir?: string): Promise<void> {
  stopPty(id);
  const pty = createPtyManager(id, getValidDir(dir), true);
  if (pty) ptyProcesses.push(pty);
}

/**
 * Starts a custom PTY process that runs a specific file.
 * @param id - The unique id of process running.
 * @param dir - Optional working directory.
 * @param file - The file to execute.
 */
export async function customPtyProcess(id: string, dir?: string, file?: string): Promise<void> {
  if (!file) return;

  stopPty(id);
  const pty = createPtyManager(id, getValidDir(dir), true);
  if (!pty) return;

  ptyProcesses.push(pty);

  const extensionPreCommands = getExtPreCommands(id);
  executeCommands(id, extensionPreCommands);

  executeCommands(id, `${isWin ? './' : 'bash ./'}${file}`);
}

/**
 * Starts a custom PTY process and runs provided commands.
 * @param id - The unique id of process running.
 * @param commands - Commands to run.
 * @param dir - Optional working directory.
 */
export async function customPtyCommands(id: string, commands?: string | string[], dir?: string): Promise<void> {
  if (isEmpty(commands)) return;

  stopPty(id);
  const pty = createPtyManager(id, getValidDir(dir), true);
  if (!pty) return;

  ptyProcesses.push(pty);

  const extensionPreCommands = getExtPreCommands(id);
  let finalCommands = [...extensionPreCommands];

  if (!isNil(commands) && !isEmpty(commands)) {
    if (isArray(commands)) {
      finalCommands = [...finalCommands, ...commands];
    } else {
      finalCommands = [...finalCommands, commands];
    }
  }

  executeCommands(id, finalCommands);
}

/**
 * Manages the PTY process for a given card, handling configuration, pre-commands, and custom run behavior.
 * @param id - The unique id of process running.
 * @param cardId - The ID of the card.
 */
export async function ptyProcess(id: string, cardId: string): Promise<void> {
  const {storageManager, moduleManager} = classHolder;
  const card = storageManager.getData('cards').installedCards.find(card => card.id === cardId);
  if (!card) return;

  stopPty(id);
  const cardDir = isPortable() ? getAbsolutePath(getExePath(), card.dir || '') : card.dir;
  const pty = createPtyManager(id, getValidDir(cardDir), true);
  if (!pty) return;

  ptyProcesses.push(pty);

  const preCommands = storageManager.getPreCommandById(cardId);

  const extensionPreCommands = getExtPreCommands(id);
  executeCommands(id, extensionPreCommands);

  executeCommands(id, preCommands?.data);

  runPreOpen(cardId);

  const customRun = storageManager.getCustomRunById(cardId)?.data;
  const behavior = storageManager
    .getData('cardsConfig')
    .customRunBehavior.find(custom => custom.cardID === cardId)?.terminal;

  if (!isEmpty(customRun) || behavior === 'empty') {
    executeCommands(id, customRun);
  } else {
    const runCommand = await moduleManager?.getMethodsById(cardId)?.().getRunCommands();
    executeCommands(id, runCommand);
  }
}
