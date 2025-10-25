import { describe, test, expect } from 'bun:test';
import { createPriorityMailbox } from '../src/priorityMailbox';
import { createMessage, type MessageOf } from '@servicejs/core';

type TestMessage = MessageOf<'test', { value: number; priority: number }>;

describe('PriorityMailbox', () => {
  describe('basic operations', () => {
    test('starts empty', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.size()).toBe(0);
    });

    test('enqueues messages', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 5 }));

      expect(mailbox.isEmpty()).toBe(false);
      expect(mailbox.size()).toBe(1);
    });

    test('dequeues messages by priority (highest first)', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 3 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 10 }));
      mailbox.enqueue(createMessage('test', { value: 3, priority: 5 }));

      const msg1 = mailbox.dequeue();
      expect(msg1.isSome()).toBe(true);
      if (msg1.isSome()) {
        expect(msg1.value.value).toBe(2); // priority 10
      }

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome()).toBe(true);
      if (msg2.isSome()) {
        expect(msg2.value.value).toBe(3); // priority 5
      }

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome()).toBe(true);
      if (msg3.isSome()) {
        expect(msg3.value.value).toBe(1); // priority 3
      }
    });

    test('dequeue returns None when empty', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      const result = mailbox.dequeue();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('priority ordering', () => {
    test('maintains priority order when enqueuing', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      // Enqueue in random priority order
      mailbox.enqueue(createMessage('test', { value: 1, priority: 5 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 1 }));
      mailbox.enqueue(createMessage('test', { value: 3, priority: 10 }));
      mailbox.enqueue(createMessage('test', { value: 4, priority: 3 }));
      mailbox.enqueue(createMessage('test', { value: 5, priority: 7 }));

      // Should dequeue in priority order: 10, 7, 5, 3, 1
      const values: number[] = [];
      while (!mailbox.isEmpty()) {
        const msg = mailbox.dequeue();
        if (msg.isSome()) {
          values.push(msg.value.value);
        }
      }

      expect(values).toEqual([3, 5, 1, 4, 2]); // Corresponding to priorities [10, 7, 5, 3, 1]
    });

    test('handles equal priorities (FIFO within same priority)', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 5 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 5 }));
      mailbox.enqueue(createMessage('test', { value: 3, priority: 5 }));

      // With equal priority, should maintain insertion order
      const msg1 = mailbox.dequeue();
      expect(msg1.isSome() && msg1.value.value).toBe(1);

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome() && msg2.value.value).toBe(2);

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome() && msg3.value.value).toBe(3);
    });
  });

  describe('peek', () => {
    test('returns highest priority message without removing it', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 3 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 10 }));

      const peek1 = mailbox.peek();
      expect(peek1.isSome()).toBe(true);
      if (peek1.isSome()) {
        expect(peek1.value.value).toBe(2); // priority 10
      }
      expect(mailbox.size()).toBe(2); // Still there

      const peek2 = mailbox.peek();
      expect(peek2.isSome()).toBe(true);
      expect(mailbox.size()).toBe(2); // Still there
    });

    test('returns None when empty', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      const result = mailbox.peek();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('size and isEmpty', () => {
    test('tracks size correctly', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      expect(mailbox.size()).toBe(0);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 5 }));
      expect(mailbox.size()).toBe(1);

      mailbox.enqueue(createMessage('test', { value: 2, priority: 10 }));
      expect(mailbox.size()).toBe(2);

      mailbox.dequeue();
      expect(mailbox.size()).toBe(1);

      mailbox.dequeue();
      expect(mailbox.size()).toBe(0);
    });
  });

  describe('clear', () => {
    test('removes all messages', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 3 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 10 }));
      mailbox.enqueue(createMessage('test', { value: 3, priority: 5 }));

      expect(mailbox.size()).toBe(3);

      mailbox.clear();

      expect(mailbox.size()).toBe(0);
      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.dequeue().isNone()).toBe(true);
    });
  });

  describe('integration', () => {
    test('handles interleaved enqueue/dequeue with priorities', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: 5 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 3 }));

      const msg1 = mailbox.dequeue(); // Gets priority 5
      expect(msg1.isSome() && msg1.value.value).toBe(1);

      mailbox.enqueue(createMessage('test', { value: 3, priority: 10 }));
      mailbox.enqueue(createMessage('test', { value: 4, priority: 1 }));

      const msg2 = mailbox.dequeue(); // Gets priority 10
      expect(msg2.isSome() && msg2.value.value).toBe(3);

      const msg3 = mailbox.dequeue(); // Gets priority 3
      expect(msg3.isSome() && msg3.value.value).toBe(2);

      const msg4 = mailbox.dequeue(); // Gets priority 1
      expect(msg4.isSome() && msg4.value.value).toBe(4);

      expect(mailbox.isEmpty()).toBe(true);
    });

    test('works with negative priorities', () => {
      const mailbox = createPriorityMailbox<TestMessage>(msg => msg.priority);

      mailbox.enqueue(createMessage('test', { value: 1, priority: -5 }));
      mailbox.enqueue(createMessage('test', { value: 2, priority: 0 }));
      mailbox.enqueue(createMessage('test', { value: 3, priority: 5 }));

      const msg1 = mailbox.dequeue();
      expect(msg1.isSome() && msg1.value.value).toBe(3); // priority 5

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome() && msg2.value.value).toBe(2); // priority 0

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome() && msg3.value.value).toBe(1); // priority -5
    });
  });
});
