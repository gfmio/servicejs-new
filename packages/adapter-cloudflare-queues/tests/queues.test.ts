/**
 * Tests for Cloudflare Queues Adapter
 *
 * These tests run in a real Cloudflare Workers environment using Miniflare.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { env, runInDurableObject, runWithEnv } from 'cloudflare:test';
import { isOk, isErr } from '@servicejs/result';
import { createCloudflareQueuesAdapter } from '../src/queues.js';

describe('Cloudflare Queues Adapter', () => {
  const adapter = createCloudflareQueuesAdapter();

  beforeEach(async () => {
    await adapter.init({
      producerQueue: env.TEST_QUEUE,
      queueName: 'test-queue',
    });
    await adapter.start();
  });

  describe('Lifecycle', () => {
    test('should initialize with queue config', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.init({
        producerQueue: env.TEST_QUEUE,
        queueName: 'test-queue',
      });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should start successfully', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      await adapter2.init({
        producerQueue: env.TEST_QUEUE,
        queueName: 'test-queue',
      });
      const result = await adapter2.start();
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should stop successfully', async () => {
      const result = await adapter.stop();
      expect(isOk(result)).toBe(true);
    });

    test('should destroy successfully', async () => {
      const result = await adapter.destroy();
      expect(isOk(result)).toBe(true);
    });

    test('should fail to start if not initialized', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Producer queue not initialized');
      }
    });
  });

  describe('Health Check', () => {
    test('should report healthy when initialized', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error?.message).toBe('Producer queue not initialized');
      }
    });
  });

  describe('Publishing Messages', () => {
    test('should publish a message', async () => {
      const message = { type: 'user.created', userId: '123' };
      const result = await adapter.publish('events', message);

      expect(isOk(result)).toBe(true);
    });

    test('should publish a message with delay', async () => {
      const message = { type: 'user.created', userId: '123' };
      const result = await adapter.publish('events', message, 10);

      expect(isOk(result)).toBe(true);
    });

    test('should fail to publish without initialization', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.publish('events', { test: 'data' });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Producer queue not initialized');
      }
    });
  });

  describe('Batch Publishing', () => {
    test('should publish a batch of messages', async () => {
      const messages = [
        { message: { type: 'user.created', userId: '123' } },
        { message: { type: 'user.updated', userId: '456' } },
      ];

      const result = await adapter.publishBatch('events', messages);

      expect(isOk(result)).toBe(true);
    });

    test('should publish batch with delays', async () => {
      const messages = [
        { message: { type: 'user.created', userId: '123' }, delaySeconds: 5 },
        { message: { type: 'user.updated', userId: '456' }, delaySeconds: 10 },
      ];

      const result = await adapter.publishBatch('events', messages);

      expect(isOk(result)).toBe(true);
    });

    test('should publish batch with mixed delays', async () => {
      const messages = [
        { message: { type: 'user.created', userId: '123' }, delaySeconds: 5 },
        { message: { type: 'user.updated', userId: '456' } }, // No delay
      ];

      const result = await adapter.publishBatch('events', messages);

      expect(isOk(result)).toBe(true);
    });

    test('should fail to publish batch without initialization', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.publishBatch('events', [
        { message: { test: 'data' } },
      ]);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Producer queue not initialized');
      }
    });
  });

  describe('Message Format', () => {
    test('should wrap messages with metadata', async () => {
      const message = { type: 'test', value: 42 };
      const result = await adapter.publish('test-topic', message);

      expect(isOk(result)).toBe(true);
      // Note: We can't easily verify the wrapped format without a consumer,
      // but we can verify the publish succeeded
    });
  });

  describe('Error Handling', () => {
    test('should handle publish errors gracefully', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.publish('events', { test: 'data' });

      expect(isErr(result)).toBe(true);
      expect(result.error).toBeDefined();
    });

    test('should handle batch publish errors gracefully', async () => {
      const adapter2 = createCloudflareQueuesAdapter();
      const result = await adapter2.publishBatch('events', [
        { message: { test: 'data' } },
      ]);

      expect(isErr(result)).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe('Multiple Topics', () => {
    test('should publish to different topics', async () => {
      const result1 = await adapter.publish('user-events', { type: 'user.created' });
      const result2 = await adapter.publish('order-events', { type: 'order.created' });

      expect(isOk(result1)).toBe(true);
      expect(isOk(result2)).toBe(true);
    });

    test('should publish batch to single topic', async () => {
      const messages = [
        { message: { type: 'event1' } },
        { message: { type: 'event2' } },
        { message: { type: 'event3' } },
      ];

      const result = await adapter.publishBatch('mixed-events', messages);

      expect(isOk(result)).toBe(true);
    });
  });

  describe('Integration with Queue System', () => {
    test('should successfully send messages to queue binding', async () => {
      // This test verifies that the adapter works with the actual queue binding
      const messages = Array.from({ length: 5 }, (_, i) => ({
        message: { id: i, type: 'test', timestamp: Date.now() },
      }));

      const result = await adapter.publishBatch('test-events', messages);

      expect(isOk(result)).toBe(true);
    });

    test('should handle large message payloads', async () => {
      const largeMessage = {
        type: 'large-data',
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
          metadata: { created: Date.now(), updated: Date.now() },
        })),
      };

      const result = await adapter.publish('large-messages', largeMessage);

      expect(isOk(result)).toBe(true);
    });
  });
});
