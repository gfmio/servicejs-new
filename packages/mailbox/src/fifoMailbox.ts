/**
 * @servicejs/mailbox - FIFO Mailbox
 *
 * A First-In-First-Out mailbox that delivers messages in the order they were received.
 * This is the simplest and most common mailbox type.
 */

import type { Message } from '@servicejs/core';
import { some, none, type Option } from '@servicejs/option';

/**
 * A FIFO (First-In-First-Out) mailbox for messages.
 *
 * Messages are delivered in the order they were enqueued.
 * This is a simple queue implementation.
 *
 * @typeParam TMsg - The message type
 *
 * @example
 * ```typescript
 * const mailbox = createFIFOMailbox<MyMessage>();
 *
 * mailbox.enqueue({ type: 'first' });
 * mailbox.enqueue({ type: 'second' });
 *
 * mailbox.dequeue(); // Some({ type: 'first' })
 * mailbox.dequeue(); // Some({ type: 'second' })
 * mailbox.dequeue(); // None()
 * ```
 */
export interface FIFOMailbox<TMsg extends Message> {
  /**
   * Add a message to the end of the mailbox.
   *
   * @param message - The message to enqueue
   */
  enqueue(message: TMsg): void;

  /**
   * Remove and return the next message from the front of the mailbox.
   *
   * @returns Some(message) if available, None if empty
   */
  dequeue(): Option<TMsg>;

  /**
   * Look at the next message without removing it.
   *
   * @returns Some(message) if available, None if empty
   */
  peek(): Option<TMsg>;

  /**
   * Get the number of messages currently in the mailbox.
   *
   * @returns The number of queued messages
   */
  size(): number;

  /**
   * Check if the mailbox is empty.
   *
   * @returns True if no messages are queued
   */
  isEmpty(): boolean;

  /**
   * Remove all messages from the mailbox.
   */
  clear(): void;
}

/**
 * Create a FIFO mailbox.
 *
 * @returns A new FIFO mailbox
 *
 * @example
 * ```typescript
 * const mailbox = createFIFOMailbox<LogMessage>();
 *
 * mailbox.enqueue({ type: 'log', text: 'Hello' });
 * mailbox.enqueue({ type: 'log', text: 'World' });
 *
 * console.log(mailbox.size()); // 2
 *
 * const msg1 = mailbox.dequeue(); // Some({ type: 'log', text: 'Hello' })
 * const msg2 = mailbox.dequeue(); // Some({ type: 'log', text: 'World' })
 * const msg3 = mailbox.dequeue(); // None()
 * ```
 */
export function createFIFOMailbox<TMsg extends Message>(): FIFOMailbox<TMsg> {
  const queue: TMsg[] = [];

  return {
    enqueue(message: TMsg): void {
      queue.push(message);
    },

    dequeue(): Option<TMsg> {
      const message = queue.shift();
      return message !== undefined ? some(message) : none();
    },

    peek(): Option<TMsg> {
      const message = queue[0];
      return message !== undefined ? some(message) : none();
    },

    size(): number {
      return queue.length;
    },

    isEmpty(): boolean {
      return queue.length === 0;
    },

    clear(): void {
      queue.length = 0;
    },
  };
}
