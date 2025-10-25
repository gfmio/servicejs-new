/**
 * @servicejs/capability-fs
 *
 * Filesystem capability interface for ServiceJS.
 *
 * Provides platform-agnostic filesystem operations without ambient authority.
 *
 * @example
 * ```typescript
 * import { createInMemoryFS } from '@servicejs/capability-fs';
 *
 * const fs = createInMemoryFS({
 *   '/config.json': '{"key": "value"}',
 * });
 *
 * const content = await fs.readFile('/config.json', { encoding: 'utf8' });
 * if (content.ok) {
 *   console.log(content.value);
 * }
 * ```
 *
 * @packageDocumentation
 */

export type {
  FilesystemCapability,
  FSError,
  FSErrorCode,
  FileStats,
  FileStat,
  DirectoryEntry,
  ReadFileOptions,
  WriteFileOptions,
  MkdirOptions,
  RemoveOptions,
  FileEncoding,
} from './types.js';

export { createInMemoryFS, createNoOpFS } from './in-memory.js';
