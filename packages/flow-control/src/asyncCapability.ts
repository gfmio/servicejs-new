/**
 * @servicejs/flow-control - Async Capability with Backpressure
 *
 * Provides async send with backpressure support.
 */

import type { Capability, Message } from '@servicejs/core';

/**
 * Async capability interface with backpressure support.
 */
export interface AsyncCapability<TMsg extends Message> {
  /**
   * Send a message asynchronously.
   * Waits if the queue is full (backpressure).
   *
   * @param message - The message to send
   * @returns Promise that resolves when message is sent
   */
  sendAsync(message: TMsg): Promise<void>;

  /**
   * Get the current queue size.
   *
   * @returns The number of messages in the queue
   */
  queueSize(): number;

  /**
   * Check if the queue is full.
   *
   * @returns True if queue is at max capacity
   */
  isFull(): boolean;
}

/**
 * Configuration for async capability.
 */
export interface AsyncCapabilityConfig {
  /**
   * Maximum queue size before backpressure is applied.
   * Default: 100
   */
  maxQueueSize?: number;

  /**
   * Poll interval in milliseconds when waiting for queue space.
   * Default: 10
   */
  pollInterval?: number;
}

/**
 * Create an async capability with backpressure.
 *
 * When the queue is full, sendAsync will wait until space is available.
 * This provides automatic backpressure for producers.
 *
 * @typeParam TMsg - The message type
 * @param capability - The underlying capability to wrap
 * @param getQueueSize - Function that returns current queue size
 * @param config - Configuration options
 * @returns An async capability with backpressure
 *
 * @example
 * ```typescript
 * const mailbox = createFIFOMailbox<MyMessage>();
 * const capability = createCapability((msg) => mailbox.enqueue(msg));
 *
 * const asyncCap = createAsyncCapability(
 *   capability,
 *   () => mailbox.size(),
 *   { maxQueueSize: 10 }
 * );
 *
 * // This will wait if queue is full
 * await asyncCap.sendAsync({ type: 'work', data: 'value' });
 * ```
 */
export function createAsyncCapability<TMsg extends Message>(
  capability: Capability<TMsg>,
  getQueueSize: () => number,
  config: AsyncCapabilityConfig = {}
): AsyncCapability<TMsg> {
  const {
    maxQueueSize = 100,
    pollInterval = 10,
  } = config;

  return {
    async sendAsync(message: TMsg): Promise<void> {
      // Wait until queue has space
      while (getQueueSize() >= maxQueueSize) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      // Send the message
      capability.send(message);
    },

    queueSize(): number {
      return getQueueSize();
    },

    isFull(): boolean {
      return getQueueSize() >= maxQueueSize;
    },
  };
}
