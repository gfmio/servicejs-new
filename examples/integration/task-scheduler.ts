/**
 * Task Scheduler with Priority Mailbox Integration Example
 *
 * Demonstrates:
 * - Creating a task scheduler component
 * - Using priority mailbox for task prioritization
 * - High priority tasks processed before low priority
 * - Equal priority tasks processed in FIFO order
 * - Integration between @servicejs/core and @servicejs/mailbox
 */

import { createComponent, createURN, stay, emitTo, type MessageOf, createCapability } from '@servicejs/core';
import { createPriorityMailbox } from '@servicejs/mailbox';

// Define task types
type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

type Task = {
  id: string;
  name: string;
  priority: TaskPriority;
  work: () => void;
};

// Define scheduler state
type SchedulerState = {
  completed: string[];
  totalTasks: number;
};

// Define scheduler messages
type SchedulerMsg =
  | MessageOf<'execute-task', Task>
  | MessageOf<'status', {}>;

// Priority mapping
const priorityValue: Record<TaskPriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
};

// Create scheduler reducer
const schedulerReducer = (state: SchedulerState, msg: SchedulerMsg) => {
  switch (msg.type) {
    case 'execute-task':
      console.log(`[${msg.priority.toUpperCase()}] Executing task: ${msg.name}`);
      msg.work();
      return stay(
        {
          completed: [...state.completed, msg.id],
          totalTasks: state.totalTasks + 1,
        },
        schedulerReducer
      );

    case 'status':
      console.log(`\nScheduler Status:`);
      console.log(`  Total tasks executed: ${state.totalTasks}`);
      console.log(`  Completed tasks: ${state.completed.join(', ')}`);
      return stay(state, schedulerReducer);

    default:
      return stay(state, schedulerReducer);
  }
};

// Example 1: Basic Priority Scheduling
console.log('=== Example 1: Basic Priority Scheduling ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'scheduler-1'),
    { completed: [], totalTasks: 0 },
    schedulerReducer
  );

  // Create priority mailbox
  const mailbox = createPriorityMailbox<SchedulerMsg>((msg) => {
    if (msg.type === 'execute-task') {
      return priorityValue[msg.priority];
    }
    return 0; // Status messages have lowest priority
  });

  // Schedule tasks in random order
  console.log('Scheduling tasks in random order...\n');

  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-1',
    name: 'Normal Priority Task',
    priority: 'normal',
    work: () => console.log('  → Processing data'),
  });

  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-2',
    name: 'Critical Alert',
    priority: 'critical',
    work: () => console.log('  → CRITICAL: Security breach detected!'),
  });

  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-3',
    name: 'Low Priority Cleanup',
    priority: 'low',
    work: () => console.log('  → Cleaning temporary files'),
  });

  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-4',
    name: 'High Priority Backup',
    priority: 'high',
    work: () => console.log('  → Running backup'),
  });

  console.log(`Tasks queued: ${mailbox.size()}\n`);
  console.log('Processing tasks by priority (highest first):\n');

  // Process all tasks
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }

  capability.send({ type: 'status' });
}

// Example 2: Equal Priority FIFO Order
console.log('\n=== Example 2: Equal Priority FIFO Order ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'scheduler-2'),
    { completed: [], totalTasks: 0 },
    schedulerReducer
  );

  const mailbox = createPriorityMailbox<SchedulerMsg>((msg) => {
    if (msg.type === 'execute-task') {
      return priorityValue[msg.priority];
    }
    return 0;
  });

  // Schedule multiple tasks with same priority
  console.log('Scheduling multiple HIGH priority tasks...\n');

  for (let i = 1; i <= 4; i++) {
    mailbox.enqueue({
      type: 'execute-task',
      id: `task-${i}`,
      name: `High Priority Task ${i}`,
      priority: 'high',
      work: () => console.log(`  → Task ${i} execution`),
    });
  }

  console.log('Tasks with same priority should execute in FIFO order:\n');

  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }
}

// Example 3: Starvation Prevention (Warning Example)
console.log('\n=== Example 3: Starvation Warning ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'scheduler-3'),
    { completed: [], totalTasks: 0 },
    schedulerReducer
  );

  const mailbox = createPriorityMailbox<SchedulerMsg>((msg) => {
    if (msg.type === 'execute-task') {
      return priorityValue[msg.priority];
    }
    return 0;
  });

  console.log('Demonstrating potential starvation of low priority tasks:\n');

  // Add low priority task first
  mailbox.enqueue({
    type: 'execute-task',
    id: 'low-1',
    name: 'Low Priority Task',
    priority: 'low',
    work: () => console.log('  → Low priority work'),
  });

  // Keep adding high priority tasks
  for (let i = 1; i <= 3; i++) {
    mailbox.enqueue({
      type: 'execute-task',
      id: `high-${i}`,
      name: `High Priority Task ${i}`,
      priority: 'high',
      work: () => console.log(`  → High priority work ${i}`),
    });
  }

  console.log('Note: Low priority task will be processed last:\n');

  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }

  console.log('\n⚠️  Warning: In production, consider implementing starvation prevention!');
}

// Example 4: Mixed Priority Workflow
console.log('\n=== Example 4: Mixed Priority Workflow ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'scheduler-4'),
    { completed: [], totalTasks: 0 },
    schedulerReducer
  );

  const mailbox = createPriorityMailbox<SchedulerMsg>((msg) => {
    if (msg.type === 'execute-task') {
      return priorityValue[msg.priority];
    }
    return 0;
  });

  console.log('Simulating realistic mixed-priority workload...\n');

  const tasks: Array<{ name: string; priority: TaskPriority }> = [
    { name: 'Background sync', priority: 'low' },
    { name: 'User request', priority: 'high' },
    { name: 'Cache cleanup', priority: 'low' },
    { name: 'Security scan', priority: 'critical' },
    { name: 'Data processing', priority: 'normal' },
    { name: 'User notification', priority: 'high' },
    { name: 'Log rotation', priority: 'low' },
    { name: 'API call', priority: 'normal' },
  ];

  tasks.forEach((task, index) => {
    mailbox.enqueue({
      type: 'execute-task',
      id: `task-${index + 1}`,
      name: task.name,
      priority: task.priority,
      work: () => {},
    });
  });

  console.log(`Total tasks queued: ${mailbox.size()}\n`);
  console.log('Processing order (by priority):\n');

  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }

  capability.send({ type: 'status' });
}

// Example 5: Dynamic Priority Adjustment Pattern
console.log('\n=== Example 5: Peek and Requeue Pattern ===\n');
{
  const mailbox = createPriorityMailbox<SchedulerMsg>((msg) => {
    if (msg.type === 'execute-task') {
      return priorityValue[msg.priority];
    }
    return 0;
  });

  // Queue some tasks
  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-1',
    name: 'Normal task',
    priority: 'normal',
    work: () => console.log('Normal task'),
  });

  mailbox.enqueue({
    type: 'execute-task',
    id: 'task-2',
    name: 'Low task',
    priority: 'low',
    work: () => console.log('Low task'),
  });

  console.log('Peeking at next task...');
  const peeked = mailbox.peek();
  if (peeked.isSome()) {
    console.log(`Next task: ${peeked.value.type === 'execute-task' ? peeked.value.name : 'unknown'}`);
  }

  console.log(`\nMailbox size: ${mailbox.size()}`);
  console.log('(Peek doesn\'t consume the message)\n');

  // Process all
  console.log('Processing all tasks:');
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      if (msg.value.type === 'execute-task') {
        console.log(`  → ${msg.value.name}`);
      }
    }
  }
}

console.log('\n=== All Task Scheduler Examples Complete ===');
