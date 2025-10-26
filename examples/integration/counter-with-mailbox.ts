/**
 * Counter with FIFO Mailbox Integration Example
 *
 * Demonstrates:
 * - Creating a stateful component with reducer
 * - Using FIFO mailbox for message queuing
 * - Sequential message processing
 * - Integration between @servicejs/core and @servicejs/mailbox
 */

import { createComponent, createURN, stay, type MessageOf } from '@servicejs/core';
import { createFIFOMailbox } from '@servicejs/mailbox';

// Define counter state
type CounterState = {
  count: number;
  history: string[];
};

// Define counter messages
type CounterMsg =
  | MessageOf<'increment', { amount: number }>
  | MessageOf<'decrement', { amount: number }>
  | MessageOf<'reset', {}>
  | MessageOf<'get', {}>;

// Create counter reducer
const counterReducer = (state: CounterState, msg: CounterMsg) => {
  switch (msg.type) {
    case 'increment':
      return stay(
        {
          count: state.count + msg.amount,
          history: [...state.history, `+${msg.amount}`],
        },
        counterReducer
      );

    case 'decrement':
      return stay(
        {
          count: state.count - msg.amount,
          history: [...state.history, `-${msg.amount}`],
        },
        counterReducer
      );

    case 'reset':
      return stay(
        {
          count: 0,
          history: [...state.history, 'reset'],
        },
        counterReducer
      );

    case 'get':
      console.log(`Current count: ${state.count}`);
      return stay(state, counterReducer);

    default:
      return stay(state, counterReducer);
  }
};

// Example 1: Basic Counter with Component
console.log('=== Example 1: Basic Counter with Component ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'counter-1'),
    { count: 0, history: [] },
    counterReducer
  );

  // Send messages directly (synchronous)
  capability.send({ type: 'increment', amount: 5 });
  capability.send({ type: 'increment', amount: 3 });
  capability.send({ type: 'decrement', amount: 2 });
  capability.send({ type: 'get' });

  console.log('Final state:', component.getState());
  console.log('History:', component.getState().history.join(', '));
}

// Example 2: Counter with FIFO Mailbox
console.log('\n=== Example 2: Counter with FIFO Mailbox ===\n');
{
  // Create component
  const { component, capability } = createComponent(
    createURN('examples', 'counter-2'),
    { count: 0, history: [] },
    counterReducer
  );

  // Create FIFO mailbox
  const mailbox = createFIFOMailbox<CounterMsg>();

  // Enqueue messages (queued for later processing)
  mailbox.enqueue({ type: 'increment', amount: 10 });
  mailbox.enqueue({ type: 'increment', amount: 5 });
  mailbox.enqueue({ type: 'decrement', amount: 3 });
  mailbox.enqueue({ type: 'increment', amount: 2 });
  mailbox.enqueue({ type: 'get' });

  console.log(`Mailbox size: ${mailbox.size()}`);

  // Process messages from mailbox in FIFO order
  console.log('\nProcessing messages in FIFO order:');
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      console.log(`Processing: ${msg.value.type}`);
      capability.send(msg.value);
    }
  }

  console.log('\nFinal state:', component.getState());
  console.log('History:', component.getState().history.join(', '));
}

// Example 3: Buffered Operations
console.log('\n=== Example 3: Buffered Operations ===\n');
{
  const { component, capability } = createComponent(
    createURN('examples', 'counter-3'),
    { count: 0, history: [] },
    counterReducer
  );

  const mailbox = createFIFOMailbox<CounterMsg>();

  // Simulate rapid message arrival
  console.log('Buffering rapid operations...');
  for (let i = 1; i <= 5; i++) {
    mailbox.enqueue({ type: 'increment', amount: i });
  }
  console.log(`Buffered ${mailbox.size()} operations`);

  // Process in batches
  console.log('\nProcessing first 3 operations:');
  for (let i = 0; i < 3; i++) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }
  console.log('Current count:', component.getState().count);
  console.log('Remaining in queue:', mailbox.size());

  // Process remaining
  console.log('\nProcessing remaining operations:');
  while (!mailbox.isEmpty()) {
    const msg = mailbox.dequeue();
    if (msg.isSome()) {
      capability.send(msg.value);
    }
  }
  console.log('Final count:', component.getState().count);
  console.log('History:', component.getState().history.join(', '));
}

// Example 4: Peek Without Consuming
console.log('\n=== Example 4: Peek Without Consuming ===\n');
{
  const mailbox = createFIFOMailbox<CounterMsg>();

  mailbox.enqueue({ type: 'increment', amount: 1 });
  mailbox.enqueue({ type: 'increment', amount: 2 });
  mailbox.enqueue({ type: 'increment', amount: 3 });

  console.log('Mailbox size:', mailbox.size());

  // Peek at next message without removing it
  const peeked = mailbox.peek();
  if (peeked.isSome()) {
    console.log('Next message (peeked):', peeked.value);
  }

  console.log('Size after peek:', mailbox.size());

  // Now dequeue
  const dequeued = mailbox.dequeue();
  if (dequeued.isSome()) {
    console.log('Next message (dequeued):', dequeued.value);
  }

  console.log('Size after dequeue:', mailbox.size());
}

// Example 5: Clear Mailbox
console.log('\n=== Example 5: Clear Mailbox ===\n');
{
  const mailbox = createFIFOMailbox<CounterMsg>();

  // Add many messages
  for (let i = 0; i < 100; i++) {
    mailbox.enqueue({ type: 'increment', amount: 1 });
  }

  console.log('Mailbox size before clear:', mailbox.size());

  // Clear all messages
  mailbox.clear();

  console.log('Mailbox size after clear:', mailbox.size());
  console.log('Is empty:', mailbox.isEmpty());
}

console.log('\n=== All Counter Examples Complete ===');
