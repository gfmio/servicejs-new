/**
 * Worker Transport
 *
 * Transport for communication with Web Workers, Service Workers, and Shared Workers.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isErr, isOk } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';
import type { Serializer } from './serialization.js';
import { createSerializer } from './serialization.js';

/**
 * Worker-like interface (Web Worker, Service Worker, Shared Worker port)
 */
export interface WorkerLike {
  postMessage(message: unknown): void;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  addEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
  removeEventListener(type: 'error', listener: (event: ErrorEvent) => void): void;
}

/**
 * Worker transport configuration
 */
export interface WorkerTransportConfig {
  /** URN for this transport endpoint */
  readonly localUrn: URN;
  /** Worker instance to communicate with */
  readonly worker: WorkerLike;
  /** Optional custom serializer (defaults to JSON serializer) */
  readonly serializer?: Serializer;
}

/**
 * Create a worker transport
 *
 * Worker transports:
 * - Communicate via postMessage
 * - Work with Web Workers, Service Workers, Shared Workers
 * - Serialize messages using the configured serializer
 * - Handle connection lifecycle
 *
 * @example
 * ```typescript
 * const worker = new Worker('worker.js');
 *
 * const transport = createWorkerTransport({
 *   localUrn: 'urn:main:app',
 *   worker
 * });
 *
 * await transport.connect();
 *
 * transport.onReceive((envelope) => {
 *   console.log('From worker:', envelope.message);
 * });
 *
 * await transport.send({
 *   from: 'urn:main:app',
 *   to: 'urn:worker:processor',
 *   message: { type: 'process', data: [1, 2, 3] }
 * });
 * ```
 */
export const createWorkerTransport = (config: WorkerTransportConfig): Transport => {
  const { localUrn, worker, serializer = createSerializer() } = config;

  let connected = false;
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;

  let messageListener: ((event: MessageEvent) => void) | undefined;
  let errorListener: ((event: ErrorEvent) => void) | undefined;

  return {
    connect: async (urn?: URN): Promise<Result<void, TransportError>> => {
      if (connected) {
        return ok(undefined);
      }

      try {
        // Set up message listener
        messageListener = (event: MessageEvent): void => {
          if (typeof event.data !== 'string') {
            return; // Ignore non-string messages
          }

          const result = serializer.deserialize(event.data as string);

          if (isErr(result)) {
            if (errorHandler) {
              errorHandler(result.error);
            }
            return;
          }

          if (!isOk(result)) {
            return;
          }

          const envelope = result.value;

          if (receiveHandler) {
            try {
              receiveHandler(envelope);
            } catch (error) {
              if (errorHandler) {
                errorHandler({
                  type: 'SEND_FAILED',
                  urn: envelope.from,
                  error,
                });
              }
            }
          }
        };

        // Set up error listener
        errorListener = (event: ErrorEvent): void => {
          if (errorHandler) {
            errorHandler({
              type: 'CONNECTION_FAILED',
              urn: localUrn,
              error: event.error || new Error(event.message),
            });
          }
        };

        worker.addEventListener('message', messageListener);
        worker.addEventListener('error', errorListener);

        connected = true;

        return ok(undefined);
      } catch (error) {
        return err({
          type: 'CONNECTION_FAILED',
          urn: localUrn,
          error,
        });
      }
    },

    disconnect: async (): Promise<Result<void, TransportError>> => {
      if (!connected) {
        return ok(undefined);
      }

      try {
        if (messageListener) {
          worker.removeEventListener('message', messageListener);
          messageListener = undefined;
        }

        if (errorListener) {
          worker.removeEventListener('error', errorListener);
          errorListener = undefined;
        }

        connected = false;

        return ok(undefined);
      } catch (error) {
        return err({
          type: 'CONNECTION_FAILED',
          urn: localUrn,
          error,
        });
      }
    },

    send: async (envelope: MessageEnvelope): Promise<Result<void, TransportError>> => {
      if (!connected) {
        return err({
          type: 'NOT_CONNECTED',
          urn: localUrn,
        });
      }

      try {
        const serializeResult = serializer.serialize(envelope);

        if (isErr(serializeResult)) {
          return err(serializeResult.error);
        }

        if (!isOk(serializeResult)) {
          return err({
            type: 'SERIALIZATION_FAILED',
            message: envelope.message,
            error: new Error('Serialization failed'),
          });
        }

        worker.postMessage(serializeResult.value);

        return ok(undefined);
      } catch (error) {
        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error,
        });
      }
    },

    onReceive: (handler: (envelope: MessageEnvelope) => void): void => {
      receiveHandler = handler;
    },

    onError: (handler: (error: TransportError) => void): void => {
      errorHandler = handler;
    },

    isConnected: (): boolean => {
      return connected;
    },

    getLocalUrn: (): URN => {
      return localUrn;
    },
  };
};
