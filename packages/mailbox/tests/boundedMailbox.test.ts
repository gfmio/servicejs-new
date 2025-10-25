import { describe, test, expect } from 'bun:test';
import { createBoundedMailbox } from '../src/boundedMailbox';
import { createMessage, type MessageOf } from '@servicejs/core';

type TestMessage = MessageOf<'test', { value: number }>;

describe('BoundedMailbox', () => {
  describe('creation', () => {
    test('creates with specified capacity', () => {
      const mailbox = createBoundedMailbox<TestMessage>(10);

      expect(mailbox.capacity()).toBe(10);
      expect(mailbox.available()).toBe(10);
      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.isFull()).toBe(false);
    });

    test('throws for non-positive capacity', () => {
      expect(() => createBoundedMailbox<TestMessage>(0)).toThrow('capacity must be positive');
      expect(() => createBoundedMailbox<TestMessage>(-1)).toThrow('capacity must be positive');
    });
  });

  describe('basic operations', () => {
    test('enqueues messages when not full', () => {
      const mailbox = createBoundedMailbox<TestMessage>(3);

      const result1 = mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(result1.success).toBe(true);
      expect(mailbox.size()).toBe(1);

      const result2 = mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(result2.success).toBe(true);
      expect(mailbox.size()).toBe(2);
    });

    test('rejects messages when full', () => {
      const mailbox = createBoundedMailbox<TestMessage>(2);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));

      const result = mailbox.enqueue(createMessage('test', { value: 3 }));

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('full');
      }
      expect(mailbox.size()).toBe(2); // Still 2, not 3
    });

    test('dequeues messages in FIFO order', () => {
      const mailbox = createBoundedMailbox<TestMessage>(5);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));
      mailbox.enqueue(createMessage('test', { value: 3 }));

      const msg1 = mailbox.dequeue();
      expect(msg1.isSome() && msg1.value.value).toBe(1);

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome() && msg2.value.value).toBe(2);

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome() && msg3.value.value).toBe(3);
    });

    test('dequeue returns None when empty', () => {
      const mailbox = createBoundedMailbox<TestMessage>(5);

      const result = mailbox.dequeue();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('capacity management', () => {
    test('tracks available space correctly', () => {
      const mailbox = createBoundedMailbox<TestMessage>(5);

      expect(mailbox.available()).toBe(5);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(mailbox.available()).toBe(4);

      mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(mailbox.available()).toBe(3);

      mailbox.dequeue();
      expect(mailbox.available()).toBe(4);
    });

    test('isFull returns correct state', () => {
      const mailbox = createBoundedMailbox<TestMessage>(2);

      expect(mailbox.isFull()).toBe(false);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(mailbox.isFull()).toBe(false);

      mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(mailbox.isFull()).toBe(true);

      mailbox.dequeue();
      expect(mailbox.isFull()).toBe(false);
    });

    test('accepts messages after space becomes available', () => {
      const mailbox = createBoundedMailbox<TestMessage>(2);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));

      // Full - reject
      const result1 = mailbox.enqueue(createMessage('test', { value: 3 }));
      expect(result1.success).toBe(false);

      // Make space
      mailbox.dequeue();

      // Now accept
      const result2 = mailbox.enqueue(createMessage('test', { value: 3 }));
      expect(result2.success).toBe(true);
    });
  });

  describe('peek', () => {
    test('returns next message without removing it', () => {
      const mailbox = createBoundedMailbox<TestMessage>(5);

      mailbox.enqueue(createMessage('test', { value: 42 }));

      const peek1 = mailbox.peek();
      expect(peek1.isSome() && peek1.value.value).toBe(42);
      expect(mailbox.size()).toBe(1); // Still there

      const peek2 = mailbox.peek();
      expect(peek2.isSome() && peek2.value.value).toBe(42);
      expect(mailbox.size()).toBe(1); // Still there
    });

    test('returns None when empty', () => {
      const mailbox = createBoundedMailbox<TestMessage>(5);

      const result = mailbox.peek();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('clear', () => {
    test('removes all messages and frees capacity', () => {
      const mailbox = createBoundedMailbox<TestMessage>(3);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));
      mailbox.enqueue(createMessage('test', { value: 3 }));

      expect(mailbox.isFull()).toBe(true);

      mailbox.clear();

      expect(mailbox.size()).toBe(0);
      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.isFull()).toBe(false);
      expect(mailbox.available()).toBe(3);
    });
  });

  describe('integration', () => {
    test('handles backpressure scenario', () => {
      const mailbox = createBoundedMailbox<TestMessage>(3);
      const rejected: number[] = [];

      // Try to enqueue 10 messages (only 3 should succeed)
      for (let i = 0; i < 10; i++) {
        const result = mailbox.enqueue(createMessage('test', { value: i }));
        if (!result.success) {
          rejected.push(i);
        }
      }

      expect(mailbox.size()).toBe(3);
      expect(rejected).toEqual([3, 4, 5, 6, 7, 8, 9]);
    });

    test('works as circular buffer pattern', () => {
      const mailbox = createBoundedMailbox<TestMessage>(2);

      // Fill up
      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));

      // Process one
      const msg1 = mailbox.dequeue();
      expect(msg1.isSome() && msg1.value.value).toBe(1);

      // Add one
      const result = mailbox.enqueue(createMessage('test', { value: 3 }));
      expect(result.success).toBe(true);

      // Process remaining
      const msg2 = mailbox.dequeue();
      expect(msg2.isSome() && msg2.value.value).toBe(2);

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome() && msg3.value.value).toBe(3);

      expect(mailbox.isEmpty()).toBe(true);
    });

    test('capacity of 1 works correctly', () => {
      const mailbox = createBoundedMailbox<TestMessage>(1);

      const result1 = mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(result1.success).toBe(true);

      const result2 = mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(result2.success).toBe(false);

      const msg = mailbox.dequeue();
      expect(msg.isSome() && msg.value.value).toBe(1);

      const result3 = mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(result3.success).toBe(true);
    });
  });
});
