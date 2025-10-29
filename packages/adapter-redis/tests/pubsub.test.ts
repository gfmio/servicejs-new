/**
 * Tests for Redis Pub/Sub Adapter
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { createRedisPubSub } from '../src/index.js';
import { isOk, isErr } from '@servicejs/result';
import type { MessageQueueAdapter } from '@servicejs/integration-mq';

describe('Redis Pub/Sub Adapter', () => {
  let container: StartedTestContainer;
  let adapter: MessageQueueAdapter;

  beforeEach(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withStartupTimeout(120000)
      .start();

    adapter = createRedisPubSub();
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
      await adapter.destroy();
    }
    if (container) {
      await container.stop();
    }
  });

  describe('Lifecycle', () => {
    test('should initialize with valid config', async () => {
      const result = await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      expect(isOk(result)).toBe(true);
    });

    test('should start after initialization', async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });

      const result = await adapter.start();
      expect(isOk(result)).toBe(true);
    });

    test('should stop after starting', async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();

      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy resources', async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();

      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);

      // Re-initialize for other tests
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });
  });

  describe('Health Checks', () => {
    test('should report healthy when connected', async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();

      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });
  });

  describe('Producer', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

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

        const result = await producer.publish('test-queue', { message: 'Hello' }, { attributes });
        expect(isOk(result)).toBe(true);
        await producer.close();
      }
    });
  });

  describe('Consumer', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

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
        await new Promise((resolve) => setTimeout(resolve, 100));

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
        await new Promise((resolve) => setTimeout(resolve, 200));

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

        await new Promise((resolve) => setTimeout(resolve, 100));

        const producerResult = await adapter.createProducer();
        if (isOk(producerResult)) {
          const producer = producerResult.value;
          const attributes = new Map([['key', 'value']]);
          await producer.publish('test-attributes', { test: 'data' }, { attributes });
          await producer.close();
        }

        await new Promise((resolve) => setTimeout(resolve, 200));

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
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('should publish message directly', async () => {
      const result = await adapter.publish('test-quick', { message: 'Quick publish' });
      expect(isOk(result)).toBe(true);
    });
  });

  describe('Fan-Out Pattern', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('should deliver message to multiple consumers', async () => {
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

        await consumer1.subscribe('test-fanout', async (msg) => {
          received1.push(msg.data);
          await msg.ack();
        });

        await consumer2.subscribe('test-fanout', async (msg) => {
          received2.push(msg.data);
          await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Publish message
        await adapter.publish('test-fanout', { message: 'Broadcast' });

        await new Promise((resolve) => setTimeout(resolve, 200));

        // Both consumers should receive the message
        expect(received1.length).toBe(1);
        expect(received2.length).toBe(1);
        expect(received1[0]).toEqual({ message: 'Broadcast' });
        expect(received2[0]).toEqual({ message: 'Broadcast' });

        await consumer1.close();
        await consumer2.close();
      }
    });
  });

  describe('Message Acknowledgment', () => {
    beforeEach(async () => {
      await adapter.init({
        host: container.getHost(),
        port: container.getMappedPort(6379),
      });
      await adapter.start();
    });

    test('should acknowledge message', async () => {
      const consumerResult = await adapter.createConsumer();
      expect(isOk(consumerResult)).toBe(true);

      if (isOk(consumerResult)) {
        const consumer = consumerResult.value;
        let ackResult: any;

        await consumer.subscribe('test-ack', async (msg) => {
          ackResult = await msg.ack();
        });

        await new Promise((resolve) => setTimeout(resolve, 100));

        await adapter.publish('test-ack', { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 200));

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

        await new Promise((resolve) => setTimeout(resolve, 100));

        await adapter.publish('test-double-ack', { test: 'data' });

        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(isErr(secondAckResult)).toBe(true);
        await consumer.close();
      }
    });
  });
});
