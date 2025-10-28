/**
 * Hashing utilities for content addressing
 */

import { ok, err, isOk, type Result } from '@servicejs/result';
import type { ContentAddress, CASError, HashAlgorithm } from './types.js';

/**
 * Compute hash of content
 *
 * @param content - Content to hash (string or Uint8Array)
 * @param algorithm - Hash algorithm to use
 * @returns Content address with algorithm prefix
 */
export const computeHash = async (
  content: string | Uint8Array,
  algorithm: HashAlgorithm = 'sha256'
): Promise<Result<ContentAddress, CASError>> => {
  try {
    // Convert string to bytes if needed
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;

    // Compute hash using Web Crypto API or Node crypto
    let hashBuffer: ArrayBuffer;

    if (typeof crypto !== 'undefined' && crypto.subtle) {
      // Browser or modern Node.js with Web Crypto API
      const algoName = algorithm === 'sha256' ? 'SHA-256' : 'SHA-1';
      hashBuffer = await crypto.subtle.digest(algoName, bytes);
    } else {
      // Fallback for environments without Web Crypto
      // Use Node.js crypto module
      const { createHash } = await import('crypto');
      const hash = createHash(algorithm);
      hash.update(bytes);
      const hashHex = hash.digest('hex');
      return ok(`${algorithm}:${hashHex}` as ContentAddress);
    }

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Return with algorithm prefix
    return ok(`${algorithm}:${hashHex}` as ContentAddress);
  } catch (error) {
    return err({
      type: 'HASH_ERROR',
      error: error instanceof Error ? error : new Error(String(error)),
      message: `Failed to compute ${algorithm} hash`,
    });
  }
};

/**
 * Verify that content matches its address
 *
 * @param content - Content to verify
 * @param address - Expected content address
 * @returns true if content matches address
 */
export const verifyHash = async (
  content: string | Uint8Array,
  address: ContentAddress
): Promise<boolean> => {
  // Extract algorithm from address
  const [algorithm] = address.split(':', 2) as [HashAlgorithm, string];

  // Compute hash
  const result = await computeHash(content, algorithm);

  if (!isOk(result)) {
    return false;
  }

  // Compare hashes
  return result.value === address;
};

/**
 * Extract algorithm from content address
 *
 * @param address - Content address
 * @returns Hash algorithm
 */
export const extractAlgorithm = (address: ContentAddress): HashAlgorithm => {
  const [algorithm] = address.split(':', 2);
  return algorithm as HashAlgorithm;
};
