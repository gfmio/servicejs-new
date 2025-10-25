/**
 * @servicejs/mailbox
 *
 * Mailbox implementations for message queuing and buffering.
 *
 * This package provides different mailbox types:
 * - **FIFO**: First-In-First-Out delivery
 * - **Priority**: Priority-based delivery
 * - **Bounded**: Limited capacity with backpressure
 *
 * @example
 * ```typescript
 * import { createFIFOMailbox, createPriorityMailbox, createBoundedMailbox } from '@servicejs/mailbox';
 *
 * // FIFO mailbox
 * const fifo = createFIFOMailbox<MyMessage>();
 * fifo.enqueue({ type: 'test' });
 *
 * // Priority mailbox
 * const priority = createPriorityMailbox<MyMessage>(msg => msg.priority);
 * priority.enqueue({ type: 'urgent', priority: 10 });
 *
 * // Bounded mailbox
 * const bounded = createBoundedMailbox<MyMessage>(10);
 * const result = bounded.enqueue({ type: 'test' });
 * if (!result.success) {
 *   console.log('Mailbox full');
 * }
 * ```
 */

// FIFO Mailbox
export {
  createFIFOMailbox,
  type FIFOMailbox,
} from './fifoMailbox.js';

// Priority Mailbox
export {
  createPriorityMailbox,
  type PriorityMailbox,
} from './priorityMailbox.js';

// Bounded Mailbox
export {
  createBoundedMailbox,
  type BoundedMailbox,
  type EnqueueResult,
} from './boundedMailbox.js';
