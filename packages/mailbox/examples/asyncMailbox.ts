/**
 * Async Mailbox Examples
 *
 * Demonstrates asynchronous message processing with async mailboxes.
 */

import { createAsyncMailbox } from '../src/asyncMailbox.js';
import { createMessage } from '@servicejs/core';

// Example 1: Basic Async Processing
console.log('=== Example 1: Basic Async Processing ===');
{
  type ApiRequestMsg = {
    type: 'api-request';
    url: string;
    id: number;
  };

  const mailbox = createAsyncMailbox<ApiRequestMsg>();

  // Enqueue some requests
  mailbox.enqueue(createMessage('api-request', { url: '/users', id: 1 }));
  mailbox.enqueue(createMessage('api-request', { url: '/posts', id: 2 }));
  mailbox.enqueue(createMessage('api-request', { url: '/comments', id: 3 }));

  console.log(`Queued ${mailbox.size()} requests\n`);

  // Start processing
  const processPromise = mailbox.start(async (msg) => {
    console.log(`Processing request ${msg.id}: ${msg.url}`);
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`  ✓ Completed request ${msg.id}`);
  });

  // Let it process for a bit
  await new Promise((resolve) => setTimeout(resolve, 400));

  console.log('\nStopping mailbox...');
  await mailbox.stop();
  await processPromise;
  console.log('Mailbox stopped\n');
}

// Example 2: I/O Operations
console.log('=== Example 2: Simulated I/O Operations ===');
{
  type FileOperationMsg = {
    type: 'file-op';
    operation: 'read' | 'write' | 'delete';
    path: string;
  };

  const mailbox = createAsyncMailbox<FileOperationMsg>();

  // Queue file operations
  mailbox.enqueue(createMessage('file-op', { operation: 'write', path: '/data/file1.txt' }));
  mailbox.enqueue(createMessage('file-op', { operation: 'read', path: '/data/file1.txt' }));
  mailbox.enqueue(createMessage('file-op', { operation: 'write', path: '/data/file2.txt' }));
  mailbox.enqueue(createMessage('file-op', { operation: 'delete', path: '/data/old.txt' }));

  console.log(`Queued ${mailbox.size()} file operations\n`);

  const processPromise = mailbox.start(async (msg) => {
    console.log(`[${msg.operation.toUpperCase()}] ${msg.path}`);
    // Simulate I/O delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log(`  ✓ ${msg.operation} completed`);
  });

  await new Promise((resolve) => setTimeout(resolve, 300));

  await mailbox.stop();
  await processPromise;
  console.log('\nAll file operations completed\n');
}

// Example 3: Adding Messages While Processing
console.log('=== Example 3: Adding Messages While Processing ===');
{
  type TaskMsg = {
    type: 'task';
    id: number;
    name: string;
  };

  const mailbox = createAsyncMailbox<TaskMsg>();

  // Initial tasks
  mailbox.enqueue(createMessage('task', { id: 1, name: 'Initial task 1' }));
  mailbox.enqueue(createMessage('task', { id: 2, name: 'Initial task 2' }));

  console.log(`Initial queue size: ${mailbox.size()}\n`);

  const processPromise = mailbox.start(async (msg) => {
    console.log(`Processing task ${msg.id}: ${msg.name}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(`  ✓ Task ${msg.id} completed`);
  });

  // Add more tasks while processing
  setTimeout(() => {
    console.log('\nAdding more tasks while processing...');
    mailbox.enqueue(createMessage('task', { id: 3, name: 'Dynamic task 1' }));
    mailbox.enqueue(createMessage('task', { id: 4, name: 'Dynamic task 2' }));
    console.log(`Queue size now: ${mailbox.size()}\n`);
  }, 150);

  await new Promise((resolve) => setTimeout(resolve, 600));

  await mailbox.stop();
  await processPromise;
  console.log('\nAll tasks completed\n');
}

// Example 4: Sequential Database Operations
console.log('=== Example 4: Sequential Database Operations ===');
{
  type DbOperationMsg = {
    type: 'db-op';
    operation: 'insert' | 'update' | 'delete' | 'query';
    table: string;
    id?: number;
  };

  const mailbox = createAsyncMailbox<DbOperationMsg>();

  // Queue operations that must be sequential
  mailbox.enqueue(createMessage('db-op', { operation: 'insert', table: 'users', id: 1 }));
  mailbox.enqueue(createMessage('db-op', { operation: 'update', table: 'users', id: 1 }));
  mailbox.enqueue(createMessage('db-op', { operation: 'query', table: 'users', id: 1 }));
  mailbox.enqueue(createMessage('db-op', { operation: 'delete', table: 'users', id: 1 }));

  console.log('Processing database operations sequentially...\n');

  const processPromise = mailbox.start(async (msg) => {
    const idStr = msg.id ? ` (id: ${msg.id})` : '';
    console.log(`[DB] ${msg.operation.toUpperCase()} on ${msg.table}${idStr}`);
    // Simulate database operation
    await new Promise((resolve) => setTimeout(resolve, 80));
    console.log(`  ✓ ${msg.operation} completed`);
  });

  await new Promise((resolve) => setTimeout(resolve, 500));

  await mailbox.stop();
  await processPromise;
  console.log('\nDatabase operations completed\n');
}

// Example 5: Error Handling
console.log('=== Example 5: Error Handling ===');
{
  type ApiRequestMsg = {
    type: 'api-request';
    url: string;
    shouldFail?: boolean;
  };

  const mailbox = createAsyncMailbox<ApiRequestMsg>();

  mailbox.enqueue(createMessage('api-request', { url: '/endpoint1' }));
  mailbox.enqueue(createMessage('api-request', { url: '/endpoint2', shouldFail: true }));
  mailbox.enqueue(createMessage('api-request', { url: '/endpoint3' }));

  console.log('Processing requests (one will fail)...\n');

  // Suppress console.error for this example
  const originalError = console.error;
  console.error = () => {};

  const processPromise = mailbox.start(async (msg) => {
    console.log(`Request to ${msg.url}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (msg.shouldFail) {
      throw new Error(`Failed to fetch ${msg.url}`);
    }

    console.log(`  ✓ Success`);
  });

  await new Promise((resolve) => setTimeout(resolve, 250));

  await mailbox.stop();
  await processPromise;

  console.error = originalError;

  console.log('\nProcessing completed (errors were handled gracefully)\n');
}

// Example 6: Stopping During Processing
console.log('=== Example 6: Graceful Shutdown ===');
{
  type WorkMsg = {
    type: 'work';
    id: number;
  };

  const mailbox = createAsyncMailbox<WorkMsg>();

  // Queue many tasks
  for (let i = 1; i <= 10; i++) {
    mailbox.enqueue(createMessage('work', { id: i }));
  }

  console.log(`Queued ${mailbox.size()} tasks`);
  console.log('Starting processing...\n');

  let processed = 0;

  const processPromise = mailbox.start(async (msg) => {
    console.log(`Processing work ${msg.id}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    processed++;
    console.log(`  ✓ Work ${msg.id} done`);
  });

  // Stop after 3 tasks
  setTimeout(async () => {
    console.log('\n⚠️  Requesting shutdown...\n');
    await mailbox.stop();
  }, 350);

  await processPromise;

  console.log(`\nProcessed ${processed} tasks before shutdown`);
  console.log(`Remaining in queue: ${mailbox.size()}\n`);
}

console.log('=== All Async Mailbox Examples Complete ===');
