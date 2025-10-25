/**
 * Message Example
 *
 * Demonstrates how to define and use messages in ServiceJS.
 */

import { createMessage, isMessageType, matchMessage, type MessageOf } from '../src/message';

console.log('=== Message Examples ===\n');

// Example 1: Define message types
console.log('1. Defining message types');

type IncrementMessage = MessageOf<'increment', { amount: number }>;
type DecrementMessage = MessageOf<'decrement', { amount: number }>;
type ResetMessage = MessageOf<'reset'>;
type GetValueMessage = MessageOf<'get-value', { replyTo: string }>;

type CounterMessage = IncrementMessage | DecrementMessage | ResetMessage | GetValueMessage;

console.log('Message types defined:');
console.log('- IncrementMessage: { type: "increment", amount: number }');
console.log('- DecrementMessage: { type: "decrement", amount: number }');
console.log('- ResetMessage: { type: "reset" }');
console.log('- GetValueMessage: { type: "get-value", replyTo: string }');
console.log('');

// Example 2: Creating messages
console.log('2. Creating messages');

const incrementMsg = createMessage('increment', { amount: 5 });
const decrementMsg = createMessage('decrement', { amount: 3 });
const resetMsg = createMessage('reset');
const getValueMsg = createMessage('get-value', { replyTo: 'caller-123' });

console.log('Increment message:', JSON.stringify(incrementMsg));
console.log('Decrement message:', JSON.stringify(decrementMsg));
console.log('Reset message:', JSON.stringify(resetMsg));
console.log('Get value message:', JSON.stringify(getValueMsg));
console.log('');

// Example 3: Type guards
console.log('3. Using type guards');

function describeMessage(msg: CounterMessage): string {
  if (isMessageType(msg, 'increment')) {
    return `Increment by ${msg.amount}`;
  } else if (isMessageType(msg, 'decrement')) {
    return `Decrement by ${msg.amount}`;
  } else if (isMessageType(msg, 'reset')) {
    return 'Reset to zero';
  } else if (isMessageType(msg, 'get-value')) {
    return `Get value for ${msg.replyTo}`;
  }
  return 'Unknown message';
}

console.log(describeMessage(incrementMsg));
console.log(describeMessage(decrementMsg));
console.log(describeMessage(resetMsg));
console.log(describeMessage(getValueMsg));
console.log('');

// Example 4: Pattern matching
console.log('4. Pattern matching with matchMessage');

function processMessage(msg: CounterMessage, currentValue: number): number {
  return matchMessage(msg, {
    increment: (m) => {
      console.log(`Processing increment: ${currentValue} + ${m.amount}`);
      return currentValue + m.amount;
    },
    decrement: (m) => {
      console.log(`Processing decrement: ${currentValue} - ${m.amount}`);
      return currentValue - m.amount;
    },
    reset: () => {
      console.log('Processing reset: 0');
      return 0;
    },
    'get-value': (m) => {
      console.log(`Processing get-value for ${m.replyTo}: ${currentValue}`);
      return currentValue;
    },
  });
}

let value = 0;
value = processMessage(incrementMsg, value); // 5
value = processMessage(incrementMsg, value); // 10
value = processMessage(decrementMsg, value); // 7
processMessage(getValueMsg, value); // logs 7
value = processMessage(resetMsg, value); // 0
console.log('Final value:', value);
console.log('');

// Example 5: Complex messages
console.log('5. Complex messages with nested data');

type UserCreatedMessage = MessageOf<
  'user-created',
  {
    user: {
      id: number;
      name: string;
      email: string;
    };
    timestamp: number;
    source: string;
  }
>;

const userCreatedMsg = createMessage('user-created', {
  user: {
    id: 123,
    name: 'Alice',
    email: 'alice@example.com',
  },
  timestamp: Date.now(),
  source: 'api',
});

console.log('User created message:');
console.log(JSON.stringify(userCreatedMsg, null, 2));
console.log('');

// Example 6: Message sequences
console.log('6. Processing message sequences');

type TodoMessage =
  | MessageOf<'add-todo', { text: string }>
  | MessageOf<'complete-todo', { id: number }>
  | MessageOf<'delete-todo', { id: number }>;

const todoMessages: TodoMessage[] = [
  createMessage('add-todo', { text: 'Buy milk' }),
  createMessage('add-todo', { text: 'Write code' }),
  createMessage('complete-todo', { id: 1 }),
  createMessage('delete-todo', { id: 2 }),
];

todoMessages.forEach((msg, index) => {
  const description = matchMessage(msg, {
    'add-todo': (m) => `Add: "${m.text}"`,
    'complete-todo': (m) => `Complete: #${m.id}`,
    'delete-todo': (m) => `Delete: #${m.id}`,
  });
  console.log(`Message ${index + 1}: ${description}`);
});
console.log('');

// Example 7: Messages with callbacks (capabilities)
console.log('7. Messages with callbacks');

type RequestMessage = MessageOf<
  'request',
  {
    data: string;
    onSuccess: (result: string) => void;
    onError: (error: string) => void;
  }
>;

function handleRequest(msg: RequestMessage): void {
  if (isMessageType(msg, 'request')) {
    // Simulate async operation
    setTimeout(() => {
      if (msg.data === 'valid') {
        msg.onSuccess(`Processed: ${msg.data}`);
      } else {
        msg.onError('Invalid data');
      }
    }, 100);
  }
}

const requestMsg = createMessage('request', {
  data: 'valid',
  onSuccess: (result) => console.log('Success:', result),
  onError: (error) => console.error('Error:', error),
});

handleRequest(requestMsg);

// Wait for async operation
await new Promise((resolve) => setTimeout(resolve, 200));
