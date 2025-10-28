import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createS3Adapter } from '../src/index.js';
import { isOk } from '@servicejs/result';
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3';

describe('S3 Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createS3Adapter>;
  let s3Client: S3Client;
  const bucketName = 'test-bucket';

  beforeAll(async () => {
    // Start LocalStack container
    container = await new GenericContainer('localstack/localstack:latest')
      .withExposedPorts(4566)
      .withEnvironment({
        SERVICES: 's3',
        DEBUG: '1',
      })
      .withStartupTimeout(120000)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(4566);

    const config = {
      region: 'us-east-1',
      endpoint: `http://${host}:${port}`,
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    };

    // Create bucket using AWS SDK directly
    s3Client = new S3Client(config);
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      })
    );

    adapter = createS3Adapter();
    const initResult = await adapter.init(config);
    expect(isOk(initResult)).toBe(true);

    const startResult = await adapter.start();
    expect(isOk(startResult)).toBe(true);
  }, 180000);

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (s3Client) {
      s3Client.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('health returns healthy after init', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Storage Operations', () => {
    test('put and get object', async () => {
      const putResult = await adapter.put(bucketName, 'test.txt', 'Hello, S3!', 'text/plain');
      expect(isOk(putResult)).toBe(true);

      const getResult = await adapter.get(bucketName, 'test.txt');
      expect(isOk(getResult)).toBe(true);
      if (isOk(getResult)) {
        const content = getResult.value.toString();
        expect(content).toBe('Hello, S3!');
      }
    });

    test('list objects', async () => {
      await adapter.put(bucketName, 'file1.txt', 'Content 1');
      await adapter.put(bucketName, 'file2.txt', 'Content 2');

      const listResult = await adapter.list(bucketName);
      expect(isOk(listResult)).toBe(true);
      if (isOk(listResult)) {
        expect(listResult.value.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('delete object', async () => {
      await adapter.put(bucketName, 'to-delete.txt', 'Delete me');

      const deleteResult = await adapter.delete(bucketName, 'to-delete.txt');
      expect(isOk(deleteResult)).toBe(true);
    });

    test('list with prefix', async () => {
      await adapter.put(bucketName, 'prefix/file1.txt', 'Content 1');
      await adapter.put(bucketName, 'prefix/file2.txt', 'Content 2');
      await adapter.put(bucketName, 'other/file3.txt', 'Content 3');

      const listResult = await adapter.list(bucketName, 'prefix/');
      expect(isOk(listResult)).toBe(true);
      if (isOk(listResult)) {
        const prefixFiles = listResult.value.filter((key) => key.startsWith('prefix/'));
        expect(prefixFiles.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});
