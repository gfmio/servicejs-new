/**
 * @servicejs/mailbox - Priority Mailbox
 *
 * A mailbox that delivers messages based on priority rather than arrival order.
 * Higher priority messages are delivered first.
 */

import type { Message } from '@servicejs/core';
import { some, none, type Option } from '@servicejs/option';

/**
 * A priority mailbox for messages.
 *
 * Messages are delivered based on priority (higher priority first),
 * rather than arrival order.
 *
 * @typeParam TMsg - The message type
 *
 * @example
 * ```typescript
 * const mailbox = createPriorityMailbox<MyMessage>(
 *   (msg) => msg.priority
 * );
 *
 * mailbox.enqueue({ type: 'low', priority: 1 });
 * mailbox.enqueue({ type: 'high', priority: 10 });
 * mailbox.enqueue({ type: 'medium', priority: 5 });
 *
 * mailbox.dequeue(); // Some({ type: 'high', priority: 10 })
 * mailbox.dequeue(); // Some({ type: 'medium', priority: 5 })
 * mailbox.dequeue(); // Some({ type: 'low', priority: 1 })
 * ```
 */
export interface PriorityMailbox<TMsg extends Message> {
  /**
   * Add a message to the mailbox.
   * Message will be inserted based on its priority.
   *
   * @param message - The message to enqueue
   */
  enqueue(message: TMsg): void;

  /**
   * Remove and return the highest priority message.
   *
   * @returns Some(message) if available, None if empty
   */
  dequeue(): Option<TMsg>;

  /**
   * Look at the highest priority message without removing it.
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
 * Create a priority mailbox.
 *
 * @param getPriority - Function to extract priority from messages (higher = more important)
 * @returns A new priority mailbox
 *
 * @example
 * ```typescript
 * type TaskMessage = MessageOf<'task', { name: string; priority: number }>;
 *
 * const mailbox = createPriorityMailbox<TaskMessage>(
 *   (msg) => msg.priority
 * );
 *
 * mailbox.enqueue({ type: 'task', name: 'low', priority: 1 });
 * mailbox.enqueue({ type: 'task', name: 'urgent', priority: 10 });
 * mailbox.enqueue({ type: 'task', name: 'normal', priority: 5 });
 *
 * const first = mailbox.dequeue(); // urgent (priority 10)
 * const second = mailbox.dequeue(); // normal (priority 5)
 * const third = mailbox.dequeue(); // low (priority 1)
 * ```
 */
export function createPriorityMailbox<TMsg extends Message>(
  getPriority: (message: TMsg) => number
): PriorityMailbox<TMsg> {
  const queue: TMsg[] = [];

  // Insert message in priority order (highest priority first)
  const insertByPriority = (message: TMsg): void => {
    const priority = getPriority(message);

    // Find insertion point (keep queue sorted by priority, descending)
    let insertIndex = 0;
    while (
      insertIndex < queue.length &&
      getPriority(queue[insertIndex]) >= priority
    ) {
      insertIndex++;
    }

    queue.splice(insertIndex, 0, message);
  };

  return {
    enqueue(message: TMsg): void {
      insertByPriority(message);
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
