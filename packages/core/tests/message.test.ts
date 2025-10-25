import { describe, test, expect } from 'bun:test';
import {
  createMessage,
  isMessageType,
  matchMessage,
  type Message,
  type MessageOf,
} from '../src/message';

// Test message types
type IncrementMessage = MessageOf<'increment', { amount: number }>;
type DecrementMessage = MessageOf<'decrement', { amount: number }>;
type ResetMessage = MessageOf<'reset'>;
type GetValueMessage = MessageOf<'get-value', { replyTo: string }>;

type CounterMessage = IncrementMessage | DecrementMessage | ResetMessage | GetValueMessage;

describe('Message', () => {
  describe('createMessage', () => {
    test('creates message with type only', () => {
      const msg = createMessage('reset');

      expect(msg.type).toBe('reset');
      expect(Object.keys(msg)).toEqual(['type']);
    });

    test('creates message with type and data', () => {
      const msg = createMessage('increment', { amount: 5 });

      expect(msg.type).toBe('increment');
      expect(msg.amount).toBe(5);
    });

    test('creates message with multiple data fields', () => {
      const msg = createMessage('complex', {
        field1: 'value1',
        field2: 42,
        field3: true,
      });

      expect(msg.type).toBe('complex');
      expect(msg.field1).toBe('value1');
      expect(msg.field2).toBe(42);
      expect(msg.field3).toBe(true);
    });

    test('creates message with nested data', () => {
      const msg = createMessage('nested', {
        user: { id: 123, name: 'Alice' },
        metadata: { timestamp: Date.now() },
      });

      expect(msg.type).toBe('nested');
      expect(msg.user).toEqual({ id: 123, name: 'Alice' });
      expect(msg.metadata).toBeDefined();
    });
  });

  describe('isMessageType', () => {
    test('returns true for matching type', () => {
      const msg: CounterMessage = createMessage('increment', { amount: 5 });

      expect(isMessageType(msg, 'increment')).toBe(true);
    });

    test('returns false for non-matching type', () => {
      const msg: CounterMessage = createMessage('increment', { amount: 5 });

      expect(isMessageType(msg, 'decrement')).toBe(false);
      expect(isMessageType(msg, 'reset')).toBe(false);
    });

    test('narrows type correctly', () => {
      const msg: CounterMessage = createMessage('increment', { amount: 5 });

      if (isMessageType(msg, 'increment')) {
        // TypeScript should know msg.amount exists
        expect(msg.amount).toBe(5);
      } else {
        throw new Error('Type guard failed');
      }
    });

    test('works with different message types', () => {
      const incrementMsg: CounterMessage = createMessage('increment', { amount: 5 });
      const decrementMsg: CounterMessage = createMessage('decrement', { amount: 3 });
      const resetMsg: CounterMessage = createMessage('reset');

      expect(isMessageType(incrementMsg, 'increment')).toBe(true);
      expect(isMessageType(decrementMsg, 'decrement')).toBe(true);
      expect(isMessageType(resetMsg, 'reset')).toBe(true);

      expect(isMessageType(incrementMsg, 'decrement')).toBe(false);
      expect(isMessageType(decrementMsg, 'reset')).toBe(false);
      expect(isMessageType(resetMsg, 'increment')).toBe(false);
    });
  });

  describe('matchMessage', () => {
    test('calls correct handler for message type', () => {
      const msg: CounterMessage = createMessage('increment', { amount: 5 });
      let called = false;

      const result = matchMessage(msg, {
        increment: (m) => {
          called = true;
          return m.amount * 2;
        },
        decrement: (m) => m.amount * -1,
        reset: () => 0,
        'get-value': () => 0,
      });

      expect(called).toBe(true);
      expect(result).toBe(10);
    });

    test('passes correct message to handler', () => {
      const msg: CounterMessage = createMessage('decrement', { amount: 3 });

      const result = matchMessage(msg, {
        increment: (m) => `increment:${m.amount}`,
        decrement: (m) => `decrement:${m.amount}`,
        reset: () => 'reset',
        'get-value': (m) => `get-value:${m.replyTo}`,
      });

      expect(result).toBe('decrement:3');
    });

    test('handles message without data', () => {
      const msg: CounterMessage = createMessage('reset');

      const result = matchMessage(msg, {
        increment: () => 'increment',
        decrement: () => 'decrement',
        reset: () => 'reset-called',
        'get-value': () => 'get-value',
      });

      expect(result).toBe('reset-called');
    });

    test('returns handler result', () => {
      const msg: CounterMessage = createMessage('increment', { amount: 10 });

      const numberResult = matchMessage(msg, {
        increment: (m) => m.amount,
        decrement: (m) => m.amount,
        reset: () => 0,
        'get-value': () => 0,
      });

      expect(numberResult).toBe(10);

      const stringResult = matchMessage(msg, {
        increment: (m) => `Amount: ${m.amount}`,
        decrement: (m) => `Amount: ${m.amount}`,
        reset: () => 'Reset',
        'get-value': () => 'Get',
      });

      expect(stringResult).toBe('Amount: 10');
    });

    test('handles all message types', () => {
      const messages: CounterMessage[] = [
        createMessage('increment', { amount: 5 }),
        createMessage('decrement', { amount: 3 }),
        createMessage('reset'),
        createMessage('get-value', { replyTo: 'test' }),
      ];

      const results = messages.map((msg) =>
        matchMessage(msg, {
          increment: (m) => `inc:${m.amount}`,
          decrement: (m) => `dec:${m.amount}`,
          reset: () => 'reset',
          'get-value': (m) => `get:${m.replyTo}`,
        })
      );

      expect(results).toEqual(['inc:5', 'dec:3', 'reset', 'get:test']);
    });
  });

  describe('Message immutability', () => {
    test('messages should be treated as readonly', () => {
      const msg = createMessage('increment', { amount: 5 });

      // TypeScript should prevent mutation (compile-time check)
      // At runtime, we can verify the structure
      expect(msg.type).toBe('increment');
      expect(msg.amount).toBe(5);

      // If we could mutate (we shouldn't), verify the original is unchanged
      const msgCopy = { ...msg };
      expect(msgCopy).toEqual(msg);
    });
  });

  describe('Complex message scenarios', () => {
    test('messages with arrays', () => {
      const msg = createMessage('batch-update', {
        ids: [1, 2, 3],
        values: ['a', 'b', 'c'],
      });

      expect(msg.type).toBe('batch-update');
      expect(msg.ids).toEqual([1, 2, 3]);
      expect(msg.values).toEqual(['a', 'b', 'c']);
    });

    test('messages with optional fields', () => {
      const msg1 = createMessage('update', {
        id: 123,
        name: 'test',
      });

      const msg2 = createMessage('update', {
        id: 456,
        name: 'test2',
        description: 'optional field',
      });

      expect(msg1.description).toBeUndefined();
      expect(msg2.description).toBe('optional field');
    });

    test('messages with callbacks/capabilities', () => {
      const callback = (result: number) => console.log(result);
      const msg = createMessage('request', {
        data: 'test',
        onComplete: callback,
      });

      expect(msg.type).toBe('request');
      expect(msg.data).toBe('test');
      expect(typeof msg.onComplete).toBe('function');
    });
  });

  describe('Type safety', () => {
    test('MessageOf creates correct type', () => {
      type TestMessage = MessageOf<'test', { value: number; text: string }>;

      const msg: TestMessage = {
        type: 'test',
        value: 42,
        text: 'hello',
      };

      expect(msg.type).toBe('test');
      expect(msg.value).toBe(42);
      expect(msg.text).toBe('hello');
    });

    test('MessageOf without data creates minimal message', () => {
      type SimpleMessage = MessageOf<'simple'>;

      const msg: SimpleMessage = {
        type: 'simple',
      };

      expect(msg.type).toBe('simple');
      expect(Object.keys(msg)).toEqual(['type']);
    });
  });
});
