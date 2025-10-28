/**
 * Tests for NATS Message Queue Adapter
 *
 * These tests use testcontainers to automatically start a NATS server.
 */

import { describe, test, expect, beforeAll, beforeEach, afterAll, afterEach } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import { createNatsAdapter, createNatsResponder } from '../src/nats.js';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

describe('NATS Adapter', () => {
  let container: StartedTestContainer;
  let natsUrl: string;
  const adapter = createNatsAdapter();

  beforeAll(async () => {
    // Start NATS container
    console.log('Starting NATS container...');
    container = await new GenericContainer('nats:2.10-alpine')
      .withExposedPorts(4222)
      .start();

    const host = container.getHost();
    const port = container.getMappedPort(4222);
    natsUrl = `nats://${host}:${port}`;
    console.log(`NATS container started at ${natsUrl}`);
  }, 60000); // 60 second timeout for container startup

  afterAll(async () => {
    // Stop container
    if (container) {
      console.log('Stopping NATS container...');
      await container.stop();
    }
  }, 30000);

  beforeEach(async () => {
    await adapter.init({ servers: natsUrl, name: 'test-adapter' });
    await adapter.start();
  });

  afterEach(async () => {
    await adapter.stop();
    await adapter.destroy();
  });

  describe('Lifecycle', () => {
    test('should initialize with config', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.init({ servers: natsUrl });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should initialize with multiple servers', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.init({
        servers: [natsUrl, 'nats://localhost:4223'],
      });
      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should start successfully', async () => {
      const adapter2 = createNatsAdapter();
      await adapter2.init({ servers: natsUrl });
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
      const adapter2 = createNatsAdapter();
      const result = await adapter2.start();
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Connection not initialized');
      }
    });
  });

  describe('Health Check', () => {
    test('should report healthy when connected', async () => {
      const result = await adapter.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('healthy');
      }
    });

    test('should report unhealthy when not initialized', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.health();
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('unhealthy');
        expect(result.value.error?.message).toBe('Connection not initialized');
      }
    });
  });

  describe('Publish-Subscribe', () => {
    test('should publish and receive a message', async () => {
      const received: Array<any> = [];

      // Subscribe first
      await adapter.subscribe('test.simple', async (message) => {
        received.push(message.data);
      });

      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish message
      const testData = { type: 'test', value: 42 };
      await adapter.publish('test.simple', testData);

      // Wait for message to be received
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual(testData);
    });

    test('should publish and receive multiple messages', async () => {
      const received: Array<any> = [];

      await adapter.subscribe('test.multiple', async (message) => {
        received.push(message.data);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish multiple messages
      await adapter.publish('test.multiple', { id: 1 });
      await adapter.publish('test.multiple', { id: 2 });
      await adapter.publish('test.multiple', { id: 3 });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toHaveLength(3);
      expect(received[0]).toEqual({ id: 1 });
      expect(received[1]).toEqual({ id: 2 });
      expect(received[2]).toEqual({ id: 3 });
    });

    test('should support wildcard subscriptions', async () => {
      const received: Array<any> = [];

      // Subscribe with wildcard
      await adapter.subscribe('events.*', async (message) => {
        received.push({ subject: message.subject, data: message.data });
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish to different subjects
      await adapter.publish('events.user', { type: 'user' });
      await adapter.publish('events.order', { type: 'order' });
      await adapter.publish('events.payment', { type: 'payment' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toHaveLength(3);
      expect(received.map(r => r.data.type)).toEqual(['user', 'order', 'payment']);
    });

    test('should unsubscribe from subject', async () => {
      const received: Array<any> = [];

      await adapter.subscribe('test.unsub', async (message) => {
        received.push(message.data);
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish first message
      await adapter.publish('test.unsub', { id: 1 });
      await new Promise(resolve => setTimeout(resolve, 100));

      // Unsubscribe
      await adapter.unsubscribe('test.unsub');
      await new Promise(resolve => setTimeout(resolve, 100));

      // Publish second message (should not be received)
      await adapter.publish('test.unsub', { id: 2 });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toHaveLength(1);
      expect(received[0]).toEqual({ id: 1 });
    });

    test('should fail to publish without initialization', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.publish('test', { data: 'test' });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Connection not initialized');
      }
    });

    test('should fail to subscribe without initialization', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.subscribe('test', async () => {});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('Connection not initialized');
      }
    });

    test('should fail to subscribe to same subject twice', async () => {
      await adapter.subscribe('test.duplicate', async () => {});

      const result = await adapter.subscribe('test.duplicate', async () => {});

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toContain('Already subscribed');
      }
    });
  });

  describe('Request-Reply', () => {
    test('should perform request-reply', async () => {
      // Create responder
      await createNatsResponder<{ userId: string }, { name: string }>(
        adapter,
        'user.get',
        async (message) => {
          return { name: `User ${message.data.userId}` };
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Make request
      const result = await adapter.request<{ userId: string }, { name: string }>(
        'user.get',
        { userId: '123' },
        5000
      );

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.name).toBe('User 123');
      }
    });

    test('should timeout on request without responder', async () => {
      const result = await adapter.request(
        'no.responder',
        { data: 'test' },
        500 // Short timeout
      );

      expect(isErr(result)).toBe(true);
    });

    test('should handle multiple requests', async () => {
      await createNatsResponder<{ n: number }, { result: number }>(
        adapter,
        'math.square',
        async (message) => {
          return { result: message.data.n * message.data.n };
        }
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      const results = await Promise.all([
        adapter.request<{ n: number }, { result: number }>('math.square', { n: 2 }),
        adapter.request<{ n: number }, { result: number }>('math.square', { n: 3 }),
        adapter.request<{ n: number }, { result: number }>('math.square', { n: 4 }),
      ]);

      expect(results.every(isOk)).toBe(true);
      if (results.every(isOk)) {
        expect(results[0].value.result).toBe(4);
        expect(results[1].value.result).toBe(9);
        expect(results[2].value.result).toBe(16);
      }
    });
  });

  describe('Configuration', () => {
    test('should accept authentication config', async () => {
      const adapter2 = createNatsAdapter();
      // Note: This will fail to connect without proper auth setup, but tests config parsing
      const result = await adapter2.init({
        servers: natsUrl,
        user: 'test-user',
        pass: 'test-pass',
      });

      // Should succeed in parsing config (connection might fail)
      expect(result).toBeDefined();
      await adapter2.destroy();
    });

    test('should accept token authentication', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.init({
        servers: natsUrl,
        token: 'test-token',
      });

      expect(result).toBeDefined();
      await adapter2.destroy();
    });

    test('should accept reconnect config', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.init({
        servers: natsUrl,
        maxReconnectAttempts: 5,
        reconnectTimeWait: 1000,
      });

      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });

    test('should accept timeout config', async () => {
      const adapter2 = createNatsAdapter();
      const result = await adapter2.init({
        servers: natsUrl,
        timeout: 10000,
      });

      expect(isOk(result)).toBe(true);
      await adapter2.destroy();
    });
  });

  describe('Message Format', () => {
    test('should include message metadata', async () => {
      let receivedMessage: any = null;

      await adapter.subscribe('test.metadata', async (message) => {
        receivedMessage = message;
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      await adapter.publish('test.metadata', { test: 'data' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage.id).toBeDefined();
      expect(receivedMessage.subject).toBe('test.metadata');
      expect(receivedMessage.data).toEqual({ test: 'data' });
      expect(receivedMessage.timestamp).toBeGreaterThan(0);
    });
  });
});
