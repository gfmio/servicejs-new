/**
 * @servicejs/mailbox - Async Mailbox
 *
 * Async mailbox for asynchronous message processing.
 * Useful for I/O operations, API calls, database queries, etc.
 */

import type { Message } from '@servicejs/core';

/**
 * Async mailbox interface for asynchronous message processing.
 *
 * @typeParam TMsg - The message type
 */
export interface AsyncMailbox<TMsg extends Message> {
  /**
   * Enqueue a message for processing.
   *
   * @param message - The message to enqueue
   */
  enqueue(message: TMsg): void;

  /**
   * Start processing messages asynchronously.
   *
   * @param handler - Async function to process each message
   * @returns Promise that resolves when stopped
   */
  start(handler: (message: TMsg) => Promise<void>): Promise<void>;

  /**
   * Stop processing messages.
   * Waits for current message to complete.
   *
   * @returns Promise that resolves when stopped
   */
  stop(): Promise<void>;

  /**
   * Get the current size of the queue.
   *
   * @returns Number of messages in queue
   */
  size(): number;

  /**
   * Check if the mailbox is empty.
   *
   * @returns True if empty, false otherwise
   */
  isEmpty(): boolean;

  /**
   * Check if the mailbox is currently running.
   *
   * @returns True if running, false otherwise
   */
  isRunning(): boolean;

  /**
   * Clear all messages from the queue.
   */
  clear(): void;
}

/**
 * Create an async mailbox for asynchronous message processing.
 *
 * The async mailbox processes messages sequentially, waiting for each
 * message handler to complete before processing the next one.
 *
 * @typeParam TMsg - The message type
 * @returns A new async mailbox
 *
 * @example
 * ```typescript
 * const mailbox = createAsyncMailbox<ApiRequestMsg>();
 *
 * // Enqueue messages
 * mailbox.enqueue(createMessage('api-request', { url: '/users' }));
 *
 * // Start processing
 * mailbox.start(async (msg) => {
 *   const response = await fetch(msg.url);
 *   const data = await response.json();
 *   console.log('Received:', data);
 * });
 *
 * // Later: stop processing
 * await mailbox.stop();
 * ```
 */
export function createAsyncMailbox<TMsg extends Message>(): AsyncMailbox<TMsg> {
  const queue: TMsg[] = [];
  let running = false;
  let stopRequested = false;
  let currentProcessing: Promise<void> | null = null;
  let processLoop: (() => Promise<void>) | null = null;

  return {
    enqueue(message: TMsg): void {
      queue.push(message);
    },

    async start(handler: (message: TMsg) => Promise<void>): Promise<void> {
      if (running) {
        throw new Error('Async mailbox is already running');
      }

      running = true;
      stopRequested = false;

      processLoop = async () => {
        while (running && !stopRequested) {
          // Wait for a message or stop signal
          if (queue.length === 0) {
            // Sleep briefly to avoid busy-waiting
            await new Promise((resolve) => setTimeout(resolve, 10));
            continue;
          }

          const message = queue.shift();
          if (message) {
            try {
              currentProcessing = handler(message);
              await currentProcessing;
              currentProcessing = null;
            } catch (error) {
              currentProcessing = null;
              // Log error but continue processing
              console.error('Error processing message in async mailbox:', error);
            }
          }
        }

        running = false;
      };

      return processLoop();
    },

    async stop(): Promise<void> {
      if (!running) {
        return;
      }

      stopRequested = true;

      // Wait for current message to complete
      if (currentProcessing) {
        await currentProcessing;
      }

      // Wait for process loop to finish
      while (running) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },

    size(): number {
      return queue.length;
    },

    isEmpty(): boolean {
      return queue.length === 0;
    },

    isRunning(): boolean {
      return running;
    },

    clear(): void {
      queue.length = 0;
    },
  };
}
