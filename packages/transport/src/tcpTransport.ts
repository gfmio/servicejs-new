/**
 * TCP Transport
 *
 * Node.js TCP socket-based transport for high-performance network communication.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err, isErr, match } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';
import type { Serializer } from './serialization.js';
import { createSerializer } from './serialization.js';
import { Socket } from 'net';

/**
 * TCP transport configuration
 */
export interface TCPTransportConfig {
  /** URN for this transport endpoint */
  readonly localUrn: URN;
  /** Hostname to connect to */
  readonly host: string;
  /** Port to connect to */
  readonly port: number;
  /** Optional custom serializer (defaults to JSON serializer) */
  readonly serializer?: Serializer;
  /** Connection timeout in milliseconds (default: 5000) */
  readonly connectionTimeout?: number;
  /** Auto-reconnect on connection loss (default: false) */
  readonly autoReconnect?: boolean;
  /** Reconnect interval in milliseconds (default: 1000) */
  readonly reconnectInterval?: number;
  /** Maximum reconnection attempts (default: 5) */
  readonly maxReconnectAttempts?: number;
  /** Keep-alive enabled (default: true) */
  readonly keepAlive?: boolean;
  /** Keep-alive initial delay in milliseconds (default: 1000) */
  readonly keepAliveDelay?: number;
  /** Disable Nagle's algorithm for lower latency (default: true) */
  readonly noDelay?: boolean;
}

/**
 * Message framing for TCP streams
 *
 * Format: [4 bytes length][message data]
 */
class MessageFramer {
  private buffer: Buffer = Buffer.alloc(0);
  private readonly maxMessageSize: number;

  constructor(maxMessageSize: number = 10 * 1024 * 1024) {
    this.maxMessageSize = maxMessageSize;
  }

  /**
   * Frame a message for sending (prepend length)
   */
  frame(message: string): Buffer {
    const messageBuffer = Buffer.from(message, 'utf8');
    const lengthBuffer = Buffer.allocUnsafe(4);
    lengthBuffer.writeUInt32BE(messageBuffer.length, 0);
    return Buffer.concat([lengthBuffer, messageBuffer]);
  }

  /**
   * Parse incoming data and extract complete messages
   */
  parse(data: Buffer): string[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const messages: string[] = [];

    while (this.buffer.length >= 4) {
      // Read message length
      const messageLength = this.buffer.readUInt32BE(0);

      // Check for invalid length
      if (messageLength > this.maxMessageSize) {
        throw new Error(`Message too large: ${messageLength} > ${this.maxMessageSize}`);
      }

      // Check if we have the complete message
      if (this.buffer.length < 4 + messageLength) {
        break; // Wait for more data
      }

      // Extract message
      const messageBuffer = this.buffer.subarray(4, 4 + messageLength);
      const message = messageBuffer.toString('utf8');
      messages.push(message);

      // Remove processed message from buffer
      this.buffer = this.buffer.subarray(4 + messageLength);
    }

    return messages;
  }

  /**
   * Reset the buffer (useful after reconnection)
   */
  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}

/**
 * Create a TCP transport
 *
 * TCP transports:
 * - Use TCP sockets for reliable, ordered, stream-based communication
 * - Frame messages with length prefix for proper delimiting
 * - Support auto-reconnection
 * - Handle connection lifecycle
 * - Node.js only (uses 'net' module)
 *
 * @example
 * ```typescript
 * const transport = createTCPTransport({
 *   localUrn: 'urn:client:app',
 *   host: 'localhost',
 *   port: 8080,
 *   autoReconnect: true,
 *   noDelay: true,
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
export const createTCPTransport = (config: TCPTransportConfig): Transport => {
  const {
    localUrn,
    host,
    port,
    serializer = createSerializer(),
    connectionTimeout = 5000,
    autoReconnect = false,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
    keepAlive = true,
    keepAliveDelay = 1000,
    noDelay = true,
  } = config;

  let socket: Socket | undefined;
  let connected = false;
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  const framer = new MessageFramer();

  const attemptReconnect = (): void => {
    if (!autoReconnect || reconnectAttempts >= maxReconnectAttempts) {
      return;
    }

    reconnectAttempts++;

    reconnectTimer = setTimeout(async () => {
      const result = await transport.connect();
      if (isErr(result)) {
        attemptReconnect();
      } else {
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

  const setupSocket = (sock: Socket): void => {
    // Configure socket options
    if (keepAlive) {
      sock.setKeepAlive(true, keepAliveDelay);
    }
    if (noDelay) {
      sock.setNoDelay(true);
    }

    // Handle incoming data
    sock.on('data', (data: Buffer) => {
      try {
        const messages = framer.parse(data);
        for (const message of messages) {
          const deserializeResult = serializer.deserialize(message);
          match(deserializeResult, {
            onOk: (envelope: MessageEnvelope) => {
              receiveHandler?.(envelope);
            },
            onErr: (error: TransportError) => {
              errorHandler?.(error);
            },
          });
        }
      } catch (error) {
        errorHandler?.({
          type: 'DESERIALIZATION_FAILED',
          data: data.toString('utf8'),
          error,
        });
      }
    });

    // Handle connection close
    sock.on('close', (hadError: boolean) => {
      connected = false;
      socket = undefined;
      framer.reset();

      if (hadError) {
        errorHandler?.({
          type: 'CONNECTION_FAILED',
          error: new Error('Socket closed with error'),
        });
      }

      attemptReconnect();
    });

    // Handle errors
    sock.on('error', (error: Error) => {
      errorHandler?.({
        type: 'CONNECTION_FAILED',
        error,
      });
    });
  };

  const transport: Transport = {
    async connect(): Promise<Result<void, TransportError>> {
      if (connected) {
        return ok(undefined);
      }

      clearReconnectTimer();

      return new Promise((resolve) => {
        const sock = new Socket();
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        let resolved = false;

        const cleanup = () => {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            timeoutHandle = undefined;
          }
        };

        // Connection timeout
        timeoutHandle = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            sock.destroy();
            resolve(
              err({
                type: 'CONNECTION_FAILED',
                error: new Error(`Connection timeout after ${connectionTimeout}ms`),
              })
            );
          }
        }, connectionTimeout);

        // Connection success
        sock.once('connect', () => {
          cleanup();
          if (!resolved) {
            resolved = true;
            connected = true;
            socket = sock;
            reconnectAttempts = 0;
            setupSocket(sock);
            resolve(ok(undefined));
          }
        });

        // Connection error
        sock.once('error', (error: Error) => {
          cleanup();
          if (!resolved) {
            resolved = true;
            resolve(
              err({
                type: 'CONNECTION_FAILED',
                error,
              })
            );
          }
        });

        // Initiate connection
        sock.connect(port, host);
      });
    },

    async disconnect(): Promise<Result<void, TransportError>> {
      if (!socket) {
        return ok(undefined);
      }

      clearReconnectTimer();

      return new Promise((resolve) => {
        if (!socket) {
          resolve(ok(undefined));
          return;
        }

        socket.once('close', () => {
          connected = false;
          socket = undefined;
          framer.reset();
          resolve(ok(undefined));
        });

        socket.end();
      });
    },

    async send(envelope: MessageEnvelope): Promise<Result<void, TransportError>> {
      if (!connected || !socket) {
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

      // Frame message
      const serialized = match(serializeResult, {
        onOk: (value: string) => value,
        onErr: () => '', // This branch won't be reached due to isErr check above
      });
      const framedMessage = framer.frame(serialized);

      // Send via socket
      return new Promise((resolve) => {
        if (!socket) {
          resolve(err({ type: 'NOT_CONNECTED' }));
          return;
        }

        socket.write(framedMessage, (error?: Error | null) => {
          if (error) {
            resolve(
              err({
                type: 'SEND_FAILED',
                urn: envelope.to,
                error,
              })
            );
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    onReceive(handler: (envelope: MessageEnvelope) => void): void {
      receiveHandler = handler;
    },

    onError(handler: (error: TransportError) => void): void {
      errorHandler = handler;
    },

    isConnected(): boolean {
      return connected;
    },

    getLocalUrn(): URN {
      return localUrn;
    },
  };

  return transport;
};
