import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createSQSAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';
import { SQSClient, CreateQueueCommand } from '@aws-sdk/client-sqs';

describe('SQS Adapter', () => {
  let container: StartedTestContainer;
  let adapter: ReturnType<typeof createSQSAdapter>;
  let sqsClient: SQSClient;
  let queueUrl: string;

  beforeAll(async () => {
    // Start LocalStack container
    container = await new GenericContainer('localstack/localstack:latest')
      .withExposedPorts(4566)
      .withEnvironment({
        SERVICES: 'sqs',
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

    // Create queue using AWS SDK directly
    sqsClient = new SQSClient(config);
    const createQueueResponse = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: 'test-queue',
      })
    );
    queueUrl = createQueueResponse.QueueUrl!;

    adapter = createSQSAdapter();
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
    if (sqsClient) {
      sqsClient.destroy();
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

  describe('Queue Operations', () => {
    test('send and receive message', async () => {
      const sendResult = await adapter.send(queueUrl, 'Hello, SQS!');
      expect(isOk(sendResult)).toBe(true);
      if (isOk(sendResult)) {
        expect(sendResult.value.messageId).toBeDefined();
      }

      // Wait a bit for message to be available
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const receiveResult = await adapter.receive(queueUrl, 1, 5);
      expect(isOk(receiveResult)).toBe(true);
      if (isOk(receiveResult)) {
        expect(receiveResult.value.length).toBeGreaterThan(0);
        expect(receiveResult.value[0].body).toBe('Hello, SQS!');
      }
    });

    test('send message with attributes', async () => {
      const sendResult = await adapter.send(queueUrl, 'Message with attributes', {
        userId: 'user-123',
        action: 'test',
      });
      expect(isOk(sendResult)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const receiveResult = await adapter.receive(queueUrl, 1, 5);
      expect(isOk(receiveResult)).toBe(true);
      if (isOk(receiveResult)) {
        expect(receiveResult.value.length).toBeGreaterThan(0);
        const msg = receiveResult.value[0];
        expect(msg.attributes).toBeDefined();
      }
    });

    test('delete message', async () => {
      await adapter.send(queueUrl, 'Message to delete');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const receiveResult = await adapter.receive(queueUrl, 1, 5);
      expect(isOk(receiveResult)).toBe(true);

      if (isOk(receiveResult) && receiveResult.value.length > 0) {
        const msg = receiveResult.value[0];
        const deleteResult = await adapter.delete(queueUrl, msg.receiptHandle);
        expect(isOk(deleteResult)).toBe(true);
      }
    });

    test('get queue attributes', async () => {
      const attrsResult = await adapter.getQueueAttributes(queueUrl);
      expect(isOk(attrsResult)).toBe(true);
      if (isOk(attrsResult)) {
        expect(attrsResult.value).toBeDefined();
      }
    });
  });
});
