/**
 * @servicejs/cas - Content-Addressed Storage
 *
 * Provides immutable storage with content-based addressing.
 */

// Types
export type {
  ContentAddress,
  CAS,
  CASError,
  CASConfig,
  HashAlgorithm,
} from './types.js';

// Hash utilities
export { computeHash, verifyHash, extractAlgorithm } from './hash.js';

// In-memory CAS
export { createInMemoryCAS } from './memoryCAS.js';

// File-based CAS
export type { FileCASConfig } from './fileCAS.js';
export { createFileCAS } from './fileCAS.js';
