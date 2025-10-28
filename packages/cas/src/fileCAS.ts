/**
 * File-Based Content-Addressed Storage
 *
 * Persistent storage using the file system.
 * Stores content in individual files named by their content hash.
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type { CAS, ContentAddress, CASError, CASConfig, HashAlgorithm } from './types.js';
import { computeHash } from './hash.js';

/**
 * File CAS configuration
 */
export interface FileCASConfig extends CASConfig {
  /**
   * Base directory for storage
   */
  baseDir: string;

  /**
   * Whether to create the directory if it doesn't exist
   * @default true
   */
  createDir?: boolean;
}

/**
 * Create a file-based CAS instance
 *
 * Stores content in the file system, with each file named by its content hash.
 * Provides persistent storage across process restarts.
 *
 * Note: Requires Node.js fs module (not available in browsers)
 *
 * @param config - File CAS configuration
 * @returns File-based CAS instance
 *
 * @example
 * ```typescript
 * const cas = createFileCAS<User>({
 *   baseDir: './data/cas',
 *   algorithm: 'sha256'
 * });
 *
 * const user = { name: 'Alice', age: 30 };
 * const result = await cas.put(user);
 *
 * if (result.success) {
 *   // Content is now persisted to disk
 *   const address = result.value;
 * }
 * ```
 */
export const createFileCAS = <T = unknown>(config: FileCASConfig): CAS<T> => {
  const algorithm: HashAlgorithm = config.algorithm ?? 'sha256';
  const { baseDir, createDir = true } = config;

  // Default serializer (JSON)
  const serializer = config.serializer ?? {
    serialize: (value: unknown) => JSON.stringify(value, null, 2),
    deserialize: (data: string | Uint8Array) => {
      const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
      return JSON.parse(str);
    },
  };

  // Lazy-load fs module (only available in Node.js)
  let fs: typeof import('fs/promises') | null = null;
  let path: typeof import('path') | null = null;

  const ensureModules = async () => {
    if (!fs || !path) {
      try {
        fs = await import('fs/promises');
        path = await import('path');

        // Create base directory if needed
        if (createDir) {
          try {
            await fs.mkdir(baseDir, { recursive: true });
          } catch (error) {
            // Ignore if already exists
          }
        }
      } catch (error) {
        throw new Error(
          'File CAS requires Node.js fs module (not available in browser environment)'
        );
      }
    }
    return { fs: fs!, path: path! };
  };

  const getFilePath = (address: ContentAddress, pathModule: typeof import('path')): string => {
    // Use first 2 chars of hash as subdirectory for better file system performance
    const hash = address.split(':', 2)[1]!; // ContentAddress format is always "algorithm:hash"
    const subdir = hash.substring(0, 2);
    const filename = hash.substring(2);
    return pathModule.join(baseDir, subdir, filename);
  };

  return {
    algorithm,

    async put(content: T): Promise<Result<ContentAddress, CASError>> {
      try {
        const { fs, path } = await ensureModules();

        // Serialize content
        const serialized = serializer.serialize(content);
        const bytes =
          typeof serialized === 'string' ? new TextEncoder().encode(serialized) : serialized;

        // Compute hash
        const hashResult = await computeHash(bytes, algorithm);

        if (!isOk(hashResult)) {
          return hashResult;
        }

        const address = hashResult.value;
        const filePath = getFilePath(address, path);

        // Check if already exists (deduplication)
        try {
          await fs.access(filePath);
          return ok(address); // Already exists
        } catch {
          // Doesn't exist, write it
        }

        // Create subdirectory
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        // Write file
        await fs.writeFile(filePath, bytes);

        return ok(address);
      } catch (error) {
        return err({
          type: 'STORAGE_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          message: 'Failed to write content to file',
        });
      }
    },

    async get(address: ContentAddress): Promise<Result<T, CASError>> {
      try {
        const { fs, path } = await ensureModules();
        const filePath = getFilePath(address, path);

        // Read file
        const bytes = await fs.readFile(filePath);

        // Deserialize
        const content = serializer.deserialize(bytes) as T;

        return ok(content);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return err({
            type: 'NOT_FOUND',
            address,
            message: `Content not found: ${address}`,
          });
        }

        return err({
          type: 'STORAGE_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          message: 'Failed to read content from file',
        });
      }
    },

    async has(address: ContentAddress): Promise<boolean> {
      try {
        const { fs, path } = await ensureModules();
        const filePath = getFilePath(address, path);
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    },

    async delete(address: ContentAddress): Promise<Result<void, CASError>> {
      try {
        const { fs, path } = await ensureModules();
        const filePath = getFilePath(address, path);

        await fs.unlink(filePath);
        return ok(undefined);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return err({
            type: 'NOT_FOUND',
            address,
            message: `Content not found: ${address}`,
          });
        }

        return err({
          type: 'STORAGE_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          message: 'Failed to delete content file',
        });
      }
    },

    async stats() {
      try {
        const { fs, path } = await ensureModules();

        let count = 0;
        let totalSize = 0;

        // Walk directory tree
        const walk = async (dir: string) => {
          const entries = await fs!.readdir(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path!.join(dir, entry.name);

            if (entry.isDirectory()) {
              await walk(fullPath);
            } else if (entry.isFile()) {
              count++;
              const stat = await fs!.stat(fullPath);
              totalSize += stat.size;
            }
          }
        };

        try {
          await walk(baseDir);
        } catch (error) {
          // Directory doesn't exist or is empty
        }

        return {
          count,
          totalSize,
          algorithm,
        };
      } catch (error) {
        return {
          count: 0,
          totalSize: 0,
          algorithm,
        };
      }
    },
  };
};
