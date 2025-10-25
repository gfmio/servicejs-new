/**
 * FIFO Mailbox Examples
 *
 * Demonstrates First-In-First-Out message queuing.
 */

import { createFIFOMailbox } from '../src/fifoMailbox.js';
import { createMessage, type MessageOf } from '@servicejs/core';

// Example 1: Basic Usage
console.log('=== Example 1: Basic FIFO Mailbox ===');
{
  type LogMsg = MessageOf<'log', { text: string }>;

  const mailbox = createFIFOMailbox<LogMsg>();

  mailbox.enqueue(createMessage('log', { text: 'First message' }));
  mailbox.enqueue(createMessage('log', { text: 'Second message' }));
  mailbox.enqueue(createMessage('log', { text: 'Third message' }));

  console.log('Size:', mailbox.size()); // 3

  // Dequeue in FIFO order
  const msg1 = mailbox.dequeue();
  if (msg1.isSome()) {
    console.log('Dequeued:', msg1.value.text); // First message
  }

  const msg2 = mailbox.dequeue();
  if (msg2.isSome()) {
    console.log('Dequeued:', msg2.value.text); // Second message
  }

  console.log('Remaining:', mailbox.size()); // 1
}

// Example 2: Peek Without Removing
console.log('\n=== Example 2: Peek ===');
{
  type TaskMsg = MessageOf<'task', { id: number; name: string }>;

  const mailbox = createFIFOMailbox<TaskMsg>();

  mailbox.enqueue(createMessage('task', { id: 1, name: 'Process data' }));
  mailbox.enqueue(createMessage('task', { id: 2, name: 'Send email' }));

  // Peek at next without removing
  const next = mailbox.peek();
  if (next.isSome()) {
    console.log('Next task:', next.value.name);
  }
  console.log('Size still:', mailbox.size()); // Still 2

  // Now actually dequeue
  mailbox.dequeue();
  console.log('After dequeue:', mailbox.size()); // Now 1
}

// Example 3: Processing Queue
console.log('\n=== Example 3: Processing Queue ===');
{
  type JobMsg = MessageOf<'job', { id: number }>;

  const mailbox = createFIFOMailbox<JobMsg>();

  // Enqueue jobs
  for (let i = 1; i <= 5; i++) {
    mailbox.enqueue(createMessage('job', { id: i }));
  }

  console.log('Total jobs:', mailbox.size());

  // Process all jobs
  while (!mailbox.isEmpty()) {
    const job = mailbox.dequeue();
    if (job.isSome()) {
      console.log(`Processing job ${job.value.id}`);
    }
  }

  console.log('All jobs processed:', mailbox.isEmpty());
}

// Example 4: Message Buffer
console.log('\n=== Example 4: Message Buffer ===');
{
  type EventMsg = MessageOf<'event', { timestamp: number; data: string }>;

  const buffer = createFIFOMailbox<EventMsg>();

  // Simulate events arriving
  buffer.enqueue(createMessage('event', { timestamp: 100, data: 'user.login' }));
  buffer.enqueue(createMessage('event', { timestamp: 150, data: 'page.view' }));
  buffer.enqueue(createMessage('event', { timestamp: 200, data: 'button.click' }));

  console.log('Buffered events:', buffer.size());

  // Process batch of 2
  const batch = [];
  for (let i = 0; i < 2 && !buffer.isEmpty(); i++) {
    const event = buffer.dequeue();
    if (event.isSome()) {
      batch.push(event.value);
    }
  }

  console.log('Processed batch:', batch.map(e => e.data));
  console.log('Remaining:', buffer.size());
}

// Example 5: Clear Queue
console.log('\n=== Example 5: Clear Queue ===');
{
  type CmdMsg = MessageOf<'command', { cmd: string }>;

  const mailbox = createFIFOMailbox<CmdMsg>();

  mailbox.enqueue(createMessage('command', { cmd: 'start' }));
  mailbox.enqueue(createMessage('command', { cmd: 'process' }));
  mailbox.enqueue(createMessage('command', { cmd: 'stop' }));

  console.log('Before clear:', mailbox.size()); // 3

  mailbox.clear();

  console.log('After clear:', mailbox.size()); // 0
  console.log('Is empty:', mailbox.isEmpty()); // true
}

console.log('\n=== All FIFO Mailbox Examples Complete ===');
