import {
  accessSync,
  chmodSync,
  constants as fsConstants,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import {join} from 'node:path';

import {FileSystemError} from '@lynx_common/types/fileSystem';
import {isWin} from '@lynx_common/utils';

/**
 * Maps Node.js error codes to user-friendly messages
 */
export const FILE_SYSTEM_ERROR_MESSAGES: Record<string, string> = {
  EACCES: 'Permission denied. Please check folder permissions.',
  EPERM: 'Operation not permitted. Please run with appropriate permissions.',
  ENOSPC: 'Not enough disk space available.',
  ENOENT: 'Path does not exist.',
  ENOTDIR: 'Path is not a directory.',
  EISDIR: 'Path is a directory, not a file.',
  EMFILE: 'Too many open files.',
  ENAMETOOLONG: 'Path name is too long.',
  EROFS: 'File system is read-only.',
  EEXIST: 'File or directory already exists.',
};

/**
 * Converts a Node.js error to a FileSystemError with user-friendly message
 * @param error - The error object
 * @returns FileSystemError with code, technical message, and user-friendly message
 */
export function handleFileSystemError(error: any): FileSystemError {
  const code = error.code || 'UNKNOWN';
  const message = error.message || 'Unknown error occurred';
  const userMessage = FILE_SYSTEM_ERROR_MESSAGES[code] || 'An unexpected error occurred with the file system.';

  console.error(`File system error [${code}]:`, message);

  return {
    code,
    message,
    userMessage,
  };
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dirPath - The directory path to ensure exists
 * @returns True if successful, false otherwise
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, {recursive: true});
      console.log(`Created directory: ${dirPath}`);
    }
    return true;
  } catch (error: any) {
    const fsError = handleFileSystemError(error);
    console.error(`Failed to create directory ${dirPath}:`, fsError.userMessage);
    return false;
  }
}

/**
 * Checks if a path has write permissions
 * @param path - The path to check
 * @returns True if writable, false otherwise
 */
export function hasWritePermission(path: string): boolean {
  try {
    accessSync(path, fsConstants.W_OK);
    return true;
  } catch (error: any) {
    const fsError = handleFileSystemError(error);
    console.error(`No write permission for ${path}:`, fsError.userMessage);
    return false;
  }
}

/**
 * Validates that a directory path is writable
 * @param dirPath - The directory path to validate
 * @returns Object with success status and optional error message
 */
export function validateWritableDirectory(dirPath: string): {success: boolean; error?: string} {
  try {
    // Ensure directory exists
    if (!ensureDirectoryExists(dirPath)) {
      return {success: false, error: 'Failed to create directory'};
    }

    // Check write permissions
    if (!hasWritePermission(dirPath)) {
      return {success: false, error: 'No write permission for directory'};
    }

    return {success: true};
  } catch (error: any) {
    const fsError = handleFileSystemError(error);
    return {success: false, error: fsError.userMessage};
  }
}

/**
 * Validates a file system path
 * @param path - The path to validate
 * @returns Object with success status and optional error message
 */
export function validatePath(path: string): {success: boolean; error?: string} {
  try {
    // Check for empty path
    if (!path || path.trim() === '') {
      return {success: false, error: 'Path cannot be empty'};
    }

    // Check for invalid characters (OS-specific)
    // Windows: < > : " | ? * (but NOT parentheses, which are valid)
    // Note: We don't check for / and \ as they are path separators
    const invalidChars = isWin ? /[<>"|?*]/ : /\0/;
    if (invalidChars.test(path)) {
      return {success: false, error: 'Path contains invalid characters'};
    }

    // Check path length limits (OS-specific)
    const maxPathLength = isWin ? 260 : 4096;
    if (path.length > maxPathLength) {
      return {success: false, error: `Path is too long (max ${maxPathLength} characters)`};
    }

    // Check if path exists
    if (existsSync(path)) {
      return {success: true};
    }

    // Path doesn't exist - this is okay, we can create it later
    return {success: true};
  } catch (error: any) {
    const fsError = handleFileSystemError(error);
    console.error('Path validation error:', fsError.userMessage);
    return {success: false, error: fsError.userMessage};
  }
}

/**
 * Recursively ensures all directories have read/write/execute permissions (0o777)
 * and all files have read/write permissions (0o666) so they can be deleted or modified
 * across POSIX (Linux/macOS) and Windows.
 */
export function makeWritableRecursive(targetPath: string): void {
  try {
    if (!existsSync(targetPath)) return;
    const stat = lstatSync(targetPath);
    if (stat.isSymbolicLink()) {
      return;
    }
    if (stat.isDirectory()) {
      try {
        chmodSync(targetPath, 0o777);
      } catch {
        // Ignore permission errors on individual items
      }
      const entries = readdirSync(targetPath, {withFileTypes: true});
      for (const entry of entries) {
        makeWritableRecursive(join(targetPath, entry.name));
      }
    } else {
      try {
        chmodSync(targetPath, 0o666);
      } catch {
        // Ignore permission errors on individual items
      }
    }
  } catch {
    // Ignore error during recursive traversal
  }
}

/**
 * Safely and robustly wipes a directory or file recursively.
 * Ensures proper directory/file permissions before deletion to prevent EACCES/ENOTEMPTY on POSIX/Linux.
 * Falls back to renaming and deferred deletion if files are locked.
 */
export function robustWipe(targetPath: string): void {
  if (!existsSync(targetPath)) return;
  makeWritableRecursive(targetPath);
  try {
    rmSync(targetPath, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
  } catch (error) {
    console.warn(`robustWipe: Initial deletion of ${targetPath} failed (possibly locked files):`, error);
    const tempDirName = `${targetPath}_old_${Date.now()}`;
    try {
      renameSync(targetPath, tempDirName);
      makeWritableRecursive(tempDirName);
      try {
        rmSync(tempDirName, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
      } catch {
        console.warn(`robustWipe: Could not delete ${tempDirName} immediately, left for OS/startup cleanup.`);
      }
    } catch (renameError) {
      console.error(`robustWipe: Failed to rename directory ${targetPath} as fallback:`, renameError);
    }
  }
}

