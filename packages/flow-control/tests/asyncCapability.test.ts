/**
 * Tests for async capability with backpressure
 */

import { describe, test, expect } from 'bun:test';
import { createCapability } from '@servicejs/core';
import { createAsyncCapability } from '../src/asyncCapability.js';

interface TestMessage {
  readonly type: 'test';
  readonly value: number;
}

describe('createAsyncCapability', () => {
  test('creates async capability', () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 10 }
    );

    expect(asyncCap.queueSize()).toBe(0);
    expect(asyncCap.isFull()).toBe(false);
  });

  test('sendAsync sends message', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 10 }
    );

    await asyncCap.sendAsync({ type: 'test', value: 1 });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.value).toBe(1);
  });

  test('isFull returns true when queue is full', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 3 }
    );

    await asyncCap.sendAsync({ type: 'test', value: 1 });
    await asyncCap.sendAsync({ type: 'test', value: 2 });
    await asyncCap.sendAsync({ type: 'test', value: 3 });

    expect(asyncCap.isFull()).toBe(true);
  });

  test('sendAsync waits when queue is full', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 2, pollInterval: 10 }
    );

    // Fill the queue
    await asyncCap.sendAsync({ type: 'test', value: 1 });
    await asyncCap.sendAsync({ type: 'test', value: 2 });

    expect(asyncCap.isFull()).toBe(true);

    // Start sending while full (will wait)
    const sendPromise = asyncCap.sendAsync({ type: 'test', value: 3 });

    // Wait a bit to ensure it's waiting
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Should still have only 2 messages
    expect(messages).toHaveLength(2);

    // Consume a message to make space
    messages.shift();

    // Now the waiting send should complete
    await sendPromise;

    expect(messages).toHaveLength(2);
    expect(messages[1]?.value).toBe(3);
  });

  test('multiple sendAsync wait in order', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 1, pollInterval: 5 }
    );

    // Fill queue
    await asyncCap.sendAsync({ type: 'test', value: 1 });

    // Start multiple sends (will all wait)
    const send2 = asyncCap.sendAsync({ type: 'test', value: 2 });
    const send3 = asyncCap.sendAsync({ type: 'test', value: 3 });

    await new Promise((resolve) => setTimeout(resolve, 20));

    // Consume first message
    messages.shift();
    await send2;

    // Consume second message
    messages.shift();
    await send3;

    expect(messages).toHaveLength(1);
    expect(messages[0]?.value).toBe(3);
  });

  test('queueSize returns current size', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 10 }
    );

    expect(asyncCap.queueSize()).toBe(0);

    await asyncCap.sendAsync({ type: 'test', value: 1 });
    expect(asyncCap.queueSize()).toBe(1);

    await asyncCap.sendAsync({ type: 'test', value: 2 });
    expect(asyncCap.queueSize()).toBe(2);
  });

  test('custom poll interval', async () => {
    const messages: TestMessage[] = [];
    const capability = createCapability<TestMessage>((msg) => messages.push(msg));

    const asyncCap = createAsyncCapability(
      capability,
      () => messages.length,
      { maxQueueSize: 1, pollInterval: 20 }
    );

    await asyncCap.sendAsync({ type: 'test', value: 1 });

    const start = Date.now();
    const sendPromise = asyncCap.sendAsync({ type: 'test', value: 2 });

    await new Promise((resolve) => setTimeout(resolve, 30));
    messages.shift();
    await sendPromise;

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });
});
