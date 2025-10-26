/**
 * Mailbox Helper Utilities Examples
 *
 * Demonstrates using helper utilities to integrate mailboxes with components.
 */

import {
  createFIFOMailbox,
  createPriorityMailbox,
  createMailboxCapability,
  wrapComponentWithMailbox,
  createAutoProcessingCapability,
} from '../src/index.js';
import { createComponent, createURN, stay, createMessage } from '@servicejs/core';

// Example 1: createMailboxCapability - Basic Buffering
console.log('=== Example 1: createMailboxCapability - Basic Buffering ===\n');
{
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'counter-1'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const bufferedCap = createMailboxCapability(mailbox, capability);

  console.log('Sending messages to buffered capability...');
  bufferedCap.send(createMessage('increment', { amount: 5 }));
  bufferedCap.send(createMessage('increment', { amount: 3 }));
  bufferedCap.send(createMessage('increment', { amount: 2 }));

  console.log(`Count before processing: ${component.getState().count}`);
  console.log(`Messages in queue: ${mailbox.size()}`);

  // Manually process
  console.log('\nProcessing messages manually...');
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }

  console.log(`Count after processing: ${component.getState().count}\n`);
}

// Example 2: wrapComponentWithMailbox - Manual Processing
console.log('=== Example 2: wrapComponentWithMailbox - Manual Processing ===\n');
{
  type TodoState = { todos: string[]; completed: string[] };
  type TodoMsg =
    | { type: 'add'; todo: string }
    | { type: 'complete'; todo: string };

  const reducer = (state: TodoState, msg: TodoMsg) => {
    if (msg.type === 'add') {
      return stay({ ...state, todos: [...state.todos, msg.todo] }, reducer);
    }
    if (msg.type === 'complete') {
      return stay(
        {
          todos: state.todos.filter((t) => t !== msg.todo),
          completed: [...state.completed, msg.todo],
        },
        reducer
      );
    }
    return stay(state, reducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'todos-1'),
    { todos: [], completed: [] },
    reducer
  );

  const mailbox = createFIFOMailbox<TodoMsg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  console.log('Queuing todo operations...');
  wrapped.capability.send(createMessage('add', { todo: 'Write tests' }));
  wrapped.capability.send(createMessage('add', { todo: 'Write docs' }));
  wrapped.capability.send(createMessage('complete', { todo: 'Write tests' }));

  console.log(`Todos before processing: ${component.getState().todos.length}`);
  console.log(`Queue size: ${mailbox.size()}`);

  console.log('\nProcessing all messages...');
  const processed = wrapped.processMessages();

  console.log(`Processed ${processed} messages`);
  console.log(`Todos: ${component.getState().todos.join(', ')}`);
  console.log(`Completed: ${component.getState().completed.join(', ')}\n`);
}

// Example 3: wrapComponentWithMailbox - Batch Processing
console.log('=== Example 3: wrapComponentWithMailbox - Batch Processing ===\n');
{
  type LogState = { logs: string[] };
  type LogMsg = { type: 'log'; message: string };

  const reducer = (state: LogState, msg: LogMsg) => {
    return stay({ logs: [...state.logs, msg.message] }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'logger-1'),
    { logs: [] },
    reducer
  );

  const mailbox = createFIFOMailbox<LogMsg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  // Queue many log messages
  console.log('Queuing 10 log messages...');
  for (let i = 1; i <= 10; i++) {
    wrapped.capability.send(createMessage('log', { message: `Log entry ${i}` }));
  }

  console.log(`Queue size: ${mailbox.size()}`);

  // Process in batches
  console.log('\nProcessing in batches of 3...');
  let batch = 1;
  while (!mailbox.isEmpty()) {
    const processed = wrapped.processBatch(3);
    console.log(`  Batch ${batch}: processed ${processed} messages`);
    console.log(`  Total logs: ${component.getState().logs.length}`);
    batch++;
  }

  console.log(`\nAll messages processed. Total logs: ${component.getState().logs.length}\n`);
}

// Example 4: wrapComponentWithMailbox - Auto Processing
console.log('=== Example 4: wrapComponentWithMailbox - Auto Processing ===\n');
{
  type CounterState = { count: number };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay({ count: state.count + msg.amount }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'counter-2'),
    { count: 0 },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: true, // Messages processed immediately
  });

  console.log('Sending messages (auto-processed)...');
  wrapped.capability.send(createMessage('increment', { amount: 1 }));
  console.log(`  Count: ${component.getState().count}`);

  wrapped.capability.send(createMessage('increment', { amount: 2 }));
  console.log(`  Count: ${component.getState().count}`);

  wrapped.capability.send(createMessage('increment', { amount: 3 }));
  console.log(`  Count: ${component.getState().count}`);

  console.log(`\nFinal count: ${component.getState().count}`);
  console.log(`Queue empty: ${mailbox.isEmpty()}\n`);
}

// Example 5: createAutoProcessingCapability
console.log('=== Example 5: createAutoProcessingCapability ===\n');
{
  type CounterState = { count: number; history: number[] };
  type CounterMsg = { type: 'increment'; amount: number };

  const reducer = (state: CounterState, msg: CounterMsg) => {
    return stay(
      {
        count: state.count + msg.amount,
        history: [...state.history, msg.amount],
      },
      reducer
    );
  };

  const { component, capability } = createComponent(
    createURN('examples', 'counter-3'),
    { count: 0, history: [] },
    reducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();
  const autoCap = createAutoProcessingCapability(mailbox, capability);

  console.log('Using auto-processing capability (messages handled immediately in FIFO order)...');

  autoCap.send(createMessage('increment', { amount: 5 }));
  autoCap.send(createMessage('increment', { amount: 3 }));
  autoCap.send(createMessage('increment', { amount: 2 }));

  console.log(`\nFinal count: ${component.getState().count}`);
  console.log(`History: ${component.getState().history.join(', ')}`);
  console.log(`Queue empty: ${mailbox.isEmpty()}\n`);
}

// Example 6: Priority Mailbox with Wrapper
console.log('=== Example 6: Priority Mailbox with Component ===\n');
{
  type TaskState = { executed: string[] };
  type TaskMsg = { type: 'task'; name: string; priority: number };

  const reducer = (state: TaskState, msg: TaskMsg) => {
    return stay({ executed: [...state.executed, msg.name] }, reducer);
  };

  const { component, capability } = createComponent(
    createURN('examples', 'tasks-1'),
    { executed: [] },
    reducer
  );

  const mailbox = createPriorityMailbox<TaskMsg>((msg) => msg.priority);
  const wrapped = wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: false,
  });

  console.log('Queuing tasks with different priorities...');
  wrapped.capability.send(createMessage('task', { name: 'Low priority', priority: 1 }));
  wrapped.capability.send(createMessage('task', { name: 'High priority', priority: 10 }));
  wrapped.capability.send(createMessage('task', { name: 'Medium priority', priority: 5 }));
  wrapped.capability.send(createMessage('task', { name: 'Critical', priority: 20 }));

  console.log('\nProcessing by priority (highest first)...');
  wrapped.processMessages();

  console.log(`Execution order: ${component.getState().executed.join(' → ')}\n`);
}

// Example 7: Ensuring Sequential Processing
console.log('=== Example 7: Ensuring Sequential Processing ===\n');
{
  type State = { value: number; operations: string[] };
  type Msg = { type: 'operation'; name: string; fn: (n: number) => number };

  const reducer = (state: State, msg: Msg) => {
    return stay(
      {
        value: msg.fn(state.value),
        operations: [...state.operations, msg.name],
      },
      reducer
    );
  };

  const { component, capability } = createComponent(
    createURN('examples', 'calculator-1'),
    { value: 0, operations: [] },
    reducer
  );

  const mailbox = createFIFOMailbox<Msg>();
  const autoCap = createAutoProcessingCapability(mailbox, capability);

  console.log('Performing sequential operations...');
  autoCap.send(createMessage('operation', { name: 'Set to 10', fn: () => 10 }));
  autoCap.send(createMessage('operation', { name: 'Add 5', fn: (n) => n + 5 }));
  autoCap.send(createMessage('operation', { name: 'Multiply by 2', fn: (n) => n * 2 }));
  autoCap.send(createMessage('operation', { name: 'Subtract 3', fn: (n) => n - 3 }));

  console.log(`\nFinal value: ${component.getState().value}`); // (((10) + 5) * 2) - 3 = 27
  console.log(`Operations: ${component.getState().operations.join(' → ')}\n`);
}

console.log('=== All Helper Examples Complete ===');
