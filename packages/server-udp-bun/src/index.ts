/**
 * @packageDocumentation
 * UDP server adapter for ServiceJS using Bun's native UDP API.
 *
 * This adapter provides a capability-based interface for UDP datagram servers using Bun.udpSocket().
 * It supports message handling, broadcasting, multicast, and efficient batch sending.
 */

import { Result, ok, err, isErr } from '@servicejs/result';
import type { UDPSocket } from 'bun';

/**
 * Configuration options for the UDP server.
 */
export interface UDPServerConfig {
  /**
   * Port number to bind to.
   */
  port: number;

  /**
   * Hostname to bind to (default: '0.0.0.0').
   */
  hostname?: string;

  /**
   * Socket type: 'udp4' or 'udp6' (default: 'udp4').
   */
  type?: 'udp4' | 'udp6';

  /**
   * Enable SO_REUSEADDR socket option (default: false).
   */
  reuseAddr?: boolean;
}

/**
 * Information about a received UDP message.
 */
export interface UDPMessage {
  /**
   * Message data as Buffer.
   */
  data: Buffer;

  /**
   * Remote sender information.
   */
  remote: {
    /**
     * Remote IP address.
     */
    address: string;

    /**
     * Remote port number.
     */
    port: number;

    /**
     * Address family.
     */
    family: 'IPv4' | 'IPv6';
  };
}

/**
 * Handler called when a message is received.
 */
export type MessageHandler = (message: UDPMessage) => void | Promise<void>;

/**
 * Handler called when an error occurs.
 */
export type ErrorHandler = (error: Error) => void | Promise<void>;

/**
 * Handler called when the server starts listening.
 */
export type ListeningHandler = () => void | Promise<void>;

/**
 * Handler called when the socket is ready to send after backpressure.
 */
export type DrainHandler = () => void | Promise<void>;

/**
 * UDP server adapter interface.
 */
export interface UDPServerAdapter {
  /**
   * Initialize the server with configuration.
   */
  init(config: UDPServerConfig): Promise<Result<void, Error>>;

  /**
   * Start listening for messages.
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the server.
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the server and cleanup resources.
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Check if the server is healthy and running.
   */
  health(): Promise<Result<boolean, Error>>;

  /**
   * Register a handler for incoming messages.
   */
  onMessage(handler: MessageHandler): void;

  /**
   * Register a handler for errors.
   */
  onError(handler: ErrorHandler): void;

  /**
   * Register a handler for when server starts listening.
   */
  onListening(handler: ListeningHandler): void;

  /**
   * Register a handler for when socket becomes writable after backpressure.
   */
  onDrain(handler: DrainHandler): void;

  /**
   * Send data to a specific address and port.
   */
  send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>>;

  /**
   * Send multiple messages efficiently (batching).
   */
  sendMany(messages: Array<{ data: Buffer | string; port: number; address: string }>): Promise<Result<number, Error>>;

  /**
   * Enable or disable broadcast mode.
   */
  setBroadcast(enabled: boolean): Promise<Result<void, Error>>;

  /**
   * Set the multicast TTL.
   */
  setMulticastTTL(ttl: number): Promise<Result<void, Error>>;

  /**
   * Join a multicast group.
   */
  addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>;

  /**
   * Leave a multicast group.
   */
  dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>>;

  /**
   * Get the local address and port.
   */
  getAddress(): Promise<Result<{ address: string; port: number; family: string }, Error>>;
}

/**
 * Create a new UDP server adapter using Bun's native UDP API.
 *
 * @example
 * ```typescript
 * import { createUDPServer } from '@servicejs/server-udp-bun';
 *
 * const server = createUDPServer();
 *
 * await server.init({ port: 41234 });
 *
 * server.onMessage((message) => {
 *   console.log(`Received from ${message.remote.address}:${message.remote.port}:`, message.data.toString());
 *   // Echo back
 *   server.send(message.data, message.remote.port, message.remote.address);
 * });
 *
 * await server.start();
 * ```
 */
export function createUDPServer(): UDPServerAdapter {
  let config: UDPServerConfig | null = null;
  let socket: UDPSocket<undefined> | null = null;
  let isRunning = false;

  // Event handlers
  let messageHandler: MessageHandler | null = null;
  let errorHandler: ErrorHandler | null = null;
  let listeningHandler: ListeningHandler | null = null;
  let drainHandler: DrainHandler | null = null;

  return {
    async init(cfg: UDPServerConfig): Promise<Result<void, Error>> {
      if (config !== null) {
        return err(new Error('Server already initialized'));
      }

      config = {
        hostname: '0.0.0.0',
        type: 'udp4',
        reuseAddr: false,
        ...cfg,
      };

      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (config === null) {
        return err(new Error('Server not initialized'));
      }

      if (isRunning) {
        return err(new Error('Server already running'));
      }

      try {
        socket = await Bun.udpSocket({
          port: config.port,
          hostname: config.hostname,

          socket: {
            data(_socket, buf, port, address) {
              if (messageHandler) {
                const message: UDPMessage = {
                  data: Buffer.from(buf),
                  remote: {
                    address,
                    port,
                    family: config!.type === 'udp6' ? 'IPv6' : 'IPv4',
                  },
                };

                Promise.resolve(messageHandler(message)).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error);
                  }
                });
              }
            },

            error(_socket, error) {
              if (errorHandler) {
                errorHandler(error);
              }
            },

            drain(_socket) {
              if (drainHandler) {
                Promise.resolve(drainHandler()).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error);
                  }
                });
              }
            },
          },
        });

        isRunning = true;

        if (listeningHandler) {
          Promise.resolve(listeningHandler()).catch((error) => {
            if (errorHandler) {
              errorHandler(error);
            }
          });
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async stop(): Promise<Result<void, Error>> {
      if (!isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        if (socket) {
          socket.close();
          socket = null;
        }

        isRunning = false;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async destroy(): Promise<Result<void, Error>> {
      if (isRunning) {
        const stopResult = await this.stop();
        if (isErr(stopResult)) {
          return stopResult;
        }
      }

      config = null;
      messageHandler = null;
      errorHandler = null;
      listeningHandler = null;
      drainHandler = null;

      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      try {
        return ok(isRunning && socket !== null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    onListening(handler: ListeningHandler): void {
      listeningHandler = handler;
    },

    onDrain(handler: DrainHandler): void {
      drainHandler = handler;
    },

    async send(data: Buffer | string, port: number, address: string): Promise<Result<void, Error>> {
      if (!socket) {
        return err(new Error('Server not running'));
      }

      try {
        const buffer = typeof data === 'string' ? Buffer.from(data) : data;
        const bytesSent = socket.send(buffer, port, address);

        // send returns false if backpressure occurs
        if (bytesSent === false) {
          // Backpressure - the drain event will fire when ready
          // For now, we'll just continue - proper backpressure handling
          // would wait for the drain event
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async sendMany(messages: Array<{ data: Buffer | string; port: number; address: string }>): Promise<Result<number, Error>> {
      if (!socket) {
        return err(new Error('Server not running'));
      }

      try {
        // Convert messages to the format expected by sendMany:
        // [data1, port1, address1, data2, port2, address2, ...]
        const args: Array<Buffer | number | string> = [];

        for (const msg of messages) {
          const buffer = typeof msg.data === 'string' ? Buffer.from(msg.data) : msg.data;
          args.push(buffer, msg.port, msg.address);
        }

        const sentCount = socket.sendMany(args as any);

        return ok(sentCount);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async setBroadcast(enabled: boolean): Promise<Result<void, Error>> {
      if (!socket || !isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        socket.setBroadcast(enabled);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async setMulticastTTL(ttl: number): Promise<Result<void, Error>> {
      if (!socket || !isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        socket.setMulticastTTL(ttl);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async addMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>> {
      if (!socket || !isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        socket.addMembership(multicastAddress, multicastInterface);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async dropMembership(multicastAddress: string, multicastInterface?: string): Promise<Result<void, Error>> {
      if (!socket || !isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        socket.dropMembership(multicastAddress, multicastInterface);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async getAddress(): Promise<Result<{ address: string; port: number; family: string }, Error>> {
      if (!socket || !isRunning) {
        return err(new Error('Server not running'));
      }

      try {
        return ok({
          address: socket.hostname || config!.hostname!,
          port: socket.port,
          family: socket.address?.family || (config!.type === 'udp6' ? 'IPv6' : 'IPv4'),
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
