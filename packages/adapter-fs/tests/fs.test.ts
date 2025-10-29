import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { createFilesystemAdapter } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';

describe('Filesystem Adapter', () => {
  let adapter: ReturnType<typeof createFilesystemAdapter>;
  let testBasePath: string;

  beforeEach(async () => {
    adapter = createFilesystemAdapter();
    testBasePath = path.join(os.tmpdir(), `servicejs-fs-test-${Date.now()}`);
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.destroy();
    }
    // Clean up test directory
    try {
      await fs.rm(testBasePath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Lifecycle', () => {
    test('init creates directory if createIfMissing is true', async () => {
      const result = await adapter.init({
        basePath: testBasePath,
        createIfMissing: true,
      });

      expect(isOk(result)).toBe(true);

      // Verify directory was created
      const stats = await fs.stat(testBasePath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('init fails if directory does not exist and createIfMissing is false', async () => {
      const result = await adapter.init({
        basePath: path.join(testBasePath, 'nonexistent'),
        createIfMissing: false,
      });

      expect(isErr(result)).toBe(true);
    });

    test('start succeeds after init', async () => {
      await adapter.init({
        basePath: testBasePath,
        createIfMissing: true,
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('start fails before init', async () => {
      const result = await adapter.start();
      expect(isErr(result)).toBe(true);
    });

    test('health returns healthy after init', async () => {
      await adapter.init({
        basePath: testBasePath,
        createIfMissing: true,
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('health returns unhealthy before init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
      }
    });
  });

  describe('Bucket Operations', () => {
    beforeEach(async () => {
      await adapter.init({
        basePath: testBasePath,
        createIfMissing: true,
      });
      await adapter.start();
    });

    test('createBucket creates directory', async () => {
      const result = await adapter.createBucket({ bucket: 'test-bucket' });
      expect(isOk(result)).toBe(true);

      const bucketPath = path.join(testBasePath, 'test-bucket');
      const stats = await fs.stat(bucketPath);
      expect(stats.isDirectory()).toBe(true);
    });

    test('listBuckets returns created buckets', async () => {
      await adapter.createBucket({ bucket: 'bucket1' });
      await adapter.createBucket({ bucket: 'bucket2' });

      const result = await adapter.listBuckets();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toContain('bucket1');
        expect(result.value).toContain('bucket2');
      }
    });

    test('deleteBucket removes directory', async () => {
      await adapter.createBucket({ bucket: 'test-bucket' });

      const deleteResult = await adapter.deleteBucket({ bucket: 'test-bucket' });
      expect(isOk(deleteResult)).toBe(true);

      const listResult = await adapter.listBuckets();
      if (isOk(listResult)) {
        expect(listResult.value).not.toContain('test-bucket');
      }
    });
  });

  describe('Object Operations', () => {
    const bucketName = 'test-bucket';

    beforeEach(async () => {
      await adapter.init({
        basePath: testBasePath,
        createIfMissing: true,
      });
      await adapter.start();
      await adapter.createBucket({ bucket: bucketName });
    });

    test('putObject stores file', async () => {
      const result = await adapter.putObject({
        bucket: bucketName,
        key: 'test.txt',
        body: 'test content',
        contentType: 'text/plain',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.etag).toBeDefined();
      }
    });

    test('getObject retrieves file', async () => {
      await adapter.putObject({
        bucket: bucketName,
        key: 'test.txt',
        body: 'test content',
        contentType: 'text/plain',
        metadata: { author: 'tester' },
      });

      const result = await adapter.getObject({
        bucket: bucketName,
        key: 'test.txt',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.body.toString()).toBe('test content');
        expect(result.value.contentType).toBe('text/plain');
        expect(result.value.metadata?.author).toBe('tester');
        expect(result.value.size).toBeGreaterThan(0);
        expect(result.value.lastModified).toBeInstanceOf(Date);
      }
    });

    test('headObject returns metadata without content', async () => {
      await adapter.putObject({
        bucket: bucketName,
        key: 'test.txt',
        body: 'test content',
        contentType: 'text/plain',
        metadata: { author: 'tester' },
      });

      const result = await adapter.headObject({
        bucket: bucketName,
        key: 'test.txt',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.contentType).toBe('text/plain');
        expect(result.value.metadata?.author).toBe('tester');
        expect(result.value.size).toBeGreaterThan(0);
      }
    });

    test('deleteObject removes file', async () => {
      await adapter.putObject({
        bucket: bucketName,
        key: 'test.txt',
        body: 'test content',
      });

      const deleteResult = await adapter.deleteObject({
        bucket: bucketName,
        key: 'test.txt',
      });
      expect(isOk(deleteResult)).toBe(true);

      const getResult = await adapter.getObject({
        bucket: bucketName,
        key: 'test.txt',
      });
      expect(isErr(getResult)).toBe(true);
    });

    test('listObjects returns all objects', async () => {
      await adapter.putObject({ bucket: bucketName, key: 'file1.txt', body: 'content1' });
      await adapter.putObject({ bucket: bucketName, key: 'file2.txt', body: 'content2' });
      await adapter.putObject({ bucket: bucketName, key: 'dir/file3.txt', body: 'content3' });

      const result = await adapter.listObjects({ bucket: bucketName });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.contents.length).toBe(3);
        const keys = result.value.contents.map((obj) => obj.key);
        expect(keys).toContain('file1.txt');
        expect(keys).toContain('file2.txt');
        expect(keys).toContain('dir/file3.txt');
      }
    });

    test('listObjects with prefix filters results', async () => {
      await adapter.putObject({ bucket: bucketName, key: 'data/file1.txt', body: 'content1' });
      await adapter.putObject({ bucket: bucketName, key: 'data/file2.txt', body: 'content2' });
      await adapter.putObject({ bucket: bucketName, key: 'images/photo.jpg', body: 'image' });

      const result = await adapter.listObjects({
        bucket: bucketName,
        prefix: 'data/',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.contents.length).toBe(2);
        result.value.contents.forEach((obj) => {
          expect(obj.key.startsWith('data/')).toBe(true);
        });
      }
    });

    test('listObjects with maxKeys limits results', async () => {
      await adapter.putObject({ bucket: bucketName, key: 'file1.txt', body: 'content1' });
      await adapter.putObject({ bucket: bucketName, key: 'file2.txt', body: 'content2' });
      await adapter.putObject({ bucket: bucketName, key: 'file3.txt', body: 'content3' });

      const result = await adapter.listObjects({
        bucket: bucketName,
        maxKeys: 2,
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.contents.length).toBe(2);
        expect(result.value.isTruncated).toBe(true);
      }
    });

    test('copyObject duplicates file with metadata', async () => {
      await adapter.putObject({
        bucket: bucketName,
        key: 'source.txt',
        body: 'original content',
        contentType: 'text/plain',
        metadata: { author: 'tester' },
      });

      const copyResult = await adapter.copyObject({
        sourceBucket: bucketName,
        sourceKey: 'source.txt',
        destinationBucket: bucketName,
        destinationKey: 'copy.txt',
      });

      expect(isOk(copyResult)).toBe(true);

      const getResult = await adapter.getObject({
        bucket: bucketName,
        key: 'copy.txt',
      });

      if (isOk(getResult)) {
        expect(getResult.value.body.toString()).toBe('original content');
        expect(getResult.value.contentType).toBe('text/plain');
        expect(getResult.value.metadata?.author).toBe('tester');
      }
    });

    test('putObject handles Buffer', async () => {
      const buffer = Buffer.from('binary data');
      const result = await adapter.putObject({
        bucket: bucketName,
        key: 'binary.dat',
        body: buffer,
      });

      expect(isOk(result)).toBe(true);

      const getResult = await adapter.getObject({
        bucket: bucketName,
        key: 'binary.dat',
      });

      if (isOk(getResult)) {
        expect(Buffer.compare(getResult.value.body, buffer)).toBe(0);
      }
    });

    test('putObject handles Uint8Array', async () => {
      const array = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await adapter.putObject({
        bucket: bucketName,
        key: 'array.dat',
        body: array,
      });

      expect(isOk(result)).toBe(true);

      const getResult = await adapter.getObject({
        bucket: bucketName,
        key: 'array.dat',
      });

      if (isOk(getResult)) {
        expect(Buffer.compare(getResult.value.body, Buffer.from(array))).toBe(0);
      }
    });
  });
});
