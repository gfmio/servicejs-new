/**
 * Deterministic crypto implementation for testing.
 *
 * Uses seeded pseudo-random number generation for reproducible tests.
 */

import { ok, err } from '@servicejs/result';
import type { Result } from '@servicejs/result';
import type {
  CryptoCapability,
  CryptoError,
  HashAlgorithm,
  HMACAlgorithm,
  HashEncoding,
} from './types.js';

/**
 * Simple seeded PRNG using xorshift128+
 *
 * This is NOT cryptographically secure and should only be used for testing.
 */
class SeededRandom {
  private state: [bigint, bigint];

  constructor(seed: number = 12345) {
    // Initialize state from seed
    const s = BigInt(seed);
    this.state = [s, s * 6364136223846793005n + 1442695040888963407n];
  }

  /**
   * Generate next random bigint (64-bit).
   */
  next(): bigint {
    let [s0, s1] = this.state;

    const result = s0 + s1;

    s1 ^= s0;
    s0 = ((s0 << 55n) | (s0 >> 9n)) ^ s1 ^ (s1 << 14n);
    s1 = (s1 << 36n) | (s1 >> 28n);

    this.state = [s0, s1];

    return result;
  }

  /**
   * Generate random bytes.
   */
  bytes(length: number): Uint8Array {
    const result = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
      if (i % 8 === 0) {
        const value = this.next();
        for (let j = 0; j < 8 && i + j < length; j++) {
          result[i + j] = Number((value >> BigInt(j * 8)) & 0xffn);
        }
      }
    }

    return result;
  }

  /**
   * Generate random integer in range [min, max).
   */
  int(min: number, max: number): number {
    const range = max - min;
    const randomValue = Number(this.next() & 0x7fffffffn); // 31-bit positive int
    return min + (randomValue % range);
  }
}

/**
 * Simple hash implementation for testing.
 *
 * NOT cryptographically secure - for testing only!
 */
async function simpleHash(data: Uint8Array): Promise<Uint8Array> {
  // Simple FNV-1a hash (32-bit) repeated to fill output
  let hash = 2166136261;

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte !== undefined) {
      hash ^= byte;
      hash = Math.imul(hash, 16777619);
    }
  }

  // Create output buffer (32 bytes for sha256-like output)
  const output = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    output[i] = (hash >> ((i % 4) * 8)) & 0xff;
    if (i % 4 === 3) {
      hash = Math.imul(hash, 16777619);
    }
  }

  return output;
}

/**
 * Encode bytes to hex string.
 */
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encode bytes to base64 string.
 */
function toBase64(bytes: Uint8Array): string {
  // Use native btoa if available (browser)
  if (typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...bytes));
  }

  // Otherwise use Buffer (Node.js)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }

  // Fallback: simple base64 encoding
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;

  while (i < bytes.length) {
    const a = bytes[i++] ?? 0;
    const b = i < bytes.length ? bytes[i++] ?? 0 : 0;
    const c = i < bytes.length ? bytes[i++] ?? 0 : 0;

    const triplet = (a << 16) | (b << 8) | c;

    result += base64Chars[(triplet >> 18) & 0x3f];
    result += base64Chars[(triplet >> 12) & 0x3f];
    result += i - 1 < bytes.length ? base64Chars[(triplet >> 6) & 0x3f] : '=';
    result += i < bytes.length ? base64Chars[triplet & 0x3f] : '=';
  }

  return result;
}

/**
 * Deterministic crypto capability configuration.
 */
export interface DeterministicCryptoConfig {
  /**
   * Seed for the PRNG (default: 12345).
   */
  seed?: number;
}

/**
 * Deterministic crypto capability for testing.
 */
export interface DeterministicCryptoCapability extends CryptoCapability {
  /**
   * Reset the PRNG to initial seed.
   */
  reset(): void;

  /**
   * Get current seed.
   */
  getSeed(): number;
}

/**
 * Create a deterministic crypto capability for testing.
 *
 * This implementation uses a seeded PRNG to generate reproducible "random" values.
 * It is NOT cryptographically secure and should only be used for testing.
 *
 * @param config - Optional configuration
 * @returns Deterministic crypto capability
 *
 * @example
 * ```typescript
 * const crypto = createDeterministicCrypto({ seed: 42 });
 *
 * // Generate deterministic random bytes
 * const bytes1 = crypto.randomBytes(16);
 *
 * // Reset to get same sequence again
 * crypto.reset();
 * const bytes2 = crypto.randomBytes(16);
 *
 * // bytes1 and bytes2 are identical!
 * ```
 */
export function createDeterministicCrypto(
  config: DeterministicCryptoConfig = {}
): DeterministicCryptoCapability {
  const seed = config.seed ?? 12345;
  let rng = new SeededRandom(seed);

  const randomBytes = (length: number): Result<Uint8Array, CryptoError> => {
    if (length < 0) {
      return err({
        code: 'INVALID_LENGTH',
        message: `Invalid length: ${length}`,
      });
    }

    if (length > 65536) {
      return err({
        code: 'INVALID_LENGTH',
        message: `Length too large: ${length} (max: 65536)`,
      });
    }

    return ok(rng.bytes(length));
  };

  const randomUUID = (): Result<string, CryptoError> => {
    const bytes = rng.bytes(16);

    // Set version (4) and variant bits
    const byte6 = bytes[6];
    const byte8 = bytes[8];
    if (byte6 !== undefined) bytes[6] = (byte6 & 0x0f) | 0x40; // Version 4
    if (byte8 !== undefined) bytes[8] = (byte8 & 0x3f) | 0x80; // Variant 10

    const hex = toHex(bytes);

    // Format as UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuid = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');

    return ok(uuid);
  };

  const randomInt = (min: number, max: number): Result<number, CryptoError> => {
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      return err({
        code: 'INVALID_DATA',
        message: 'min and max must be integers',
      });
    }

    if (min >= max) {
      return err({
        code: 'INVALID_DATA',
        message: `min must be less than max (got ${min} >= ${max})`,
      });
    }

    return ok(rng.int(min, max));
  };

  const hash = async (
    _algorithm: HashAlgorithm,
    data: string | Uint8Array,
    encoding: HashEncoding = 'hex'
  ): Promise<Result<string | Uint8Array, CryptoError>> => {
    // Convert string to bytes
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Compute simple hash (not cryptographically secure!)
    const hashBytes = await simpleHash(bytes);

    // Encode output
    if (encoding === 'hex') {
      return ok(toHex(hashBytes));
    } else if (encoding === 'base64') {
      return ok(toBase64(hashBytes));
    } else {
      return ok(hashBytes);
    }
  };

  const hmac = async (
    _algorithm: HMACAlgorithm,
    key: string | Uint8Array,
    data: string | Uint8Array,
    encoding: HashEncoding = 'hex'
  ): Promise<Result<string | Uint8Array, CryptoError>> => {
    // Convert to bytes
    const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Simple HMAC-like construction (not secure!)
    // Combine key and data
    const combined = new Uint8Array(keyBytes.length + dataBytes.length);
    combined.set(keyBytes, 0);
    combined.set(dataBytes, keyBytes.length);

    const hashBytes = await simpleHash(combined);

    // Encode output
    if (encoding === 'hex') {
      return ok(toHex(hashBytes));
    } else if (encoding === 'base64') {
      return ok(toBase64(hashBytes));
    } else {
      return ok(hashBytes);
    }
  };

  const timingSafeEqual = (
    a: string | Uint8Array,
    b: string | Uint8Array
  ): Result<boolean, CryptoError> => {
    // Convert to bytes
    const aBytes = typeof a === 'string' ? new TextEncoder().encode(a) : a;
    const bBytes = typeof b === 'string' ? new TextEncoder().encode(b) : b;

    if (aBytes.length !== bBytes.length) {
      return ok(false);
    }

    // Constant-time comparison
    let result = 0;
    for (let i = 0; i < aBytes.length; i++) {
      const aByte = aBytes[i] ?? 0;
      const bByte = bBytes[i] ?? 0;
      result |= aByte ^ bByte;
    }

    return ok(result === 0);
  };

  return {
    randomBytes,
    randomUUID,
    randomInt,
    hash,
    hmac,
    timingSafeEqual,

    reset(): void {
      rng = new SeededRandom(seed);
    },

    getSeed(): number {
      return seed;
    },
  };
}

/**
 * Create a no-op crypto capability where all operations fail.
 *
 * @returns No-op crypto capability
 */
export function createNoOpCrypto(): CryptoCapability {
  const noOpError: CryptoError = {
    code: 'NOT_SUPPORTED',
    message: 'Crypto operations disabled',
  };

  return {
    randomBytes: () => err(noOpError),
    randomUUID: () => err(noOpError),
    randomInt: () => err(noOpError),
    hash: async () => err(noOpError),
    hmac: async () => err(noOpError),
    timingSafeEqual: () => err(noOpError),
  };
}
