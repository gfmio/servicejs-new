/**
 * Minimal Counter Example
 *
 * Demonstrates the core ServiceJS concepts with a simple counter component.
 * Uses only core types without additional utilities like mailboxes.
 */

import {
  createComponent,
  createMessage,
  stay,
  emitTo,
  type Reducer,
  type Capability,
  type MessageOf,
} from '../src/index.js';
import { Ok } from '@servicejs/result';

// === Define Message Types ===

// Message to increment the counter
const IncrementMsg = createMessage<'increment', { amount: number }>('increment');

// Message to decrement the counter
const DecrementMsg = createMessage<'decrement', { amount: number }>('decrement');

// Message to reset the counter
const ResetMsg = createMessage<'reset', {}>('reset');

// Message to get the current count
const GetCountMsg = createMessage<'getCount', { replyTo: Capability<any> }>('getCount');

// Union of all counter messages
type CounterMessage =
  | MessageOf<typeof IncrementMsg>
  | MessageOf<typeof DecrementMsg>
  | MessageOf<typeof ResetMsg>
  | MessageOf<typeof GetCountMsg>;

// === Define State ===

type CounterState = {
  count: number;
};

// === Implement Reducer ===

const counterReducer: Reducer<CounterState, CounterMessage> = (state, message) => {
  switch (message.type) {
    case 'increment':
      console.log(`Incrementing by ${message.amount}`);
      return stay(
        { count: state.count + message.amount },
        counterReducer,
        [] // No effects
      );

    case 'decrement':
      console.log(`Decrementing by ${message.amount}`);
      return stay(
        { count: state.count - message.amount },
        counterReducer,
        []
      );

    case 'reset':
      console.log('Resetting counter');
      return stay(
        { count: 0 },
        counterReducer,
        []
      );

    case 'getCount':
      console.log('Getting count');
      // Send the current count back via the replyTo capability
      return stay(
        state,
        counterReducer,
        [emitTo(message.replyTo, Ok(state.count))]
      );
  }
};

// === Create Component ===

console.log('\n=== Creating Counter Component ===\n');

const { component, capability: counterCap } = createComponent(
  'urn:counter:simple' as any,
  { count: 0 }, // Initial state
  counterReducer
);

// === Create Reply Handler ===

// Create a simple component to receive replies
const { capability: replyCap } = createComponent(
  'urn:reply:handler' as any,
  {},
  (state, message: any) => {
    if (message.success) {
      console.log(`→ Reply received: count = ${message.value}`);
    }
    return stay(state, arguments.callee as any, []);
  }
);

// === Demonstrate Usage ===

console.log('=== Example 1: Basic Increment ===\n');

// Increment by 5
counterCap.send(IncrementMsg({ amount: 5 }));
console.log(`State: ${JSON.stringify(component.getState())}\n`);

// Increment by 3
counterCap.send(IncrementMsg({ amount: 3 }));
console.log(`State: ${JSON.stringify(component.getState())}\n`);

console.log('=== Example 2: Decrement ===\n');

// Decrement by 2
counterCap.send(DecrementMsg({ amount: 2 }));
console.log(`State: ${JSON.stringify(component.getState())}\n`);

console.log('=== Example 3: Get Count ===\n');

// Get the current count
counterCap.send(GetCountMsg({ replyTo: replyCap }));

// Wait for effect execution
await new Promise((resolve) => setTimeout(resolve, 10));

console.log('\n=== Example 4: Reset ===\n');

// Reset to zero
counterCap.send(ResetMsg({}));
console.log(`State: ${JSON.stringify(component.getState())}\n`);

console.log('=== Example 5: Multiple Operations ===\n');

// Chain multiple operations
counterCap.send(IncrementMsg({ amount: 10 }));
counterCap.send(IncrementMsg({ amount: 20 }));
counterCap.send(DecrementMsg({ amount: 5 }));
counterCap.send(GetCountMsg({ replyTo: replyCap }));

// Wait for effect execution
await new Promise((resolve) => setTimeout(resolve, 10));

console.log(`\nFinal state: ${JSON.stringify(component.getState())}\n`);

console.log('=== Counter Example Complete ===\n');

// === Key Takeaways ===

console.log('Key Concepts Demonstrated:\n');
console.log('1. Message Definition: createMessage() defines typed messages');
console.log('2. State Management: State is immutable and encapsulated');
console.log('3. Pure Reducers: Reducers are pure functions that return new state');
console.log('4. Capability-Based: Only capability holders can send messages');
console.log('5. Effects: Side effects (replies) are returned as effect data\n');
