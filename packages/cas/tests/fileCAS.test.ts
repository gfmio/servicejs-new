/**
 * File-Based CAS Tests
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createFileCAS } from '../src/fileCAS.js';
import { isOk, isErr } from '@servicejs/result';
import type { ContentAddress } from '../src/types.js';
import { rmSync, mkdirSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(import.meta.dir, '.test-cas-data');

describe('File-Based CAS', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  afterEach(() => {
    // Clean up test directory after each test
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {}
  });

  test('should store and retrieve content', async () => {
    const cas = createFileCAS<{ name: string; value: number }>({
      baseDir: TEST_DIR,
    });

    const content = { name: 'test', value: 42 };
    const putResult = await cas.put(content);

    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const address = putResult.value;
    const getResult = await cas.get(address);

    expect(isOk(getResult)).toBe(true);
    if (!isOk(getResult)) return;

    expect(getResult.value).toEqual(content);
  });

  test('should deduplicate identical content', async () => {
    const cas = createFileCAS<string>({
      baseDir: TEST_DIR,
    });

    const content = 'hello world';

    const result1 = await cas.put(content);
    const result2 = await cas.put(content);

    expect(isOk(result1)).toBe(true);
    expect(isOk(result2)).toBe(true);

    if (!isOk(result1) || !isOk(result2)) return;

    // Should return same address
    expect(result1.value).toBe(result2.value);

    // Stats should show only one item
    const stats = await cas.stats?.();
    expect(stats?.count).toBe(1);
  });

  test('should return NOT_FOUND for missing content', async () => {
    const cas = createFileCAS<string>({
      baseDir: TEST_DIR,
    });

    const fakeAddress = 'sha256:nonexistent' as ContentAddress;
    const result = await cas.get(fakeAddress);

    expect(isErr(result)).toBe(true);
    if (isOk(result)) return;

    expect(result.error.type).toBe('NOT_FOUND');
    expect(result.error.address).toBe(fakeAddress);
  });

  test('should check if content exists', async () => {
    const cas = createFileCAS<number>({
      baseDir: TEST_DIR,
    });

    const content = 12345;
    const putResult = await cas.put(content);

    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const exists = await cas.has(putResult.value);
    expect(exists).toBe(true);

    const fakeAddress = 'sha256:fake' as ContentAddress;
    const notExists = await cas.has(fakeAddress);
    expect(notExists).toBe(false);
  });

  test('should delete content', async () => {
    const cas = createFileCAS<string>({
      baseDir: TEST_DIR,
    });

    const content = 'to be deleted';
    const putResult = await cas.put(content);

    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const address = putResult.value;

    // Verify it exists
    expect(await cas.has(address)).toBe(true);

    // Delete it
    const deleteResult = await cas.delete?.(address);
    expect(deleteResult && isOk(deleteResult)).toBe(true);

    // Verify it's gone
    expect(await cas.has(address)).toBe(false);
  });

  test('should compute consistent hashes', async () => {
    const cas1 = createFileCAS<string>({
      baseDir: join(TEST_DIR, 'cas1'),
    });
    const cas2 = createFileCAS<string>({
      baseDir: join(TEST_DIR, 'cas2'),
    });

    const content = 'consistent content';

    const result1 = await cas1.put(content);
    const result2 = await cas2.put(content);

    expect(isOk(result1)).toBe(true);
    expect(isOk(result2)).toBe(true);

    if (!isOk(result1) || !isOk(result2)) return;

    // Same content should produce same address
    expect(result1.value).toBe(result2.value);
  });

  test('should persist across instances', async () => {
    const content = { data: 'persistent' };

    // Store with first instance
    const cas1 = createFileCAS<typeof content>({
      baseDir: TEST_DIR,
    });

    const putResult = await cas1.put(content);
    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const address = putResult.value;

    // Retrieve with second instance
    const cas2 = createFileCAS<typeof content>({
      baseDir: TEST_DIR,
    });

    const getResult = await cas2.get(address);
    expect(isOk(getResult)).toBe(true);
    if (!isOk(getResult)) return;

    expect(getResult.value).toEqual(content);
  });

  test('should handle complex nested objects', async () => {
    const cas = createFileCAS<any>({
      baseDir: TEST_DIR,
    });

    const content = {
      users: [
        { id: 1, name: 'Alice', tags: ['admin', 'user'] },
        { id: 2, name: 'Bob', tags: ['user'] },
      ],
      metadata: {
        created: '2024-01-01',
        version: 1,
      },
    };

    const putResult = await cas.put(content);
    expect(isOk(putResult)).toBe(true);

    if (!isOk(putResult)) return;

    const getResult = await cas.get(putResult.value);
    expect(isOk(getResult)).toBe(true);

    if (!isOk(getResult)) return;

    expect(getResult.value).toEqual(content);
  });

  test('should provide accurate stats', async () => {
    const cas = createFileCAS<string>({
      baseDir: TEST_DIR,
    });

    // Initially empty
    let stats = await cas.stats?.();
    expect(stats?.count).toBe(0);
    expect(stats?.totalSize).toBe(0);

    // Add content
    await cas.put('hello');
    await cas.put('world');
    await cas.put('hello'); // Duplicate

    stats = await cas.stats?.();
    expect(stats?.count).toBe(2); // Only 2 unique items
    expect(stats?.totalSize).toBeGreaterThan(0);
    expect(stats?.algorithm).toBe('sha256');
  });

  test('should handle different hash algorithms', async () => {
    const cas256 = createFileCAS<string>({
      baseDir: join(TEST_DIR, 'sha256'),
      algorithm: 'sha256',
    });
    const cas1 = createFileCAS<string>({
      baseDir: join(TEST_DIR, 'sha1'),
      algorithm: 'sha1',
    });

    const content = 'test content';

    const result256 = await cas256.put(content);
    const result1 = await cas1.put(content);

    expect(isOk(result256)).toBe(true);
    expect(isOk(result1)).toBe(true);

    if (!isOk(result256) || !isOk(result1)) return;

    // Different algorithms should produce different addresses
    expect(result256.value).not.toBe(result1.value);

    // But both should start with their algorithm prefix
    expect(result256.value.startsWith('sha256:')).toBe(true);
    expect(result1.value.startsWith('sha1:')).toBe(true);
  });

  test('should handle binary data with custom serializer', async () => {
    const cas = createFileCAS<Uint8Array>({
      baseDir: TEST_DIR,
      serializer: {
        serialize: (value: unknown) => value as Uint8Array,
        deserialize: (data: string | Uint8Array) => data as Uint8Array,
      },
    });

    const binary = new Uint8Array([1, 2, 3, 4, 5]);
    const putResult = await cas.put(binary);

    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const getResult = await cas.get(putResult.value);
    expect(isOk(getResult)).toBe(true);

    if (!isOk(getResult)) return;

    expect(getResult.value).toEqual(binary);
  });

  test('should create directory if it does not exist', async () => {
    const cas = createFileCAS<string>({
      baseDir: join(TEST_DIR, 'auto-created'),
      createDir: true,
    });

    const content = 'test';
    const result = await cas.put(content);

    expect(isOk(result)).toBe(true);
  });

  test('should organize files in subdirectories', async () => {
    const cas = createFileCAS<string>({
      baseDir: TEST_DIR,
    });

    const content = 'test content';
    const putResult = await cas.put(content);

    expect(isOk(putResult)).toBe(true);
    if (!isOk(putResult)) return;

    const address = putResult.value;
    const hash = address.split(':', 2)[1];
    const subdir = hash.substring(0, 2);

    // Check that file exists in subdirectory
    const { existsSync } = await import('fs');
    const subdirPath = join(TEST_DIR, subdir);
    expect(existsSync(subdirPath)).toBe(true);
  });
});
