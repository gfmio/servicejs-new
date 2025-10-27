/**
 * Network Transport
 *
 * WebSocket-based transport for cross-process and cross-machine communication.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isErr, isOk } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';
import type { Serializer } from './serialization.js';
import { createSerializer } from './serialization.js';

/**
 * Network transport configuration
 */
export interface NetworkTransportConfig {
  /** URN for this transport endpoint */
  readonly localUrn: URN;
  /** WebSocket URL to connect to */
  readonly url: string;
  /** Optional custom serializer (defaults to JSON serializer) */
  readonly serializer?: Serializer;
  /** Optional WebSocket protocols */
  readonly protocols?: string | string[];
  /** Connection timeout in milliseconds (default: 5000) */
  readonly connectionTimeout?: number;
  /** Auto-reconnect on connection loss (default: false) */
  readonly autoReconnect?: boolean;
  /** Reconnect interval in milliseconds (default: 1000) */
  readonly reconnectInterval?: number;
  /** Maximum reconnection attempts (default: 5) */
  readonly maxReconnectAttempts?: number;
}

/**
 * Create a network transport
 *
 * Network transports:
 * - Use WebSocket for bi-directional communication
 * - Serialize messages using the configured serializer
 * - Support auto-reconnection
 * - Handle connection lifecycle
 *
 * @example
 * ```typescript
 * const transport = createNetworkTransport({
 *   localUrn: 'urn:client:app',
 *   url: 'ws://localhost:8080',
 *   autoReconnect: true
 * });
 *
 * await transport.connect();
 *
 * transport.onReceive((envelope) => {
 *   console.log('From server:', envelope.message);
 * });
 *
 * await transport.send({
 *   from: 'urn:client:app',
 *   to: 'urn:server:api',
 *   message: { type: 'request', data: 'hello' }
 * });
 * ```
 */
export const createNetworkTransport = (config: NetworkTransportConfig): Transport => {
  const {
    localUrn,
    url,
    serializer = createSerializer(),
    protocols,
    connectionTimeout = 5000,
    autoReconnect = false,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
  } = config;

  let ws: WebSocket | undefined;
  let connected = false;
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  const attemptReconnect = (): void => {
    if (!autoReconnect || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    reconnectAttempts++;

    reconnectTimer = setTimeout(async () => {
      const result = await transport.connect();
      if (isOk(result)) {
        reconnectAttempts = 0; // Reset on successful connection
      }
    }, reconnectInterval);
  };

  const clearReconnectTimer = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  };

  const transport: Transport = {
    connect: async (urn?: URN): Promise<Result<void, TransportError>> => {
      if (connected && ws && ws.readyState === WebSocket.OPEN) {
        return ok(undefined);
      }

      try {
        // Close existing connection if any
        if (ws) {
          ws.close();
          ws = undefined;
        }

        // Create WebSocket connection
        ws = new WebSocket(url, protocols);

        // Wait for connection to open or fail
        const result = await new Promise<Result<void, TransportError>>((resolve) => {
          const timeout = setTimeout(() => {
            ws?.close();
            resolve(
              err({
                type: 'CONNECTION_FAILED',
                urn: localUrn,
                error: new Error('Connection timeout'),
              })
            );
          }, connectionTimeout);

          ws!.addEventListener('open', () => {
            clearTimeout(timeout);
            connected = true;
            reconnectAttempts = 0;
            resolve(ok(undefined));
          });

          ws!.addEventListener('error', (event) => {
            clearTimeout(timeout);
            resolve(
              err({
                type: 'CONNECTION_FAILED',
                urn: localUrn,
                error: event,
              })
            );
          });
        });

        if (isErr(result)) {
          return result;
        }

        // Set up message handler
        ws.addEventListener('message', (event: MessageEvent) => {
          if (typeof event.data !== 'string') {
            return; // Ignore non-string messages
          }

          const deserializeResult = serializer.deserialize(event.data);

          if (isErr(deserializeResult)) {
            if (errorHandler) {
              errorHandler(deserializeResult.error);
            }
            return;
          }

          if (!isOk(deserializeResult)) {
            return;
          }

          const envelope = deserializeResult.value;

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
        });

        // Set up close handler
        ws.addEventListener('close', () => {
          connected = false;

          if (errorHandler) {
            errorHandler({
              type: 'CONNECTION_CLOSED',
              urn: localUrn,
            });
          }

          // Attempt reconnection if enabled
          attemptReconnect();
        });

        // Set up error handler
        ws.addEventListener('error', (event) => {
          if (errorHandler) {
            errorHandler({
              type: 'CONNECTION_FAILED',
              urn: localUrn,
              error: event,
            });
          }
        });

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
      clearReconnectTimer();

      if (!ws) {
        connected = false;
        return ok(undefined);
      }

      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }

        ws = undefined;
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
      if (!connected || !ws || ws.readyState !== WebSocket.OPEN) {
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

        ws.send(serializeResult.value);

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
      return connected && !!ws && ws.readyState === WebSocket.OPEN;
    },

    getLocalUrn: (): URN => {
      return localUrn;
    },
  };

  return transport;
};
