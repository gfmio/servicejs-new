import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createDeterministicCrypto, createNoOpCrypto } from '../src/deterministic.js';

describe('createDeterministicCrypto', () => {
  test('randomBytes generates bytes of specified length', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomBytes(16);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.length).toBe(16);
      expect(result.value).toBeInstanceOf(Uint8Array);
    }
  });

  test('randomBytes is deterministic with same seed', () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 42 });

    const bytes1 = crypto1.randomBytes(32);
    const bytes2 = crypto2.randomBytes(32);

    expect(isOk(bytes1)).toBe(true);
    expect(isOk(bytes2)).toBe(true);

    if (isOk(bytes1) && isOk(bytes2)) {
      expect(bytes1.value).toEqual(bytes2.value);
    }
  });

  test('randomBytes differs with different seeds', () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 43 });

    const bytes1 = crypto1.randomBytes(32);
    const bytes2 = crypto2.randomBytes(32);

    expect(isOk(bytes1)).toBe(true);
    expect(isOk(bytes2)).toBe(true);

    if (isOk(bytes1) && isOk(bytes2)) {
      expect(bytes1.value).not.toEqual(bytes2.value);
    }
  });

  test('randomBytes fails for negative length', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomBytes(-1);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_LENGTH');
    }
  });

  test('randomBytes fails for too large length', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomBytes(100000);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_LENGTH');
    }
  });

  test('randomUUID generates valid UUID v4 format', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomUUID();
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      const uuid = result.value;
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  test('randomUUID is deterministic with same seed', () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 42 });

    const uuid1 = crypto1.randomUUID();
    const uuid2 = crypto2.randomUUID();

    expect(isOk(uuid1)).toBe(true);
    expect(isOk(uuid2)).toBe(true);

    if (isOk(uuid1) && isOk(uuid2)) {
      expect(uuid1.value).toBe(uuid2.value);
    }
  });

  test('randomInt generates integer in range', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomInt(0, 100);
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThan(100);
      expect(Number.isInteger(result.value)).toBe(true);
    }
  });

  test('randomInt is deterministic with same seed', () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 42 });

    const int1 = crypto1.randomInt(0, 1000);
    const int2 = crypto2.randomInt(0, 1000);

    expect(isOk(int1)).toBe(true);
    expect(isOk(int2)).toBe(true);

    if (isOk(int1) && isOk(int2)) {
      expect(int1.value).toBe(int2.value);
    }
  });

  test('randomInt fails when min >= max', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomInt(100, 100);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_DATA');
    }
  });

  test('randomInt fails for non-integers', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.randomInt(0.5, 10.5);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('INVALID_DATA');
    }
  });

  test('hash generates hex hash by default', async () => {
    const crypto = createDeterministicCrypto();

    const result = await crypto.hash('sha256', 'Hello, world!');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(typeof result.value).toBe('string');
      expect(result.value).toMatch(/^[0-9a-f]+$/);
    }
  });

  test('hash is deterministic', async () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 42 });

    const hash1 = await crypto1.hash('sha256', 'test data');
    const hash2 = await crypto2.hash('sha256', 'test data');

    expect(isOk(hash1)).toBe(true);
    expect(isOk(hash2)).toBe(true);

    if (isOk(hash1) && isOk(hash2)) {
      expect(hash1.value).toBe(hash2.value);
    }
  });

  test('hash supports different encodings', async () => {
    const crypto = createDeterministicCrypto();

    const hexResult = await crypto.hash('sha256', 'test', 'hex');
    const base64Result = await crypto.hash('sha256', 'test', 'base64');
    const bufferResult = await crypto.hash('sha256', 'test', 'buffer');

    expect(isOk(hexResult)).toBe(true);
    expect(isOk(base64Result)).toBe(true);
    expect(isOk(bufferResult)).toBe(true);

    if (isOk(hexResult) && isOk(base64Result) && isOk(bufferResult)) {
      expect(typeof hexResult.value).toBe('string');
      expect(typeof base64Result.value).toBe('string');
      expect(bufferResult.value).toBeInstanceOf(Uint8Array);
    }
  });

  test('hash works with Uint8Array input', async () => {
    const crypto = createDeterministicCrypto();
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"

    const result = await crypto.hash('sha256', data);
    expect(isOk(result)).toBe(true);
  });

  test('hmac generates hex HMAC by default', async () => {
    const crypto = createDeterministicCrypto();

    const result = await crypto.hmac('sha256', 'secret-key', 'message');
    expect(isOk(result)).toBe(true);

    if (isOk(result)) {
      expect(typeof result.value).toBe('string');
      expect(result.value).toMatch(/^[0-9a-f]+$/);
    }
  });

  test('hmac is deterministic', async () => {
    const crypto1 = createDeterministicCrypto({ seed: 42 });
    const crypto2 = createDeterministicCrypto({ seed: 42 });

    const hmac1 = await crypto1.hmac('sha256', 'key', 'data');
    const hmac2 = await crypto2.hmac('sha256', 'key', 'data');

    expect(isOk(hmac1)).toBe(true);
    expect(isOk(hmac2)).toBe(true);

    if (isOk(hmac1) && isOk(hmac2)) {
      expect(hmac1.value).toBe(hmac2.value);
    }
  });

  test('hmac differs with different keys', async () => {
    const crypto = createDeterministicCrypto();

    const hmac1 = await crypto.hmac('sha256', 'key1', 'data');
    const hmac2 = await crypto.hmac('sha256', 'key2', 'data');

    expect(isOk(hmac1)).toBe(true);
    expect(isOk(hmac2)).toBe(true);

    if (isOk(hmac1) && isOk(hmac2)) {
      expect(hmac1.value).not.toBe(hmac2.value);
    }
  });

  test('hmac supports Uint8Array for key and data', async () => {
    const crypto = createDeterministicCrypto();

    const key = new Uint8Array([1, 2, 3, 4]);
    const data = new Uint8Array([5, 6, 7, 8]);

    const result = await crypto.hmac('sha256', key, data);
    expect(isOk(result)).toBe(true);
  });

  test('timingSafeEqual returns true for equal strings', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.timingSafeEqual('secret', 'secret');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(true);
    }
  });

  test('timingSafeEqual returns false for different strings', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.timingSafeEqual('secret1', 'secret2');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(false);
    }
  });

  test('timingSafeEqual returns false for different lengths', () => {
    const crypto = createDeterministicCrypto();

    const result = crypto.timingSafeEqual('short', 'longer string');
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(false);
    }
  });

  test('timingSafeEqual works with Uint8Array', () => {
    const crypto = createDeterministicCrypto();

    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);

    const result1 = crypto.timingSafeEqual(a, b);
    const result2 = crypto.timingSafeEqual(a, c);

    expect(isOk(result1)).toBe(true);
    expect(isOk(result2)).toBe(true);

    if (isOk(result1) && isOk(result2)) {
      expect(result1.value).toBe(true);
      expect(result2.value).toBe(false);
    }
  });

  test('reset restores initial seed', () => {
    const crypto = createDeterministicCrypto({ seed: 42 });

    const bytes1 = crypto.randomBytes(16);
    crypto.reset();
    const bytes2 = crypto.randomBytes(16);

    expect(isOk(bytes1)).toBe(true);
    expect(isOk(bytes2)).toBe(true);

    if (isOk(bytes1) && isOk(bytes2)) {
      expect(bytes1.value).toEqual(bytes2.value);
    }
  });

  test('getSeed returns configured seed', () => {
    const crypto = createDeterministicCrypto({ seed: 12345 });
    expect(crypto.getSeed()).toBe(12345);
  });

  test('default seed is used when not specified', () => {
    const crypto = createDeterministicCrypto();
    expect(crypto.getSeed()).toBe(12345);
  });
});

describe('createNoOpCrypto', () => {
  test('all operations fail', async () => {
    const crypto = createNoOpCrypto();

    const randomBytesResult = crypto.randomBytes(16);
    expect(isErr(randomBytesResult)).toBe(true);
    if (isErr(randomBytesResult)) {
      expect(randomBytesResult.error.code).toBe('NOT_SUPPORTED');
    }

    const uuidResult = crypto.randomUUID();
    expect(isErr(uuidResult)).toBe(true);

    const intResult = crypto.randomInt(0, 100);
    expect(isErr(intResult)).toBe(true);

    const hashResult = await crypto.hash('sha256', 'data');
    expect(isErr(hashResult)).toBe(true);

    const hmacResult = await crypto.hmac('sha256', 'key', 'data');
    expect(isErr(hmacResult)).toBe(true);

    const compareResult = crypto.timingSafeEqual('a', 'b');
    expect(isErr(compareResult)).toBe(true);
  });
});
