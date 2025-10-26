/**
 * @servicejs/mailbox - Helper Utilities
 *
 * Utility functions for integrating mailboxes with components.
 */

import type { Message, Capability } from '@servicejs/core';
import { isSome } from '@servicejs/option';
import type { FIFOMailbox } from './fifoMailbox.js';
import type { PriorityMailbox } from './priorityMailbox.js';
import type { BoundedMailbox } from './boundedMailbox.js';

/**
 * Union type of all mailbox types.
 */
export type Mailbox<TMsg extends Message> =
  | FIFOMailbox<TMsg>
  | PriorityMailbox<TMsg>
  | BoundedMailbox<TMsg>;

/**
 * Wrap a capability with a mailbox.
 *
 * Messages sent to the returned capability are enqueued in the mailbox
 * instead of being delivered immediately. You must manually dequeue and
 * send messages to the underlying capability.
 *
 * @typeParam TMsg - The message type
 * @param mailbox - The mailbox to use for queueing
 * @param capability - The underlying capability to wrap
 * @returns A capability that enqueues messages
 *
 * @example
 * ```typescript
 * const component = createComponent(urn, state, reducer);
 * const mailbox = createFIFOMailbox<MyMsg>();
 * const bufferedCapability = createMailboxCapability(mailbox, component.capability);
 *
 * // Messages are queued, not processed immediately
 * bufferedCapability.send(message1);
 * bufferedCapability.send(message2);
 *
 * // Process messages manually
 * while (!mailbox.isEmpty()) {
 *   const msg = mailbox.dequeue();
 *   if (msg.isSome()) {
 *     component.capability.send(msg.value);
 *   }
 * }
 * ```
 */
export function createMailboxCapability<TMsg extends Message>(
  mailbox: Mailbox<TMsg>,
  _capability: Capability<TMsg>
): Capability<TMsg> {
  return {
    send: (message: TMsg) => {
      mailbox.enqueue(message);
    },
  };
}

/**
 * Options for wrapping a component with a mailbox.
 */
export interface WrapComponentOptions {
  /**
   * Whether to auto-process messages.
   * If true, messages are automatically dequeued and sent to the component.
   * If false, you must manually call processMessages().
   *
   * @default false
   */
  autoProcess?: boolean;

  /**
   * Maximum number of messages to process per batch.
   * Only used when autoProcess is true.
   *
   * @default Infinity
   */
  batchSize?: number;
}

/**
 * Wrap a component with a mailbox for buffered message processing.
 *
 * Returns a new capability that enqueues messages, and a function to
 * process the queued messages.
 *
 * @typeParam TMsg - The message type
 * @param mailbox - The mailbox to use for queueing
 * @param capability - The component's capability
 * @param options - Options for message processing
 * @returns Object with capability and processing function
 *
 * @example
 * ```typescript
 * const component = createComponent(urn, state, reducer);
 * const mailbox = createFIFOMailbox<MyMsg>();
 *
 * const wrapped = wrapComponentWithMailbox(mailbox, component.capability, {
 *   autoProcess: false,
 * });
 *
 * // Send messages (they get queued)
 * wrapped.capability.send(message1);
 * wrapped.capability.send(message2);
 *
 * // Process manually
 * wrapped.processMessages();
 * ```
 */
export function wrapComponentWithMailbox<TMsg extends Message>(
  mailbox: Mailbox<TMsg>,
  capability: Capability<TMsg>,
  options: WrapComponentOptions = {}
): {
  capability: Capability<TMsg>;
  processMessages: () => number;
  processBatch: (count: number) => number;
} {
  const { autoProcess = false, batchSize = Infinity } = options;

  const processMessages = (): number => {
    let processed = 0;
    while (!mailbox.isEmpty()) {
      const msg = mailbox.dequeue();
      if (isSome(msg)) {
        capability.send(msg.value);
        processed++;
      }
    }
    return processed;
  };

  const processBatch = (count: number): number => {
    let processed = 0;
    while (processed < count && !mailbox.isEmpty()) {
      const msg = mailbox.dequeue();
      if (isSome(msg)) {
        capability.send(msg.value);
        processed++;
      }
    }
    return processed;
  };

  const wrappedCapability: Capability<TMsg> = {
    send: (message: TMsg) => {
      mailbox.enqueue(message);

      if (autoProcess) {
        processBatch(batchSize);
      }
    },
  };

  return {
    capability: wrappedCapability,
    processMessages,
    processBatch,
  };
}

/**
 * Create an auto-processing capability that immediately processes messages.
 *
 * Messages are queued in the mailbox and immediately processed in order.
 * Useful for ensuring sequential message processing even with concurrent sends.
 *
 * @typeParam TMsg - The message type
 * @param mailbox - The mailbox to use for queueing
 * @param capability - The component's capability
 * @returns A capability that auto-processes messages
 *
 * @example
 * ```typescript
 * const component = createComponent(urn, state, reducer);
 * const mailbox = createFIFOMailbox<MyMsg>();
 * const capability = createAutoProcessingCapability(mailbox, component.capability);
 *
 * // Messages are queued and immediately processed in FIFO order
 * capability.send(message1);
 * capability.send(message2);
 * // Both messages have been processed by now
 * ```
 */
export function createAutoProcessingCapability<TMsg extends Message>(
  mailbox: Mailbox<TMsg>,
  capability: Capability<TMsg>
): Capability<TMsg> {
  return wrapComponentWithMailbox(mailbox, capability, {
    autoProcess: true,
    batchSize: Infinity,
  }).capability;
}
