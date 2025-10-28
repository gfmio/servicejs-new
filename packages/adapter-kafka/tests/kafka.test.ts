/**
 * Tests for Kafka Adapter
 *
 * These tests require Docker to be installed and running
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createKafkaAdapter } from '../src/kafka.js';
import { isOk, isErr } from '@servicejs/result';
import type { MessageQueueAdapter } from '@servicejs/integration-mq';
import { startKafkaContainer, isDockerAvailable, type KafkaContainer } from './kafka-container.js';

let kafkaContainer: KafkaContainer | null = null;
let adapter: MessageQueueAdapter;

// Check if Docker is available, skip tests if not
const dockerAvailable = await isDockerAvailable();

if (!dockerAvailable) {
  console.log('⚠️  Docker not available, skipping Kafka tests');
  console.log('   Install Docker to run these tests: https://www.docker.com/get-started\n');
}

const describeWithDocker = dockerAvailable ? describe : describe.skip;

describeWithDocker('Kafka Adapter', () => {
  beforeAll(async () => {
    if (!dockerAvailable) return;

    kafkaContainer = await startKafkaContainer();
    adapter = createKafkaAdapter();
  }, 180000); // 3 minute timeout for Kafka startup

  afterAll(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (kafkaContainer) {
      await kafkaContainer.stop();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({
        brokers: [`${kafkaContainer!.host}:${kafkaContainer!.port}`],
        clientId: 'test-client',
        groupId: 'test-group',
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
        brokers: [`${kafkaContainer!.host}:${kafkaContainer!.port}`],
        clientId: 'test-client',
        groupId: 'test-group',
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
    }, 30000);

    test('should publish message', async () => {
      const producerResult = await adapter.createProducer();
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const producer = producerResult.value;
        const result = await producer.publish('test-topic', { message: 'Hello' });
        expect(isOk(result)).toBe(true);
        await producer.close();
      }
    }, 30000);

    test('should publish with attributes', async () => {
      const producerResult = await adapter.createProducer();
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const producer = producerResult.value;
        const attributes = new Map([
          ['priority', 'high'],
          ['type', 'notification'],
        ]);

        const result = await producer.publish('test-attrs', { message: 'Hello' }, { attributes });
        expect(isOk(result)).toBe(true);
        await producer.close();
      }
    }, 30000);

    test('should return message ID on publish', async () => {
      const producerResult = await adapter.createProducer();
      expect(isOk(producerResult)).toBe(true);

      if (isOk(producerResult)) {
        const producer = producerResult.value;
        const result = await producer.publish('test-msgid', { test: 'data' });

        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value).toBeDefined();
          expect(typeof result.value).toBe('string');
          expect(result.value.length).toBeGreaterThan(0);
        }
        await producer.close();
      }
    }, 30000);
  });

  describe('Consumer', () => {
    test('should create consumer', async () => {
      const result = await adapter.createConsumer({ consumerGroup: 'test-consumer-1' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        await result.value.close();
      }
    }, 30000);

    test('should subscribe to topic', async () => {
      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-subscribe' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        // Create the topic first
        await adapter.publish('test-sub-topic', { init: true });

        // Now subscribe (topic exists, consumer will get new messages)
        const result = await consumer.subscribe('test-sub-topic', async (msg) => {
          await msg.ack();
        });
        expect(isOk(result)).toBe(true);
        await consumer.close();
      }
    }, 30000);

    test('should receive published messages', async () => {
      const received: unknown[] = [];
      const topicName = 'test-receive-topic';

      // Create consumer
      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-receive-group' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe<{ message: string }>(topicName, async (msg) => {
          received.push(msg.data);
          await msg.ack();
        });

        // Wait for consumer to be ready (consumer group needs time to rebalance)
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Create producer and publish
        const producerResult = await adapter.createProducer();
        expect(isOk(producerResult)).toBe(true);

        if (isOk(producerResult)) {
          const producer = producerResult.value;
          await producer.publish(topicName, { message: 'Test 1' });
          await producer.publish(topicName, { message: 'Test 2' });
          await producer.close();
        }

        // Wait for messages to be received
        await new Promise((resolve) => setTimeout(resolve, 5000));

        expect(received.length).toBe(2);
        expect(received[0]).toEqual({ message: 'Test 1' });
        expect(received[1]).toEqual({ message: 'Test 2' });

        await consumer.close();
      }
    }, 60000);

    test('should handle message attributes', async () => {
      let receivedAttributes: ReadonlyMap<string, string> | undefined;
      const topicName = 'test-attrs-topic';

      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-attrs-group' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;

        await consumer.subscribe(topicName, async (msg) => {
          receivedAttributes = msg.attributes;
          await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        const producerResult = await adapter.createProducer();
        if (isOk(producerResult)) {
          const producer = producerResult.value;
          const attributes = new Map([['key', 'value']]);
          await producer.publish(topicName, { test: 'data' }, { attributes });
          await producer.close();
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

        expect(receivedAttributes).toBeDefined();
        expect(receivedAttributes?.get('key')).toBe('value');

        await consumer.close();
      }
    }, 60000);

    test('should have consumer ID', async () => {
      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-id-group' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        expect(consumer.id).toBeDefined();
        expect(typeof consumer.id).toBe('string');
        expect(consumer.id.length).toBeGreaterThan(0);
        await consumer.close();
      }
    }, 30000);
  });

  describe('Quick Publish', () => {
    test('should publish message directly', async () => {
      const result = await adapter.publish('test-quick-topic', { message: 'Quick publish' });
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBeDefined();
        expect(typeof result.value).toBe('string');
      }
    }, 30000);
  });

  describe('Consumer Groups', () => {
    test('should distribute messages across consumers in same group', async () => {
      const received1: unknown[] = [];
      const received2: unknown[] = [];
      const topicName = 'test-group-topic';
      const groupId = 'test-load-balance-group';

      // Create two consumers in the same group
      const consumer1Result = await adapter.createConsumer({ consumerGroup: groupId });
      const consumer2Result = await adapter.createConsumer({ consumerGroup: groupId });

      expect(isOk(consumer1Result)).toBe(true);
      expect(isOk(consumer2Result)).toBe(true);

      if (isOk(consumer1Result) && isOk(consumer2Result)) {
        const consumer1 = consumer1Result.value;
        const consumer2 = consumer2Result.value;

        await consumer1.subscribe(topicName, async (msg) => {
          received1.push(msg.data);
          await msg.ack();
        });

        await consumer2.subscribe(topicName, async (msg) => {
          received2.push(msg.data);
          await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Publish multiple messages
        const producerResult = await adapter.createProducer();
        if (isOk(producerResult)) {
          const producer = producerResult.value;
          for (let i = 0; i < 4; i++) {
            await producer.publish(topicName, { message: `Message ${i}` });
          }
          await producer.close();
        }

        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Messages should be distributed (at least one consumer got messages)
        const totalReceived = received1.length + received2.length;
        expect(totalReceived).toBeGreaterThan(0);

        await consumer1.close();
        await consumer2.close();
      }
    }, 90000);
  });

  describe('Message Acknowledgment', () => {
    test('should acknowledge message', async () => {
      const topicName = 'test-ack-topic';
      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-ack-group' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        let ackResult: any;

        await consumer.subscribe(topicName, async (msg) => {
          ackResult = await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        await adapter.publish(topicName, { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        expect(isOk(ackResult)).toBe(true);
        await consumer.close();
      }
    }, 60000);

    test('should prevent double acknowledgment', async () => {
      const topicName = 'test-double-ack-topic';
      const consumerResult = await adapter.createConsumer({ consumerGroup: 'test-double-ack-group' });
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        let secondAckResult: any;

        await consumer.subscribe(topicName, async (msg) => {
          await msg.ack();
          secondAckResult = await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        await adapter.publish(topicName, { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        expect(isErr(secondAckResult)).toBe(true);
        await consumer.close();
      }
    }, 60000);
  });

  describe('Error Handling', () => {
    test('should fail to create consumer without group ID', async () => {
      const newAdapter = createKafkaAdapter();
      await newAdapter.init({
        brokers: [`${kafkaContainer!.host}:${kafkaContainer!.port}`],
        clientId: 'test-no-group',
        // No groupId specified
      });
      await newAdapter.start();

      const result = await newAdapter.createConsumer();
      expect(isErr(result)).toBe(true);

      await newAdapter.stop();
      await newAdapter.destroy();
    }, 30000);

    test('should fail to initialize without brokers', async () => {
      const newAdapter = createKafkaAdapter();
      const result = await newAdapter.init({
        brokers: [],
        clientId: 'test-no-brokers',
      });
      expect(isErr(result)).toBe(true);
    });
  });
});
