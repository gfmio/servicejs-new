/**
 * In-Memory Content-Addressed Storage
 *
 * Hash-based storage with automatic deduplication.
 * Ideal for development, testing, and caching.
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type { CAS, ContentAddress, CASError, CASConfig, HashAlgorithm } from './types.js';
import { computeHash } from './hash.js';

/**
 * Create an in-memory CAS instance
 *
 * Data is stored in memory using a Map. All content is automatically deduplicated.
 *
 * @param config - CAS configuration
 * @returns In-memory CAS instance
 *
 * @example
 * ```typescript
 * const cas = createInMemoryCAS<User>();
 *
 * const user = { name: 'Alice', age: 30 };
 * const result = await cas.put(user);
 *
 * if (result.success) {
 *   const address = result.value;
 *   const retrieved = await cas.get(address);
 * }
 * ```
 */
export const createInMemoryCAS = <T = unknown>(config: CASConfig = {}): CAS<T> => {
  const algorithm: HashAlgorithm = config.algorithm ?? 'sha256';
  const storage = new Map<ContentAddress, T>();

  // Default serializer (JSON)
  const serializer = config.serializer ?? {
    serialize: (value: unknown) => JSON.stringify(value),
    deserialize: (data: string | Uint8Array) => {
      const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
      return JSON.parse(str);
    },
  };

  return {
    algorithm,

    async put(content: T): Promise<Result<ContentAddress, CASError>> {
      try {
        // Serialize content
        const serialized = serializer.serialize(content);

        // Compute hash
        const hashResult = await computeHash(serialized, algorithm);

        if (!isOk(hashResult)) {
          return hashResult;
        }

        const address = hashResult.value;

        // Store if not already present (deduplication)
        if (!storage.has(address)) {
          storage.set(address, content);
        }

        return ok(address);
      } catch (error) {
        return err({
          type: 'SERIALIZATION_ERROR',
          error: error instanceof Error ? error : new Error(String(error)),
          message: 'Failed to serialize content',
        });
      }
    },

    async get(address: ContentAddress): Promise<Result<T, CASError>> {
      const content = storage.get(address);

      if (content === undefined) {
        return err({
          type: 'NOT_FOUND',
          address,
          message: `Content not found: ${address}`,
        });
      }

      return ok(content);
    },

    async has(address: ContentAddress): Promise<boolean> {
      return storage.has(address);
    },

    async delete(address: ContentAddress): Promise<Result<void, CASError>> {
      const existed = storage.delete(address);

      if (!existed) {
        return err({
          type: 'NOT_FOUND',
          address,
          message: `Content not found: ${address}`,
        });
      }

      return ok(undefined);
    },

    async stats() {
      let totalSize = 0;

      for (const content of storage.values()) {
        const serialized = serializer.serialize(content);
        const size =
          typeof serialized === 'string'
            ? new TextEncoder().encode(serialized).length
            : serialized.length;
        totalSize += size;
      }

      return {
        count: storage.size,
        totalSize,
        algorithm,
      };
    },
  };
};
