/**
 * @servicejs/capability-crypto
 *
 * Cryptographic operations capability interface for ServiceJS.
 *
 * Provides platform-agnostic cryptographic operations without ambient authority.
 *
 * @example
 * ```typescript
 * import { createDeterministicCrypto } from '@servicejs/capability-crypto';
 *
 * const crypto = createDeterministicCrypto({ seed: 42 });
 *
 * // Generate random bytes
 * const bytes = crypto.randomBytes(32);
 * if (bytes.ok) {
 *   console.log('Random bytes:', bytes.value);
 * }
 *
 * // Hash data
 * const hash = await crypto.hash('sha256', 'Hello, world!', 'hex');
 * if (hash.ok) {
 *   console.log('Hash:', hash.value);
 * }
 * ```
 *
 * @packageDocumentation
 */

export type {
  CryptoCapability,
  CryptoError,
  CryptoErrorCode,
  HashAlgorithm,
  HMACAlgorithm,
  HashEncoding,
} from './types.js';

export type {
  DeterministicCryptoCapability,
  DeterministicCryptoConfig,
} from './deterministic.js';

export {
  createDeterministicCrypto,
  createNoOpCrypto,
} from './deterministic.js';
