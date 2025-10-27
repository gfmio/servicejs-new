/**
 * Shared Memory Transport
 *
 * High-performance, lock-free transport using SharedArrayBuffer for inter-worker communication.
 */

import type { URN, Message } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isOk, isErr, match } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';
import type { Serializer } from './serialization.js';
import { createJsonSerializer } from './serialization.js';

/**
 * Ring buffer configuration
 */
export interface RingBufferConfig {
  /**
   * Number of message slots in the buffer
   */
  readonly capacity: number;

  /**
   * Maximum message size in bytes
   */
  readonly maxMessageSize: number;
}

/**
 * Ring buffer header structure
 *
 * Memory layout:
 * [0-3]: Read pointer (4 bytes)
 * [4-7]: Write pointer (4 bytes)
 * [8-11]: Message count (4 bytes)
 * [12-15]: Reserved (4 bytes)
 */
const HEADER_SIZE = 16;
const READ_PTR_OFFSET = 0;
const WRITE_PTR_OFFSET = 4;
const COUNT_OFFSET = 8;

/**
 * Message slot structure
 *
 * Memory layout per slot:
 * [0-3]: Message length (4 bytes)
 * [4...]: Message data (up to maxMessageSize bytes)
 */
const SLOT_HEADER_SIZE = 4;

/**
 * Ring buffer for lock-free message passing
 *
 * Uses a SharedArrayBuffer with atomic operations for thread-safe access.
 */
export class RingBuffer {
  private readonly buffer: Int32Array;
  private readonly dataView: Uint8Array;
  private readonly capacity: number;
  private readonly maxMessageSize: number;
  private readonly slotSize: number;

  /**
   * Create a ring buffer
   *
   * @param sharedBuffer - SharedArrayBuffer to use
   * @param config - Buffer configuration
   */
  constructor(sharedBuffer: SharedArrayBuffer, config: RingBufferConfig) {
    this.buffer = new Int32Array(sharedBuffer);
    this.dataView = new Uint8Array(sharedBuffer);
    this.capacity = config.capacity;
    this.maxMessageSize = config.maxMessageSize;
    this.slotSize = SLOT_HEADER_SIZE + this.maxMessageSize;

    // Validate buffer size
    const requiredSize = HEADER_SIZE + this.capacity * this.slotSize;
    if (sharedBuffer.byteLength < requiredSize) {
      throw new Error(
        `SharedArrayBuffer too small: ${sharedBuffer.byteLength} < ${requiredSize}`
      );
    }
  }

  /**
   * Initialize the ring buffer (call once from one thread)
   */
  initialize(): void {
    Atomics.store(this.buffer, READ_PTR_OFFSET / 4, 0);
    Atomics.store(this.buffer, WRITE_PTR_OFFSET / 4, 0);
    Atomics.store(this.buffer, COUNT_OFFSET / 4, 0);
  }

  /**
   * Write a message to the buffer
   *
   * @param data - Message data as Uint8Array
   * @returns true if written, false if buffer is full
   */
  write(data: Uint8Array): boolean {
    if (data.length > this.maxMessageSize) {
      throw new Error(
        `Message too large: ${data.length} > ${this.maxMessageSize}`
      );
    }

    // Check if buffer is full
    const count = Atomics.load(this.buffer, COUNT_OFFSET / 4);
    if (count >= this.capacity) {
      return false; // Buffer full
    }

    // Get write position
    const writePtr = Atomics.load(this.buffer, WRITE_PTR_OFFSET / 4);
    const slotOffset = HEADER_SIZE + writePtr * this.slotSize;

    // Write message length
    const lengthView = new Int32Array(this.dataView.buffer, slotOffset, 1);
    lengthView[0] = data.length;

    // Write message data
    const dataOffset = slotOffset + SLOT_HEADER_SIZE;
    this.dataView.set(data, dataOffset);

    // Update write pointer (with wraparound)
    const nextWritePtr = (writePtr + 1) % this.capacity;
    Atomics.store(this.buffer, WRITE_PTR_OFFSET / 4, nextWritePtr);

    // Increment count
    Atomics.add(this.buffer, COUNT_OFFSET / 4, 1);

    return true;
  }

  /**
   * Read a message from the buffer
   *
   * @returns Message data or undefined if buffer is empty
   */
  read(): Uint8Array | undefined {
    // Check if buffer is empty
    const count = Atomics.load(this.buffer, COUNT_OFFSET / 4);
    if (count === 0) {
      return undefined; // Buffer empty
    }

    // Get read position
    const readPtr = Atomics.load(this.buffer, READ_PTR_OFFSET / 4);
    const slotOffset = HEADER_SIZE + readPtr * this.slotSize;

    // Read message length
    const lengthView = new Int32Array(this.dataView.buffer, slotOffset, 1);
    const length = lengthView[0];

    // Read message data
    const dataOffset = slotOffset + SLOT_HEADER_SIZE;
    const data = new Uint8Array(length);
    data.set(this.dataView.subarray(dataOffset, dataOffset + length));

    // Update read pointer (with wraparound)
    const nextReadPtr = (readPtr + 1) % this.capacity;
    Atomics.store(this.buffer, READ_PTR_OFFSET / 4, nextReadPtr);

    // Decrement count
    Atomics.sub(this.buffer, COUNT_OFFSET / 4, 1);

    return data;
  }

  /**
   * Get the current number of messages in the buffer
   */
  getCount(): number {
    return Atomics.load(this.buffer, COUNT_OFFSET / 4);
  }

  /**
   * Get the remaining capacity
   */
  getAvailable(): number {
    return this.capacity - this.getCount();
  }

  /**
   * Check if the buffer is full
   */
  isFull(): boolean {
    return this.getCount() >= this.capacity;
  }

  /**
   * Check if the buffer is empty
   */
  isEmpty(): boolean {
    return this.getCount() === 0;
  }

  /**
   * Get the buffer capacity
   */
  getCapacity(): number {
    return this.capacity;
  }
}

/**
 * Shared memory transport configuration
 */
export interface SharedMemoryTransportConfig {
  /**
   * Local URN for this transport endpoint
   */
  readonly localUrn: URN;

  /**
   * SharedArrayBuffer for sending (writing) messages
   */
  readonly sendBuffer: SharedArrayBuffer;

  /**
   * SharedArrayBuffer for receiving (reading) messages
   */
  readonly receiveBuffer: SharedArrayBuffer;

  /**
   * Ring buffer configuration
   */
  readonly bufferConfig: RingBufferConfig;

  /**
   * Optional serializer (defaults to JSON)
   */
  readonly serializer?: Serializer;

  /**
   * Polling interval in milliseconds (defaults to 0 for tight loop)
   */
  readonly pollInterval?: number;
}

/**
 * Create a SharedArrayBuffer for the ring buffer
 *
 * @param config - Buffer configuration
 * @returns SharedArrayBuffer sized appropriately
 */
export const createSharedBuffer = (config: RingBufferConfig): SharedArrayBuffer => {
  const slotSize = SLOT_HEADER_SIZE + config.maxMessageSize;
  const requiredSize = HEADER_SIZE + config.capacity * slotSize;
  return new SharedArrayBuffer(requiredSize);
};

/**
 * Create a shared memory transport
 *
 * High-performance, lock-free transport using SharedArrayBuffer.
 *
 * @example
 * ```typescript
 * // In main thread
 * const bufferConfig = { capacity: 32, maxMessageSize: 1024 };
 * const mainToWorkerBuffer = createSharedBuffer(bufferConfig);
 * const workerToMainBuffer = createSharedBuffer(bufferConfig);
 *
 * const mainTransport = createSharedMemoryTransport({
 *   localUrn: 'urn:main:app',
 *   sendBuffer: mainToWorkerBuffer,
 *   receiveBuffer: workerToMainBuffer,
 *   bufferConfig
 * });
 *
 * // Pass buffers to worker (note reversed order)
 * worker.postMessage({ mainToWorkerBuffer, workerToMainBuffer });
 *
 * // In worker
 * const workerTransport = createSharedMemoryTransport({
 *   localUrn: 'urn:worker:processor',
 *   sendBuffer: workerToMainBuffer,  // Reversed
 *   receiveBuffer: mainToWorkerBuffer, // Reversed
 *   bufferConfig
 * });
 * ```
 */
export const createSharedMemoryTransport = (
  config: SharedMemoryTransportConfig
): Transport => {
  const serializer = config.serializer ?? createJsonSerializer();
  const sendBuffer = new RingBuffer(config.sendBuffer, config.bufferConfig);
  const receiveBuffer = new RingBuffer(config.receiveBuffer, config.bufferConfig);
  const pollInterval = config.pollInterval ?? 0;

  // Initialize buffers only if they appear uninitialized
  // Check if count is in valid range (0 to capacity)
  const sendCount = sendBuffer.getCount();
  if (sendCount < 0 || sendCount > config.bufferConfig.capacity) {
    sendBuffer.initialize();
  }

  const receiveCount = receiveBuffer.getCount();
  if (receiveCount < 0 || receiveCount > config.bufferConfig.capacity) {
    receiveBuffer.initialize();
  }

  let connected = false;
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;
  let pollingActive = false;
  let pollingTimer: Timer | undefined;

  /**
   * Polling loop to check for incoming messages
   */
  const pollMessages = () => {
    if (!pollingActive || !receiveHandler) {
      return;
    }

    try {
      // Read all available messages from receive buffer
      let data = receiveBuffer.read();
      while (data) {
        // Convert Uint8Array to string
        const str = new TextDecoder().decode(data);

        // Deserialize envelope
        const deserializeResult = serializer.deserialize(str);
        match(deserializeResult, {
          onOk: (envelope: MessageEnvelope) => {
            receiveHandler?.(envelope);
          },
          onErr: (error: TransportError) => {
            errorHandler?.(error);
          },
        });

        data = receiveBuffer.read();
      }
    } catch (error) {
      errorHandler?.({
        type: 'SEND_FAILED',
        error,
      });
    }

    // Schedule next poll
    if (pollingActive) {
      if (pollInterval > 0) {
        pollingTimer = setTimeout(pollMessages, pollInterval);
      } else {
        // Tight loop with setImmediate-like behavior
        pollingTimer = setTimeout(pollMessages, 0);
      }
    }
  };

  return {
    async connect() {
      if (connected) {
        return ok(undefined);
      }

      connected = true;
      pollingActive = true;

      // Start polling loop
      pollMessages();

      return ok(undefined);
    },

    async disconnect() {
      if (!connected) {
        return ok(undefined);
      }

      connected = false;
      pollingActive = false;

      // Cancel polling
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = undefined;
      }

      return ok(undefined);
    },

    async send(envelope) {
      if (!connected) {
        return err({ type: 'NOT_CONNECTED' });
      }

      // Serialize envelope
      const serializeResult = serializer.serialize(envelope);
      if (isErr(serializeResult)) {
        return err({
          type: 'SERIALIZATION_FAILED',
          message: envelope.message,
          error: serializeResult.error,
        });
      }

      try {
        // Convert string to Uint8Array
        const serialized = match(serializeResult, {
          onOk: (value: string) => value,
          onErr: () => '', // This branch won't be reached due to isErr check above
        });
        const data = new TextEncoder().encode(serialized);

        // Write to send buffer
        const written = sendBuffer.write(data);

        if (!written) {
          return err({
            type: 'SEND_FAILED',
            urn: envelope.to,
            error: new Error('Ring buffer full'),
          });
        }

        return ok(undefined);
      } catch (error) {
        if (error instanceof Error && error.message.includes('too large')) {
          return err({
            type: 'SERIALIZATION_FAILED',
            message: envelope.message,
            error,
          });
        }

        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error,
        });
      }
    },

    onReceive(handler) {
      receiveHandler = handler;
    },

    onError(handler) {
      errorHandler = handler;
    },

    isConnected() {
      return connected;
    },

    getLocalUrn() {
      return config.localUrn;
    },
  };
};
