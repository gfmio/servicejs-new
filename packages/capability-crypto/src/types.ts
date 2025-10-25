/**
 * Cryptographic operations capability interface for ServiceJS.
 *
 * Provides platform-agnostic cryptographic operations without ambient authority.
 *
 * @packageDocumentation
 */

import type { Result } from '@servicejs/result';

/**
 * Crypto error codes.
 */
export type CryptoErrorCode =
  | 'INVALID_ALGORITHM' // Unsupported or invalid algorithm
  | 'INVALID_LENGTH' // Invalid byte length
  | 'INVALID_KEY' // Invalid key format or value
  | 'INVALID_DATA' // Invalid input data
  | 'OPERATION_FAILED' // Cryptographic operation failed
  | 'NOT_SUPPORTED' // Operation not supported in this environment
  | 'UNKNOWN'; // Unknown error

/**
 * Crypto error type.
 */
export interface CryptoError {
  readonly code: CryptoErrorCode;
  readonly message: string;
}

/**
 * Hash algorithm names.
 */
export type HashAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512' | 'md5';

/**
 * HMAC algorithm names.
 */
export type HMACAlgorithm = 'sha1' | 'sha256' | 'sha384' | 'sha512';

/**
 * Output encoding for hash/HMAC operations.
 */
export type HashEncoding = 'hex' | 'base64' | 'buffer';

/**
 * Cryptographic operations capability.
 *
 * Provides secure random number generation, hashing, and HMAC operations.
 *
 * @example
 * ```typescript
 * const crypto = runtime.crypto;
 *
 * // Generate random bytes
 * const randomBytes = crypto.randomBytes(32);
 * if (randomBytes.ok) {
 *   console.log('Random bytes:', randomBytes.value);
 * }
 *
 * // Generate UUID
 * const uuid = crypto.randomUUID();
 * if (uuid.ok) {
 *   console.log('UUID:', uuid.value);
 * }
 *
 * // Hash data
 * const hash = await crypto.hash('sha256', 'Hello, world!', 'hex');
 * if (hash.ok) {
 *   console.log('SHA-256 hash:', hash.value);
 * }
 *
 * // HMAC
 * const hmac = await crypto.hmac('sha256', 'secret-key', 'message', 'hex');
 * if (hmac.ok) {
 *   console.log('HMAC:', hmac.value);
 * }
 * ```
 */
export interface CryptoCapability {
  /**
   * Generate cryptographically secure random bytes.
   *
   * @param length - Number of bytes to generate
   * @returns Result containing random bytes or error
   */
  randomBytes(length: number): Result<Uint8Array, CryptoError>;

  /**
   * Generate a random UUID (v4).
   *
   * @returns Result containing UUID string or error
   */
  randomUUID(): Result<string, CryptoError>;

  /**
   * Generate a random integer between min (inclusive) and max (exclusive).
   *
   * @param min - Minimum value (inclusive)
   * @param max - Maximum value (exclusive)
   * @returns Result containing random integer or error
   */
  randomInt(min: number, max: number): Result<number, CryptoError>;

  /**
   * Hash data using specified algorithm.
   *
   * @param algorithm - Hash algorithm to use
   * @param data - Data to hash (string or bytes)
   * @param encoding - Output encoding (default: 'hex')
   * @returns Result containing hash or error
   */
  hash(
    algorithm: HashAlgorithm,
    data: string | Uint8Array,
    encoding?: HashEncoding
  ): Promise<Result<string | Uint8Array, CryptoError>>;

  /**
   * Compute HMAC (Hash-based Message Authentication Code).
   *
   * @param algorithm - HMAC algorithm to use
   * @param key - Secret key (string or bytes)
   * @param data - Data to authenticate (string or bytes)
   * @param encoding - Output encoding (default: 'hex')
   * @returns Result containing HMAC or error
   */
  hmac(
    algorithm: HMACAlgorithm,
    key: string | Uint8Array,
    data: string | Uint8Array,
    encoding?: HashEncoding
  ): Promise<Result<string | Uint8Array, CryptoError>>;

  /**
   * Constant-time comparison of two values.
   *
   * Useful for comparing secrets without timing attacks.
   *
   * @param a - First value
   * @param b - Second value
   * @returns Result containing true if equal, false otherwise
   */
  timingSafeEqual(
    a: string | Uint8Array,
    b: string | Uint8Array
  ): Result<boolean, CryptoError>;
}
