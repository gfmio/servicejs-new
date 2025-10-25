/**
 * Filesystem capability interface for ServiceJS.
 *
 * Provides platform-agnostic filesystem operations without ambient authority.
 *
 * @packageDocumentation
 */

import type { Result } from '@servicejs/result';

/**
 * Error codes for filesystem operations.
 */
export type FSErrorCode =
  | 'NOT_FOUND' // File or directory not found
  | 'PERMISSION_DENIED' // Access denied
  | 'ALREADY_EXISTS' // File or directory already exists
  | 'NOT_A_FILE' // Path exists but is not a file
  | 'NOT_A_DIRECTORY' // Path exists but is not a directory
  | 'NOT_EMPTY' // Directory is not empty
  | 'INVALID_PATH' // Path is invalid
  | 'READ_ERROR' // Error reading file
  | 'WRITE_ERROR' // Error writing file
  | 'UNKNOWN'; // Unknown error

/**
 * Filesystem error type.
 */
export interface FSError {
  readonly code: FSErrorCode;
  readonly message: string;
  readonly path?: string;
}

/**
 * File statistics.
 */
export interface FileStats {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
  readonly size: number;
  readonly createdAt: number; // Timestamp in milliseconds
  readonly modifiedAt: number; // Timestamp in milliseconds
  readonly accessedAt: number; // Timestamp in milliseconds
}

/**
 * Directory entry.
 */
export interface DirectoryEntry {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
}

/**
 * File encoding options.
 */
export type FileEncoding = 'utf8' | 'utf-8' | 'binary';

/**
 * Options for readFile operation.
 */
export interface ReadFileOptions {
  readonly encoding?: FileEncoding;
}

/**
 * Options for writeFile operation.
 */
export interface WriteFileOptions {
  readonly encoding?: FileEncoding;
  readonly createDirs?: boolean; // Create parent directories if they don't exist
}

/**
 * Options for mkdir operation.
 */
export interface MkdirOptions {
  readonly recursive?: boolean; // Create parent directories if needed
}

/**
 * Options for remove operation.
 */
export interface RemoveOptions {
  readonly recursive?: boolean; // Remove directories and their contents
}

/**
 * Filesystem capability interface.
 *
 * Provides access to filesystem operations in a platform-agnostic way.
 *
 * @example
 * ```typescript
 * const fs = runtime.fs;
 *
 * // Read a file
 * const content = await fs.readFile('/path/to/file.txt', { encoding: 'utf8' });
 * if (content.ok) {
 *   console.log('File content:', content.value);
 * }
 *
 * // Write a file
 * const result = await fs.writeFile('/path/to/file.txt', 'Hello, world!', { encoding: 'utf8' });
 * if (result.ok) {
 *   console.log('File written successfully');
 * }
 *
 * // List directory
 * const entries = await fs.readdir('/path/to/dir');
 * if (entries.ok) {
 *   for (const entry of entries.value) {
 *     console.log(entry.name, entry.isDirectory ? 'dir' : 'file');
 *   }
 * }
 * ```
 */
export interface FilesystemCapability {
  /**
   * Read a file's contents.
   *
   * @param path - Path to the file
   * @param options - Read options
   * @returns Result containing file contents or error
   */
  readFile(
    path: string,
    options?: ReadFileOptions
  ): Promise<Result<string | Uint8Array, FSError>>;

  /**
   * Write contents to a file.
   *
   * @param path - Path to the file
   * @param data - Data to write
   * @param options - Write options
   * @returns Result indicating success or error
   */
  writeFile(
    path: string,
    data: string | Uint8Array,
    options?: WriteFileOptions
  ): Promise<Result<void, FSError>>;

  /**
   * Check if a file or directory exists.
   *
   * @param path - Path to check
   * @returns Result containing boolean indicating existence
   */
  exists(path: string): Promise<Result<boolean, FSError>>;

  /**
   * Get file or directory statistics.
   *
   * @param path - Path to file or directory
   * @returns Result containing file stats or error
   */
  stat(path: string): Promise<Result<FileStats, FSError>>;

  /**
   * Read directory contents.
   *
   * @param path - Path to directory
   * @returns Result containing array of directory entries or error
   */
  readdir(path: string): Promise<Result<readonly DirectoryEntry[], FSError>>;

  /**
   * Create a directory.
   *
   * @param path - Path to create
   * @param options - Mkdir options
   * @returns Result indicating success or error
   */
  mkdir(path: string, options?: MkdirOptions): Promise<Result<void, FSError>>;

  /**
   * Remove a file or directory.
   *
   * @param path - Path to remove
   * @param options - Remove options
   * @returns Result indicating success or error
   */
  remove(path: string, options?: RemoveOptions): Promise<Result<void, FSError>>;
}
