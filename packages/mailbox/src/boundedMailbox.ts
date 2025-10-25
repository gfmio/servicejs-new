/**
 * @servicejs/mailbox - Bounded Mailbox
 *
 * A mailbox with a maximum capacity that rejects messages when full.
 * Useful for backpressure and preventing unbounded memory growth.
 */

import type { Message } from '@servicejs/core';
import { some, none, type Option } from '@servicejs/option';

/**
 * Result of attempting to enqueue a message.
 */
export type EnqueueResult = { readonly success: true } | { readonly success: false; readonly reason: 'full' };

/**
 * A bounded mailbox for messages.
 *
 * Has a maximum capacity and rejects messages when full.
 * This provides backpressure and prevents unbounded memory growth.
 *
 * @typeParam TMsg - The message type
 *
 * @example
 * ```typescript
 * const mailbox = createBoundedMailbox<MyMessage>(2); // Max 2 messages
 *
 * mailbox.enqueue({ type: 'first' }); // { success: true }
 * mailbox.enqueue({ type: 'second' }); // { success: true }
 * mailbox.enqueue({ type: 'third' }); // { success: false, reason: 'full' }
 *
 * mailbox.dequeue(); // Some({ type: 'first' })
 * mailbox.enqueue({ type: 'third' }); // { success: true } - now there's room
 * ```
 */
export interface BoundedMailbox<TMsg extends Message> {
  /**
   * Attempt to add a message to the mailbox.
   *
   * @param message - The message to enqueue
   * @returns Success if enqueued, failure with reason if rejected
   */
  enqueue(message: TMsg): EnqueueResult;

  /**
   * Remove and return the next message.
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
   * Get the maximum capacity of the mailbox.
   *
   * @returns The maximum number of messages this mailbox can hold
   */
  capacity(): number;

  /**
   * Check if the mailbox is empty.
   *
   * @returns True if no messages are queued
   */
  isEmpty(): boolean;

  /**
   * Check if the mailbox is full.
   *
   * @returns True if the mailbox is at capacity
   */
  isFull(): boolean;

  /**
   * Get the number of available slots.
   *
   * @returns The number of messages that can be enqueued before reaching capacity
   */
  available(): number;

  /**
   * Remove all messages from the mailbox.
   */
  clear(): void;
}

/**
 * Create a bounded mailbox.
 *
 * @param maxCapacity - The maximum number of messages the mailbox can hold
 * @returns A new bounded mailbox
 *
 * @example
 * ```typescript
 * const mailbox = createBoundedMailbox<LogMessage>(10);
 *
 * console.log(mailbox.capacity()); // 10
 * console.log(mailbox.available()); // 10
 *
 * for (let i = 0; i < 15; i++) {
 *   const result = mailbox.enqueue({ type: 'log', text: `Message ${i}` });
 *   if (!result.success) {
 *     console.log(`Message ${i} rejected: ${result.reason}`);
 *   }
 * }
 *
 * console.log(mailbox.size()); // 10 (not 15)
 * console.log(mailbox.isFull()); // true
 * ```
 */
export function createBoundedMailbox<TMsg extends Message>(
  maxCapacity: number
): BoundedMailbox<TMsg> {
  if (maxCapacity <= 0) {
    throw new Error('Mailbox capacity must be positive');
  }

  const queue: TMsg[] = [];

  return {
    enqueue(message: TMsg): EnqueueResult {
      if (queue.length >= maxCapacity) {
        return { success: false, reason: 'full' };
      }

      queue.push(message);
      return { success: true };
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

    capacity(): number {
      return maxCapacity;
    },

    isEmpty(): boolean {
      return queue.length === 0;
    },

    isFull(): boolean {
      return queue.length >= maxCapacity;
    },

    available(): number {
      return maxCapacity - queue.length;
    },

    clear(): void {
      queue.length = 0;
    },
  };
}
