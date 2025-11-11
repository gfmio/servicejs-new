/**
 * Tests for queue handler
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { createQueueHandler } from '../src/queue-handler';
import { isOk } from '@servicejs/result';

interface MockEnv {
  TEST_VAR: string;
}

interface TestMessage {
  type: string;
  data: string;
}

// Mock Message
class MockMessage<Body = unknown> implements Message<Body> {
  private acknowledged = false;
  private retried = false;

  constructor(
    public id: string,
    public timestamp: Date,
    public body: Body,
    public attempts = 0
  ) {}

  ack(): void {
    this.acknowledged = true;
  }

  retry(): void {
    this.retried = true;
  }

  isAcknowledged(): boolean {
    return this.acknowledged;
  }

  isRetried(): boolean {
    return this.retried;
  }
}

// Mock MessageBatch
class MockMessageBatch<Body = unknown> implements MessageBatch<Body> {
  constructor(
    public queue: string,
    public messages: MockMessage<Body>[]
  ) {}

  ackAll(): void {
    this.messages.forEach((msg) => msg.ack());
  }

  retryAll(): void {
    this.messages.forEach((msg) => msg.retry());
  }
}

describe('Queue Handler', () => {
  let handler: ReturnType<typeof createQueueHandler<MockEnv, TestMessage>>;
  let env: MockEnv;
  let ctx: ExecutionContext;

  beforeEach(async () => {
    handler = createQueueHandler<MockEnv, TestMessage>();
    await handler.init();

    env = { TEST_VAR: 'test-value' };
    ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };
  });

  test('initializes successfully', async () => {
    const result = await handler.init();
    expect(isOk(result)).toBe(true);
  });

  test('handles queue messages', async () => {
    let batchReceived = false;
    let messageCount = 0;

    handler.onQueue(async (batch) => {
      batchReceived = true;
      messageCount = batch.messages.length;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'message 1' }),
      new MockMessage('msg-2', new Date(), { type: 'test', data: 'message 2' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(batchReceived).toBe(true);
    expect(messageCount).toBe(2);
  });

  test('provides access to queue name', async () => {
    let receivedQueueName = '';

    handler.onQueue(async (batch) => {
      receivedQueueName = batch.queue;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('my-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(receivedQueueName).toBe('my-queue');
  });

  test('provides access to message details', async () => {
    let receivedMessages: any[] = [];

    handler.onQueue(async (batch) => {
      receivedMessages = batch.messages.map((msg) => ({
        id: msg.id,
        timestamp: msg.timestamp,
        body: msg.body,
      }));
    });

    const timestamp1 = new Date('2024-01-01T00:00:00Z');
    const timestamp2 = new Date('2024-01-01T00:01:00Z');

    const messages = [
      new MockMessage('msg-1', timestamp1, { type: 'foo', data: 'bar' }),
      new MockMessage('msg-2', timestamp2, { type: 'baz', data: 'qux' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(receivedMessages).toEqual([
      { id: 'msg-1', timestamp: timestamp1, body: { type: 'foo', data: 'bar' } },
      { id: 'msg-2', timestamp: timestamp2, body: { type: 'baz', data: 'qux' } },
    ]);
  });

  test('provides access to environment', async () => {
    let receivedEnv: MockEnv | null = null;

    handler.onQueue(async (batch, env) => {
      receivedEnv = env;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(receivedEnv).toBe(env);
    expect(receivedEnv?.TEST_VAR).toBe('test-value');
  });

  test('provides access to execution context', async () => {
    let receivedCtx: ExecutionContext | null = null;

    handler.onQueue(async (batch, env, ctx) => {
      receivedCtx = ctx;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(receivedCtx).toBe(ctx);
  });

  test('automatically acknowledges messages on success', async () => {
    handler.onQueue(async (batch) => {
      // Process successfully
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data1' }),
      new MockMessage('msg-2', new Date(), { type: 'test', data: 'data2' }),
      new MockMessage('msg-3', new Date(), { type: 'test', data: 'data3' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    // All messages should be acknowledged
    expect(messages[0].isAcknowledged()).toBe(true);
    expect(messages[1].isAcknowledged()).toBe(true);
    expect(messages[2].isAcknowledged()).toBe(true);
  });

  test('does not acknowledge messages on error', async () => {
    handler.onQueue(async (batch) => {
      throw new Error('Processing error');
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);

    try {
      await handler.handleQueue(batch, env, ctx);
    } catch (error) {
      // Expected to throw
    }

    // Message should not be acknowledged
    expect(messages[0].isAcknowledged()).toBe(false);
  });

  test('handles errors with error handler', async () => {
    let errorCaught: Error | null = null;

    handler.onQueue(async () => {
      throw new Error('Queue processing error');
    });

    handler.onError((error) => {
      errorCaught = error;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);

    try {
      await handler.handleQueue(batch, env, ctx);
    } catch (error) {
      // Expected to throw
    }

    expect(errorCaught).toBeInstanceOf(Error);
    expect(errorCaught?.message).toBe('Queue processing error');
  });

  test('handles large batches', async () => {
    let processedCount = 0;

    handler.onQueue(async (batch) => {
      processedCount = batch.messages.length;
    });

    const messages = Array.from({ length: 100 }, (_, i) =>
      new MockMessage(`msg-${i}`, new Date(), { type: 'test', data: `data-${i}` })
    );

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(processedCount).toBe(100);
    expect(messages.every((msg) => msg.isAcknowledged())).toBe(true);
  });

  test('can process messages individually', async () => {
    const processedIds: string[] = [];

    handler.onQueue(async (batch) => {
      for (const message of batch.messages) {
        processedIds.push(message.id);
      }
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data1' }),
      new MockMessage('msg-2', new Date(), { type: 'test', data: 'data2' }),
      new MockMessage('msg-3', new Date(), { type: 'test', data: 'data3' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(processedIds).toEqual(['msg-1', 'msg-2', 'msg-3']);
  });

  test('supports async processing', async () => {
    let asyncCompleted = false;

    handler.onQueue(async (batch) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      asyncCompleted = true;
    });

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await handler.handleQueue(batch, env, ctx);

    expect(asyncCompleted).toBe(true);
  });

  test('handles empty batches', async () => {
    let handlerCalled = false;

    handler.onQueue(async (batch) => {
      handlerCalled = true;
      expect(batch.messages.length).toBe(0);
    });

    const batch = new MockMessageBatch('test-queue', []);
    await handler.handleQueue(batch, env, ctx);

    expect(handlerCalled).toBe(true);
  });

  test('can update handler registration', async () => {
    let firstHandlerCalled = false;
    let secondHandlerCalled = false;

    handler.onQueue(async () => {
      firstHandlerCalled = true;
    });

    const messages1 = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];
    const batch1 = new MockMessageBatch('test-queue', messages1);
    await handler.handleQueue(batch1, env, ctx);

    expect(firstHandlerCalled).toBe(true);
    expect(secondHandlerCalled).toBe(false);

    // Update handler
    handler.onQueue(async () => {
      secondHandlerCalled = true;
    });

    const messages2 = [
      new MockMessage('msg-2', new Date(), { type: 'test', data: 'data' }),
    ];
    const batch2 = new MockMessageBatch('test-queue', messages2);
    await handler.handleQueue(batch2, env, ctx);

    expect(secondHandlerCalled).toBe(true);
  });

  test('handles different message body types', async () => {
    interface ComplexMessage {
      userId: string;
      action: string;
      metadata: Record<string, any>;
    }

    const complexHandler = createQueueHandler<MockEnv, ComplexMessage>();
    await complexHandler.init();

    let receivedBody: ComplexMessage | null = null;

    complexHandler.onQueue(async (batch) => {
      receivedBody = batch.messages[0].body;
    });

    const messages = [
      new MockMessage<ComplexMessage>('msg-1', new Date(), {
        userId: '123',
        action: 'login',
        metadata: { ip: '192.168.1.1', userAgent: 'Test' },
      }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);
    await complexHandler.handleQueue(batch, env, ctx);

    expect(receivedBody).toEqual({
      userId: '123',
      action: 'login',
      metadata: { ip: '192.168.1.1', userAgent: 'Test' },
    });
  });

  test('throws error when no handler is registered', async () => {
    // Create a new handler without registering any handler
    const newHandler = createQueueHandler<MockEnv, TestMessage>();
    await newHandler.init();

    const messages = [
      new MockMessage('msg-1', new Date(), { type: 'test', data: 'data' }),
    ];

    const batch = new MockMessageBatch('test-queue', messages);

    // Should throw error
    await expect(newHandler.handleQueue(batch, env, ctx)).rejects.toThrow('No queue handler registered');
  });
});
