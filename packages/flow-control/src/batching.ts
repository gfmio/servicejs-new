/**
 * @servicejs/flow-control - Batching
 *
 * Accumulates messages and sends them in batches for efficiency.
 */

import type { Capability, Message } from '@servicejs/core';

/**
 * Batch message containing accumulated messages.
 */
export interface BatchMessage<TMsg extends Message> extends Message {
  readonly type: 'batch';
  readonly messages: readonly TMsg[];
}

/**
 * Batching configuration.
 */
export interface BatchingConfig {
  /**
   * Maximum number of messages per batch.
   * When reached, the batch is flushed immediately.
   * Default: 100
   */
  maxBatchSize?: number;

  /**
   * Maximum time in milliseconds to wait before flushing a batch.
   * Default: 1000 (1 second)
   */
  maxBatchDelay?: number;

  /**
   * Optional callback when a batch is flushed.
   */
  onFlush?: (batchSize: number) => void;
}

/**
 * Batching capability wrapper.
 */
export interface BatchingCapability<TMsg extends Message> {
  /**
   * Add a message to the current batch.
   * The batch will be flushed when it reaches maxBatchSize or maxBatchDelay.
   *
   * @param message - The message to batch
   */
  send(message: TMsg): void;

  /**
   * Manually flush the current batch immediately.
   *
   * @returns The number of messages flushed
   */
  flush(): number;

  /**
   * Get the current batch size.
   *
   * @returns The number of messages in the current batch
   */
  getBatchSize(): number;

  /**
   * Stop batching and flush any pending messages.
   */
  stop(): void;
}

/**
 * Create a batching capability wrapper.
 *
 * Messages are accumulated into batches and sent together.
 * Batches are flushed when they reach maxBatchSize or after maxBatchDelay.
 *
 * @typeParam TMsg - The message type
 * @param capability - The underlying capability that receives batch messages
 * @param config - Batching configuration
 * @returns A batching capability
 *
 * @example
 * ```typescript
 * const batcher = createBatchingCapability<LogMessage>(
 *   batchCapability,
 *   {
 *     maxBatchSize: 50,
 *     maxBatchDelay: 5000,
 *     onFlush: (size) => console.log(`Flushed ${size} messages`)
 *   }
 * );
 *
 * // Messages are batched
 * batcher.send({ type: 'log', message: 'Event 1' });
 * batcher.send({ type: 'log', message: 'Event 2' });
 *
 * // Batch is sent when maxBatchSize or maxBatchDelay is reached
 * ```
 */
export function createBatchingCapability<TMsg extends Message>(
  capability: Capability<BatchMessage<TMsg>>,
  config: BatchingConfig = {}
): BatchingCapability<TMsg> {
  const {
    maxBatchSize = 100,
    maxBatchDelay = 1000,
    onFlush,
  } = config;

  let batch: TMsg[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): number => {
    if (batch.length === 0) {
      return 0;
    }

    const batchSize = batch.length;
    const batchMessage: BatchMessage<TMsg> = {
      type: 'batch',
      messages: [...batch],
    };

    capability.send(batchMessage);
    batch = [];

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    onFlush?.(batchSize);
    return batchSize;
  };

  const scheduleFlush = (): void => {
    if (timer) {
      return; // Already scheduled
    }

    timer = setTimeout(() => {
      flush();
    }, maxBatchDelay);
  };

  return {
    send(message: TMsg): void {
      batch.push(message);

      // Flush immediately if batch is full
      if (batch.length >= maxBatchSize) {
        flush();
      } else {
        // Schedule delayed flush
        scheduleFlush();
      }
    },

    flush(): number {
      return flush();
    },

    getBatchSize(): number {
      return batch.length;
    },

    stop(): void {
      flush();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
