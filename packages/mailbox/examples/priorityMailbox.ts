/**
 * Priority Mailbox Examples
 *
 * Demonstrates priority-based message queuing where higher priority messages are delivered first.
 */

import { createPriorityMailbox } from '../src/priorityMailbox.js';
import { createMessage, type MessageOf } from '@servicejs/core';

// Example 1: Basic Priority Ordering
console.log('=== Example 1: Basic Priority Ordering ===');
{
  type TaskMsg = MessageOf<'task', { name: string; priority: number }>;

  const mailbox = createPriorityMailbox<TaskMsg>(msg => msg.priority);

  // Enqueue in random order
  mailbox.enqueue(createMessage('task', { name: 'Low priority task', priority: 1 }));
  mailbox.enqueue(createMessage('task', { name: 'Urgent task', priority: 10 }));
  mailbox.enqueue(createMessage('task', { name: 'Medium task', priority: 5 }));

  // Dequeue by priority (highest first)
  while (!mailbox.isEmpty()) {
    const task = mailbox.dequeue();
    if (task.isSome()) {
      console.log(`Processing: ${task.value.name} (priority ${task.value.priority})`);
    }
  }
}

// Example 2: Task Scheduler
console.log('\n=== Example 2: Task Scheduler ===');
{
  type JobMsg = MessageOf<'job', { id: number; priority: 'low' | 'normal' | 'high' | 'critical' }>;

  const priorityMap = { critical: 100, high: 10, normal: 5, low: 1 };
  const mailbox = createPriorityMailbox<JobMsg>(msg => priorityMap[msg.priority]);

  mailbox.enqueue(createMessage('job', { id: 1, priority: 'normal' }));
  mailbox.enqueue(createMessage('job', { id: 2, priority: 'low' }));
  mailbox.enqueue(createMessage('job', { id: 3, priority: 'critical' }));
  mailbox.enqueue(createMessage('job', { id: 4, priority: 'high' }));

  console.log('Processing jobs by priority:');
  while (!mailbox.isEmpty()) {
    const job = mailbox.dequeue();
    if (job.isSome()) {
      console.log(`  Job ${job.value.id}: ${job.value.priority}`);
    }
  }
}

// Example 3: Emergency Handling
console.log('\n=== Example 3: Emergency Handling ===');
{
  type AlertMsg = MessageOf<'alert', { level: number; message: string }>;

  const mailbox = createPriorityMailbox<AlertMsg>(msg => msg.level);

  mailbox.enqueue(createMessage('alert', { level: 3, message: 'Info: System update available' }));
  mailbox.enqueue(createMessage('alert', { level: 8, message: 'Warning: High CPU usage' }));
  mailbox.enqueue(createMessage('alert', { level: 10, message: 'Critical: Disk space low!' }));
  mailbox.enqueue(createMessage('alert', { level: 5, message: 'Notice: New user registered' }));

  console.log('Processing alerts (highest priority first):');
  const critical = mailbox.peek();
  if (critical.isSome()) {
    console.log(`Next alert: ${critical.value.message}`);
  }

  while (!mailbox.isEmpty()) {
    const alert = mailbox.dequeue();
    if (alert.isSome()) {
      console.log(`  [Level ${alert.value.level}] ${alert.value.message}`);
    }
  }
}

// Example 4: Equal Priorities (FIFO within same priority)
console.log('\n=== Example 4: Equal Priorities ===');
{
  type RequestMsg = MessageOf<'request', { id: number; priority: number }>;

  const mailbox = createPriorityMailbox<RequestMsg>(msg => msg.priority);

  // All same priority - should maintain insertion order
  mailbox.enqueue(createMessage('request', { id: 1, priority: 5 }));
  mailbox.enqueue(createMessage('request', { id: 2, priority: 5 }));
  mailbox.enqueue(createMessage('request', { id: 3, priority: 5 }));

  console.log('Same priority requests (FIFO order):');
  while (!mailbox.isEmpty()) {
    const req = mailbox.dequeue();
    if (req.isSome()) {
      console.log(`  Request ${req.value.id}`);
    }
  }
}

// Example 5: Dynamic Priority Queue
console.log('\n=== Example 5: Dynamic Priority Queue ===');
{
  type EventMsg = MessageOf<'event', { name: string; urgency: number }>;

  const mailbox = createPriorityMailbox<EventMsg>(msg => msg.urgency);

  // Initial events
  mailbox.enqueue(createMessage('event', { name: 'user.login', urgency: 2 }));
  mailbox.enqueue(createMessage('event', { name: 'db.query', urgency: 3 }));

  console.log('Initial queue size:', mailbox.size());

  // Add urgent event
  mailbox.enqueue(createMessage('event', { name: 'security.breach', urgency: 10 }));

  // Process highest priority first
  const urgent = mailbox.dequeue();
  if (urgent.isSome()) {
    console.log(`Handling urgent event: ${urgent.value.name}`);
  }

  // Add more events
  mailbox.enqueue(createMessage('event', { name: 'cache.miss', urgency: 1 }));

  console.log('Processing remaining events:');
  while (!mailbox.isEmpty()) {
    const event = mailbox.dequeue();
    if (event.isSome()) {
      console.log(`  ${event.value.name} (urgency: ${event.value.urgency})`);
    }
  }
}

console.log('\n=== All Priority Mailbox Examples Complete ===');
