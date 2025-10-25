import { describe, test, expect } from 'bun:test';
import { createFIFOMailbox } from '../src/fifoMailbox';
import { createMessage, type MessageOf } from '@servicejs/core';

type TestMessage = MessageOf<'test', { value: number }>;

describe('FIFOMailbox', () => {
  describe('basic operations', () => {
    test('starts empty', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.size()).toBe(0);
    });

    test('enqueues messages', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      mailbox.enqueue(createMessage('test', { value: 1 }));

      expect(mailbox.isEmpty()).toBe(false);
      expect(mailbox.size()).toBe(1);
    });

    test('dequeues messages in FIFO order', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));
      mailbox.enqueue(createMessage('test', { value: 3 }));

      const msg1 = mailbox.dequeue();
      expect(msg1.isSome()).toBe(true);
      if (msg1.isSome()) {
        expect(msg1.value.value).toBe(1);
      }

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome()).toBe(true);
      if (msg2.isSome()) {
        expect(msg2.value.value).toBe(2);
      }

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome()).toBe(true);
      if (msg3.isSome()) {
        expect(msg3.value.value).toBe(3);
      }
    });

    test('dequeue returns None when empty', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      const result = mailbox.dequeue();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('peek', () => {
    test('returns next message without removing it', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      mailbox.enqueue(createMessage('test', { value: 42 }));

      const peek1 = mailbox.peek();
      expect(peek1.isSome()).toBe(true);
      expect(mailbox.size()).toBe(1); // Still there

      const peek2 = mailbox.peek();
      expect(peek2.isSome()).toBe(true);
      expect(mailbox.size()).toBe(1); // Still there
    });

    test('returns None when empty', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      const result = mailbox.peek();

      expect(result.isNone()).toBe(true);
    });
  });

  describe('size and isEmpty', () => {
    test('tracks size correctly', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      expect(mailbox.size()).toBe(0);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(mailbox.size()).toBe(1);

      mailbox.enqueue(createMessage('test', { value: 2 }));
      expect(mailbox.size()).toBe(2);

      mailbox.dequeue();
      expect(mailbox.size()).toBe(1);

      mailbox.dequeue();
      expect(mailbox.size()).toBe(0);
    });

    test('isEmpty reflects state correctly', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      expect(mailbox.isEmpty()).toBe(true);

      mailbox.enqueue(createMessage('test', { value: 1 }));
      expect(mailbox.isEmpty()).toBe(false);

      mailbox.dequeue();
      expect(mailbox.isEmpty()).toBe(true);
    });
  });

  describe('clear', () => {
    test('removes all messages', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));
      mailbox.enqueue(createMessage('test', { value: 3 }));

      expect(mailbox.size()).toBe(3);

      mailbox.clear();

      expect(mailbox.size()).toBe(0);
      expect(mailbox.isEmpty()).toBe(true);
      expect(mailbox.dequeue().isNone()).toBe(true);
    });
  });

  describe('integration', () => {
    test('handles multiple enqueue/dequeue cycles', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      mailbox.enqueue(createMessage('test', { value: 1 }));
      mailbox.enqueue(createMessage('test', { value: 2 }));

      const msg1 = mailbox.dequeue();
      expect(msg1.isSome() && msg1.value.value).toBe(1);

      mailbox.enqueue(createMessage('test', { value: 3 }));

      const msg2 = mailbox.dequeue();
      expect(msg2.isSome() && msg2.value.value).toBe(2);

      const msg3 = mailbox.dequeue();
      expect(msg3.isSome() && msg3.value.value).toBe(3);

      expect(mailbox.isEmpty()).toBe(true);
    });

    test('maintains order with large number of messages', () => {
      const mailbox = createFIFOMailbox<TestMessage>();

      // Enqueue 100 messages
      for (let i = 0; i < 100; i++) {
        mailbox.enqueue(createMessage('test', { value: i }));
      }

      expect(mailbox.size()).toBe(100);

      // Dequeue and verify order
      for (let i = 0; i < 100; i++) {
        const msg = mailbox.dequeue();
        expect(msg.isSome()).toBe(true);
        if (msg.isSome()) {
          expect(msg.value.value).toBe(i);
        }
      }

      expect(mailbox.isEmpty()).toBe(true);
    });
  });
});
