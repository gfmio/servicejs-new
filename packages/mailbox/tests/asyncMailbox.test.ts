/**
 * Tests for Async Mailbox
 */

import { test, expect } from 'bun:test';
import { createAsyncMailbox } from '../src/asyncMailbox.js';
import { createMessage } from '@servicejs/core';

type TestMsg = { type: 'test'; value: number };

test('enqueue adds messages to queue', () => {
  const mailbox = createAsyncMailbox<TestMsg>();

  mailbox.enqueue(createMessage('test', { value: 1 }));
  mailbox.enqueue(createMessage('test', { value: 2 }));

  expect(mailbox.size()).toBe(2);
  expect(mailbox.isEmpty()).toBe(false);
});

test('start processes messages in order', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();
  const processed: number[] = [];

  mailbox.enqueue(createMessage('test', { value: 1 }));
  mailbox.enqueue(createMessage('test', { value: 2 }));
  mailbox.enqueue(createMessage('test', { value: 3 }));

  const handler = async (msg: TestMsg) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    processed.push(msg.value);
  };

  // Start processing in background
  const processPromise = mailbox.start(handler);

  // Wait for all messages to be processed
  await new Promise((resolve) => setTimeout(resolve, 100));

  await mailbox.stop();
  await processPromise;

  expect(processed).toEqual([1, 2, 3]);
  expect(mailbox.isEmpty()).toBe(true);
});

test('stop waits for current message to complete', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();
  let currentlyProcessing = false;
  let completedProcessing = false;

  mailbox.enqueue(createMessage('test', { value: 1 }));

  const handler = async (msg: TestMsg) => {
    currentlyProcessing = true;
    await new Promise((resolve) => setTimeout(resolve, 50));
    completedProcessing = true;
    currentlyProcessing = false;
  };

  const processPromise = mailbox.start(handler);

  // Wait for message to start processing
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(currentlyProcessing).toBe(true);

  // Stop and wait
  await mailbox.stop();
  await processPromise;

  expect(completedProcessing).toBe(true);
  expect(currentlyProcessing).toBe(false);
});

test('messages can be enqueued while processing', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();
  const processed: number[] = [];

  mailbox.enqueue(createMessage('test', { value: 1 }));

  const handler = async (msg: TestMsg) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    processed.push(msg.value);
  };

  const processPromise = mailbox.start(handler);

  // Add more messages while processing
  await new Promise((resolve) => setTimeout(resolve, 5));
  mailbox.enqueue(createMessage('test', { value: 2 }));
  mailbox.enqueue(createMessage('test', { value: 3 }));

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 100));

  await mailbox.stop();
  await processPromise;

  expect(processed).toEqual([1, 2, 3]);
});

test('isRunning returns correct state', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();

  expect(mailbox.isRunning()).toBe(false);

  mailbox.enqueue(createMessage('test', { value: 1 }));

  const handler = async (msg: TestMsg) => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  };

  const processPromise = mailbox.start(handler);

  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(mailbox.isRunning()).toBe(true);

  await mailbox.stop();
  await processPromise;

  expect(mailbox.isRunning()).toBe(false);
});

test('clear removes all messages', () => {
  const mailbox = createAsyncMailbox<TestMsg>();

  mailbox.enqueue(createMessage('test', { value: 1 }));
  mailbox.enqueue(createMessage('test', { value: 2 }));
  mailbox.enqueue(createMessage('test', { value: 3 }));

  expect(mailbox.size()).toBe(3);

  mailbox.clear();

  expect(mailbox.size()).toBe(0);
  expect(mailbox.isEmpty()).toBe(true);
});

test('throws error when starting already running mailbox', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();

  mailbox.enqueue(createMessage('test', { value: 1 }));

  const handler = async (msg: TestMsg) => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  const processPromise = mailbox.start(handler);

  await new Promise((resolve) => setTimeout(resolve, 10));

  expect(() => mailbox.start(handler)).toThrow('Async mailbox is already running');

  await mailbox.stop();
  await processPromise;
});

test('handles errors in message handler gracefully', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();
  const processed: number[] = [];

  mailbox.enqueue(createMessage('test', { value: 1 }));
  mailbox.enqueue(createMessage('test', { value: 2 }));
  mailbox.enqueue(createMessage('test', { value: 3 }));

  const handler = async (msg: TestMsg) => {
    await new Promise((resolve) => setTimeout(resolve, 10));

    if (msg.value === 2) {
      throw new Error('Test error');
    }

    processed.push(msg.value);
  };

  // Suppress console.error for this test
  const originalError = console.error;
  console.error = () => {};

  const processPromise = mailbox.start(handler);

  await new Promise((resolve) => setTimeout(resolve, 100));

  await mailbox.stop();
  await processPromise;

  console.error = originalError;

  // Should have processed messages 1 and 3, skipped 2 due to error
  expect(processed).toEqual([1, 3]);
});

test('stop when not running does nothing', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();

  await expect(mailbox.stop()).resolves.toBeUndefined();
});

test('processes messages sequentially (not concurrently)', async () => {
  const mailbox = createAsyncMailbox<TestMsg>();
  let concurrent = 0;
  let maxConcurrent = 0;

  for (let i = 1; i <= 5; i++) {
    mailbox.enqueue(createMessage('test', { value: i }));
  }

  const handler = async (msg: TestMsg) => {
    concurrent++;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await new Promise((resolve) => setTimeout(resolve, 20));
    concurrent--;
  };

  const processPromise = mailbox.start(handler);

  await new Promise((resolve) => setTimeout(resolve, 150));

  await mailbox.stop();
  await processPromise;

  expect(maxConcurrent).toBe(1); // Should never process more than 1 at a time
});
