/**
 * Content-Addressed Storage Types
 *
 * Core type definitions for CAS operations.
 */

import type { Result } from '@servicejs/result';

/**
 * Branded type for content addresses
 *
 * A content address is a hash that uniquely identifies content.
 * The brand prevents accidentally using raw strings as addresses.
 *
 * @example
 * ```typescript
 * const address: ContentAddress = 'sha256:abc123...' as ContentAddress;
 * ```
 */
export type ContentAddress = string & { readonly __brand: 'ContentAddress' };

/**
 * CAS error types
 */
export type CASError =
  | { type: 'NOT_FOUND'; address: ContentAddress; message: string }
  | { type: 'SERIALIZATION_ERROR'; error: Error; message: string }
  | { type: 'STORAGE_ERROR'; error: Error; message: string }
  | { type: 'HASH_ERROR'; error: Error; message: string };

/**
 * Hash algorithm for content addressing
 */
export type HashAlgorithm = 'sha256' | 'sha1' | 'blake3';

/**
 * Content-Addressed Storage Interface
 *
 * Provides immutable storage with content-based addressing.
 * Data is stored by its cryptographic hash, ensuring:
 * - **Immutability**: Content cannot be changed without changing its address
 * - **Deduplication**: Identical content is stored only once
 * - **Verification**: Content can be verified against its address
 *
 * @example
 * ```typescript
 * const cas = createInMemoryCAS();
 *
 * // Store data
 * const result = await cas.put({ name: 'Alice', age: 30 });
 * if (result.success) {
 *   const address = result.value; // ContentAddress
 *
 *   // Retrieve data
 *   const data = await cas.get(address);
 *   if (data.success) {
 *     console.log(data.value); // { name: 'Alice', age: 30 }
 *   }
 * }
 * ```
 */
export interface CAS<T = unknown> {
  /**
   * Store content and return its address
   *
   * If the content already exists, returns the existing address without storing again.
   *
   * @param content - Content to store
   * @returns Content address or error
   */
  put(content: T): Promise<Result<ContentAddress, CASError>>;

  /**
   * Retrieve content by address
   *
   * @param address - Content address
   * @returns Content or error if not found
   */
  get(address: ContentAddress): Promise<Result<T, CASError>>;

  /**
   * Check if content exists
   *
   * @param address - Content address to check
   * @returns true if content exists
   */
  has(address: ContentAddress): Promise<boolean>;

  /**
   * Delete content (if storage supports deletion)
   *
   * Note: Some CAS implementations are append-only and don't support deletion.
   *
   * @param address - Content address to delete
   * @returns Success or error
   */
  delete?(address: ContentAddress): Promise<Result<void, CASError>>;

  /**
   * Get hash algorithm used by this CAS
   */
  readonly algorithm: HashAlgorithm;

  /**
   * Get storage statistics (if available)
   */
  stats?(): Promise<{
    count: number;
    totalSize: number;
    algorithm: HashAlgorithm;
  }>;
}

/**
 * CAS configuration
 */
export interface CASConfig {
  /**
   * Hash algorithm to use
   * @default 'sha256'
   */
  algorithm?: HashAlgorithm;

  /**
   * Custom serializer for content
   * @default JSON.stringify/parse
   */
  serializer?: {
    serialize: (value: unknown) => string | Uint8Array;
    deserialize: (data: string | Uint8Array) => unknown;
  };
}
