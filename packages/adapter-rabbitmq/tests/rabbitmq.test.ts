/**
 * Tests for RabbitMQ Adapter
 *
 * These tests require Docker to be installed and running
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createRabbitMQAdapter } from '../src/rabbitmq.js';
import { isOk, isErr } from '@servicejs/result';
import type { MessageQueueAdapter } from '@servicejs/integration-mq';
import { startRabbitMQContainer, isDockerAvailable, type RabbitMQContainer } from './rabbitmq-container.js';

let rabbitmqContainer: RabbitMQContainer | null = null;
let adapter: MessageQueueAdapter;

// Check if Docker is available, skip tests if not
const dockerAvailable = await isDockerAvailable();

if (!dockerAvailable) {
  console.log('⚠️  Docker not available, skipping RabbitMQ tests');
  console.log('   Install Docker to run these tests: https://www.docker.com/get-started\n');
}

const describeWithDocker = dockerAvailable ? describe : describe.skip;

describeWithDocker('RabbitMQ Adapter', () => {
  beforeAll(async () => {
    if (!dockerAvailable) return;

    rabbitmqContainer = await startRabbitMQContainer();
    adapter = createRabbitMQAdapter();
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (rabbitmqContainer) {
      await rabbitmqContainer.stop();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({
        host: rabbitmqContainer!.host,
        port: rabbitmqContainer!.port,
        username: rabbitmqContainer!.username,
        password: rabbitmqContainer!.password,
      });
      expect(isOk(result)).toBe(true);
    });

    test('should start after initialization', async () => {
      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Re-initialize for other tests
      await adapter.init({
        host: rabbitmqContainer!.host,
        port: rabbitmqContainer!.port,
        username: rabbitmqContainer!.username,
        password: rabbitmqContainer!.password,
      });
      await adapter.start();
    });
  });

  describe('Health Checks', () => {
    test('should report healthy when connected', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Producer', () => {
    test('should create producer', async () => {
      const result = await adapter.createProducer();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        await result.value.close();
      }
    });

    test('should publish message', async () => {
      const producerResult = await adapter.createProducer();
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const producer = producerResult.value;
        const result = await producer.publish('test-queue', { message: 'Hello' });
        expect(isOk(result)).toBe(true);
        await producer.close();
      }
    });

    test('should publish with attributes', async () => {
      const producerResult = await adapter.createProducer();
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const producer = producerResult.value;
        const attributes = new Map([
          ['priority', 'high'],
          ['type', 'notification'],
        ]);

        const result = await producer.publish('test-queue-attrs', { message: 'Hello' }, { attributes });
        expect(isOk(result)).toBe(true);
        await producer.close();
      }
    });
  });

  describe('Consumer', () => {
    test('should create consumer', async () => {
      const result = await adapter.createConsumer();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        await result.value.close();
      }
    });

    test('should subscribe to queue', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        const result = await consumer.subscribe('test-subscribe', async (msg) => {
          await msg.ack();
        });
        expect(isOk(result)).toBe(true);
        await consumer.unsubscribe('test-subscribe');
        await consumer.close();
      }
    });

    test('should receive published messages', async () => {
      const received: unknown[] = [];

      // Create consumer
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe<{ message: string }>('test-receive', async (msg) => {
          received.push(msg.data);
          await msg.ack();
        });

        // Wait a bit for subscription to be ready
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Create producer and publish
        const producerResult = await adapter.createProducer();
        expect(isOk(producerResult)).toBe(true);

        if (isOk(producerResult)) {
          const producer = producerResult.value;
          await producer.publish('test-receive', { message: 'Test 1' });
          await producer.publish('test-receive', { message: 'Test 2' });
          await producer.close();
        }

        // Wait for messages to be received
        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(received.length).toBe(2);
        expect(received[0]).toEqual({ message: 'Test 1' });
        expect(received[1]).toEqual({ message: 'Test 2' });

        await consumer.close();
      }
    });

    test('should handle message attributes', async () => {
      let receivedAttributes: ReadonlyMap<string, string> | undefined;

      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe('test-attributes', async (msg) => {
          receivedAttributes = msg.attributes;
          await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        const producerResult = await adapter.createProducer();
        if (isOk(producerResult)) {
          const producer = producerResult.value;
          const attributes = new Map([['key', 'value']]);
          await producer.publish('test-attributes', { test: 'data' }, { attributes });
          await producer.close();
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(receivedAttributes).toBeDefined();
        expect(receivedAttributes?.get('key')).toBe('value');

        await consumer.close();
      }
    });

    test('should unsubscribe from queue', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe('test-unsub', async (msg) => {
          await msg.ack();
        });

        const result = await consumer.unsubscribe('test-unsub');
        expect(isOk(result)).toBe(true);

        await consumer.close();
      }
    });

    test('should fail to unsubscribe from non-subscribed queue', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        const result = await consumer.unsubscribe('nonexistent');
        expect(isErr(result)).toBe(true);
        await consumer.close();
      }
    });
  });

  describe('Quick Publish', () => {
    test('should publish message directly', async () => {
      const result = await adapter.publish('test-quick', { message: 'Quick publish' });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Work Queue Pattern', () => {
    test('should distribute messages across multiple consumers', async () => {
      const received1: unknown[] = [];
      const received2: unknown[] = [];

      // Create two consumers
      const consumer1Result = await adapter.createConsumer();
      const consumer2Result = await adapter.createConsumer();

      expect(isOk(consumer1Result)).toBe(true);
      expect(isOk(consumer2Result)).toBe(true);

      if (isOk(consumer1Result) && isOk(consumer2Result)) {
        const consumer1 = consumer1Result.value;
        const consumer2 = consumer2Result.value;

        await consumer1.subscribe('test-workqueue', async (msg) => {
          received1.push(msg.data);
          await msg.ack();
        });

        await consumer2.subscribe('test-workqueue', async (msg) => {
          received2.push(msg.data);
          await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        // Publish multiple messages
        const producerResult = await adapter.createProducer();
        if (isOk(producerResult)) {
          const producer = producerResult.value;
          for (let i = 0; i < 4; i++) {
            await producer.publish('test-workqueue', { message: `Message ${i}` });
          }
          await producer.close();
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Both consumers should have received messages (distributed)
        const totalReceived = received1.length + received2.length;
        expect(totalReceived).toBe(4);

        await consumer1.close();
        await consumer2.close();
      }
    });
  });

  describe('Message Acknowledgment', () => {
    test('should acknowledge message', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        let ackResult: any;

        await consumer.subscribe('test-ack', async (msg) => {
          ackResult = await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        await adapter.publish('test-ack', { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(isOk(ackResult)).toBe(true);
        await consumer.close();
      }
    });

    test('should prevent double acknowledgment', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        let secondAckResult: any;

        await consumer.subscribe('test-double-ack', async (msg) => {
          await msg.ack();
          secondAckResult = await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        await adapter.publish('test-double-ack', { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 500));

        expect(isErr(secondAckResult)).toBe(true);
        await consumer.close();
      }
    });

    test('should nack message with requeue', async () => {
      let receiveCount = 0;

      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe('test-nack', async (msg) => {
          receiveCount++;
          if (receiveCount === 1) {
            await msg.nack(true); // Requeue
          } else {
            await msg.ack();
          }
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        await adapter.publish('test-nack', { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Should have received twice (initial + requeued)
        expect(receiveCount).toBeGreaterThanOrEqual(2);

        await consumer.close();
      }
    });
  });
});
