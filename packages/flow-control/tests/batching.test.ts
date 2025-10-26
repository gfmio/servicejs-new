/**
 * Tests for batching capability
 */

import { describe, test, expect } from 'bun:test';
import { createCapability } from '@servicejs/core';
import { createBatchingCapability, type BatchMessage } from '../src/batching.js';

interface TestMessage {
  readonly type: 'log';
  readonly message: string;
}

describe('createBatchingCapability', () => {
  test('creates batching capability', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 10,
      maxBatchDelay: 1000,
    });

    expect(batcher.getBatchSize()).toBe(0);
  });

  test('accumulates messages in batch', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 10,
      maxBatchDelay: 10000,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });
    batcher.send({ type: 'log', message: 'msg3' });

    expect(batcher.getBatchSize()).toBe(3);
    expect(batches).toHaveLength(0); // Not flushed yet
  });

  test('flushes on max batch size', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 3,
      maxBatchDelay: 10000,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });

    expect(batches).toHaveLength(0);

    // Third message triggers flush
    batcher.send({ type: 'log', message: 'msg3' });

    expect(batches).toHaveLength(1);
    expect(batches[0]?.messages).toHaveLength(3);
    expect(batcher.getBatchSize()).toBe(0);
  });

  test('flushes on max batch delay', async () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 100,
      maxBatchDelay: 50,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });

    expect(batches).toHaveLength(0);

    // Wait for delay to trigger flush
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(batches).toHaveLength(1);
    expect(batches[0]?.messages).toHaveLength(2);
  });

  test('manual flush sends current batch', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 100,
      maxBatchDelay: 10000,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });

    const flushedCount = batcher.flush();

    expect(flushedCount).toBe(2);
    expect(batches).toHaveLength(1);
    expect(batcher.getBatchSize()).toBe(0);
  });

  test('flush returns 0 for empty batch', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability);

    const flushedCount = batcher.flush();

    expect(flushedCount).toBe(0);
    expect(batches).toHaveLength(0);
  });

  test('stop flushes and clears timer', async () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 100,
      maxBatchDelay: 10000,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });

    batcher.stop();

    expect(batches).toHaveLength(1);
    expect(batches[0]?.messages).toHaveLength(2);

    // Wait to ensure timer doesn't fire
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(batches).toHaveLength(1); // Still only 1 batch
  });

  test('calls onFlush callback', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const flushSizes: number[] = [];

    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 3,
      maxBatchDelay: 10000,
      onFlush: (size) => flushSizes.push(size),
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });
    batcher.send({ type: 'log', message: 'msg3' });

    expect(flushSizes).toHaveLength(1);
    expect(flushSizes[0]).toBe(3);
  });

  test('multiple batches maintain independence', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 2,
      maxBatchDelay: 10000,
    });

    // First batch
    batcher.send({ type: 'log', message: 'batch1-msg1' });
    batcher.send({ type: 'log', message: 'batch1-msg2' });

    expect(batches).toHaveLength(1);

    // Second batch
    batcher.send({ type: 'log', message: 'batch2-msg1' });
    batcher.send({ type: 'log', message: 'batch2-msg2' });

    expect(batches).toHaveLength(2);
    expect(batches[0]?.messages[0]?.message).toBe('batch1-msg1');
    expect(batches[1]?.messages[0]?.message).toBe('batch2-msg1');
  });

  test('partial batches are flushed on delay', async () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 10,
      maxBatchDelay: 50,
    });

    batcher.send({ type: 'log', message: 'msg1' });

    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(batches).toHaveLength(1);
    expect(batches[0]?.messages).toHaveLength(1);
  });

  test('flush cancels pending delay', async () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 100,
      maxBatchDelay: 100,
    });

    batcher.send({ type: 'log', message: 'msg1' });

    // Manual flush before delay
    batcher.flush();

    // Wait past delay
    await new Promise((resolve) => setTimeout(resolve, 110));

    // Should still only have 1 batch (from manual flush)
    expect(batches).toHaveLength(1);
  });

  test('batch messages are immutable copies', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 2,
      maxBatchDelay: 10000,
    });

    batcher.send({ type: 'log', message: 'msg1' });
    batcher.send({ type: 'log', message: 'msg2' });

    // Batch should be a copy, not affected by subsequent sends
    const firstBatch = batches[0];
    expect(firstBatch?.messages).toHaveLength(2);

    batcher.send({ type: 'log', message: 'msg3' });

    // First batch should still have 2 messages
    expect(firstBatch?.messages).toHaveLength(2);
  });

  test('high throughput batching', () => {
    const batches: BatchMessage<TestMessage>[] = [];
    const capability = createCapability<BatchMessage<TestMessage>>((msg) =>
      batches.push(msg)
    );

    const batcher = createBatchingCapability(capability, {
      maxBatchSize: 10,
      maxBatchDelay: 10000,
    });

    // Send 25 messages
    for (let i = 0; i < 25; i++) {
      batcher.send({ type: 'log', message: `msg${i}` });
    }

    // Should have 2 full batches + 5 pending
    expect(batches).toHaveLength(2);
    expect(batcher.getBatchSize()).toBe(5);
  });
});
