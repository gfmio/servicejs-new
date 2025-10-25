/**
 * Bounded Mailbox Examples
 *
 * Demonstrates bounded message queuing with capacity limits for backpressure.
 */

import { createBoundedMailbox } from '../src/boundedMailbox.js';
import { createMessage, type MessageOf } from '@servicejs/core';

// Example 1: Basic Capacity Limits
console.log('=== Example 1: Basic Capacity Limits ===');
{
  type Msg = MessageOf<'data', { value: number }>;

  const mailbox = createBoundedMailbox<Msg>(3); // Max 3 messages

  console.log('Capacity:', mailbox.capacity());
  console.log('Available:', mailbox.available());

  // Fill to capacity
  mailbox.enqueue(createMessage('data', { value: 1 }));
  mailbox.enqueue(createMessage('data', { value: 2 }));
  mailbox.enqueue(createMessage('data', { value: 3 }));

  console.log('Is full:', mailbox.isFull()); // true
  console.log('Available:', mailbox.available()); // 0

  // Try to exceed capacity
  const result = mailbox.enqueue(createMessage('data', { value: 4 }));
  if (!result.success) {
    console.log(`Rejected: ${result.reason}`);
  }
}

// Example 2: Backpressure Handling
console.log('\n=== Example 2: Backpressure Handling ===');
{
  type JobMsg = MessageOf<'job', { id: number }>;

  const mailbox = createBoundedMailbox<JobMsg>(5);
  const rejected: number[] = [];

  // Try to enqueue 10 jobs
  for (let i = 1; i <= 10; i++) {
    const result = mailbox.enqueue(createMessage('job', { id: i }));
    if (!result.success) {
      rejected.push(i);
    }
  }

  console.log('Accepted:', mailbox.size()); // 5
  console.log('Rejected:', rejected); // [6, 7, 8, 9, 10]
}

// Example 3: Circular Buffer Pattern
console.log('\n=== Example 3: Circular Buffer Pattern ===');
{
  type EventMsg = MessageOf<'event', { name: string }>;

  const buffer = createBoundedMailbox<EventMsg>(3);

  // Fill buffer
  buffer.enqueue(createMessage('event', { name: 'event-1' }));
  buffer.enqueue(createMessage('event', { name: 'event-2' }));
  buffer.enqueue(createMessage('event', { name: 'event-3' }));

  console.log('Buffer full:', buffer.isFull());

  // Process one
  const processed = buffer.dequeue();
  if (processed.isSome()) {
    console.log('Processed:', processed.value.name);
  }

  // Now we can add one more
  const result = buffer.enqueue(createMessage('event', { name: 'event-4' }));
  console.log('Added new event:', result.success);
  console.log('Buffer size:', buffer.size());
}

// Example 4: Rate Limiting
console.log('\n=== Example 4: Rate Limiting ===');
{
  type RequestMsg = MessageOf<'request', { url: string }>;

  const rateLimiter = createBoundedMailbox<RequestMsg>(2); // Max 2 concurrent

  const urls = ['/api/users', '/api/posts', '/api/comments', '/api/likes'];

  console.log('Attempting requests:');
  for (const url of urls) {
    const result = rateLimiter.enqueue(createMessage('request', { url }));
    if (result.success) {
      console.log(`  ✓ Queued: ${url}`);
    } else {
      console.log(`  ✗ Rate limited: ${url}`);
    }
  }

  console.log(`\nProcessing ${rateLimiter.size()} requests...`);
}

// Example 5: Monitoring Capacity
console.log('\n=== Example 5: Monitoring Capacity ===');
{
  type TaskMsg = MessageOf<'task', { id: number }>;

  const mailbox = createBoundedMailbox<TaskMsg>(10);

  // Add some tasks
  for (let i = 1; i <= 7; i++) {
    mailbox.enqueue(createMessage('task', { id: i }));
  }

  console.log('Capacity:', mailbox.capacity());
  console.log('Current size:', mailbox.size());
  console.log('Available slots:', mailbox.available());
  console.log('Is empty:', mailbox.isEmpty());
  console.log('Is full:', mailbox.isFull());

  // Clear all
  mailbox.clear();
  console.log('\nAfter clear:');
  console.log('Size:', mailbox.size());
  console.log('Available:', mailbox.available());
}

// Example 6: Buffering with Overflow Detection
console.log('\n=== Example 6: Overflow Detection ===');
{
  type DataMsg = MessageOf<'data', { chunk: number }>;

  const buffer = createBoundedMailbox<DataMsg>(5);
  let overflowCount = 0;

  // Simulate data stream
  for (let i = 1; i <= 8; i++) {
    const result = buffer.enqueue(createMessage('data', { chunk: i }));
    if (!result.success) {
      overflowCount++;
      console.log(`  Overflow detected at chunk ${i}`);
    }
  }

  console.log('Total overflows:', overflowCount);
  console.log('Buffered chunks:', buffer.size());

  // Process buffer
  console.log('Processing buffer:');
  while (!buffer.isEmpty()) {
    const data = buffer.dequeue();
    if (data.isSome()) {
      console.log(`  Chunk ${data.value.chunk}`);
    }
  }
}

console.log('\n=== All Bounded Mailbox Examples Complete ===');
