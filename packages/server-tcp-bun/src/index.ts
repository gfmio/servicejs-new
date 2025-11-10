/**
 * @packageDocumentation
 * TCP server adapter for ServiceJS using Bun's native TCP API.
 *
 * This adapter provides a capability-based interface for TCP servers using Bun.listen().
 * It supports bidirectional communication, connection tracking, and graceful shutdown.
 */

import { Result, ok, err, isErr } from '@servicejs/result';
import type { SocketHandler, TCPSocketListener } from 'bun';

/**
 * Configuration options for the TCP server.
 */
export interface TCPServerConfig {
  /**
   * Port number to listen on.
   */
  port: number;

  /**
   * Hostname to bind to (default: '0.0.0.0').
   */
  hostname?: string;

  /**
   * Maximum number of concurrent connections (optional).
   */
  maxConnections?: number;

  /**
   * Connection timeout in milliseconds (optional).
   */
  timeout?: number;
}

/**
 * Information about a TCP connection.
 */
export interface TCPConnection {
  /**
   * Unique connection identifier.
   */
  id: string;

  /**
   * Remote address.
   */
  remoteAddress: string;

  /**
   * Remote port.
   */
  remotePort: number;

  /**
   * Connection timestamp.
   */
  connectedAt: Date;
}

/**
 * Handler called when a new connection is established.
 */
export type ConnectionHandler = (connection: TCPConnection) => void | Promise<void>;

/**
 * Handler called when data is received from a connection.
 */
export type DataHandler = (connectionId: string, data: Buffer) => void | Promise<void>;

/**
 * Handler called when a connection is closed.
 */
export type CloseHandler = (connectionId: string) => void | Promise<void>;

/**
 * Handler called when an error occurs.
 */
export type ErrorHandler = (error: Error, connectionId?: string) => void | Promise<void>;

/**
 * TCP server adapter interface.
 */
export interface TCPServerAdapter {
  /**
   * Initialize the server with configuration.
   */
  init(config: TCPServerConfig): Promise<Result<void, Error>>;

  /**
   * Start listening for connections.
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop accepting new connections and close existing ones.
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
   * Register a handler for new connections.
   */
  onConnection(handler: ConnectionHandler): void;

  /**
   * Register a handler for incoming data.
   */
  onData(handler: DataHandler): void;

  /**
   * Register a handler for connection closures.
   */
  onClose(handler: CloseHandler): void;

  /**
   * Register a handler for errors.
   */
  onError(handler: ErrorHandler): void;

  /**
   * Send data to a specific connection.
   */
  send(connectionId: string, data: string | Buffer): Promise<Result<void, Error>>;

  /**
   * Broadcast data to all connected clients.
   */
  broadcast(data: string | Buffer): Promise<Result<void, Error>>;

  /**
   * Close a specific connection.
   */
  closeConnection(connectionId: string): Promise<Result<void, Error>>;

  /**
   * Get all active connections.
   */
  getConnections(): Promise<Result<TCPConnection[], Error>>;
}

interface SocketData {
  connectionId: string;
  connectedAt: Date;
}

/**
 * Create a new TCP server adapter using Bun's native TCP API.
 *
 * @example
 * ```typescript
 * import { createTCPServer } from '@servicejs/server-tcp-bun';
 *
 * const server = createTCPServer();
 *
 * await server.init({ port: 3000 });
 *
 * server.onConnection((conn) => {
 *   console.log(`New connection: ${conn.id}`);
 * });
 *
 * server.onData((id, data) => {
 *   server.send(id, data); // Echo back
 * });
 *
 * await server.start();
 * ```
 */
export function createTCPServer(): TCPServerAdapter {
  let config: TCPServerConfig | null = null;
  let server: TCPSocketListener<SocketData> | null = null;
  let isRunning = false;

  const sockets = new Map<string, any>();
  let connectionIdCounter = 0;

  // Event handlers
  let connectionHandler: ConnectionHandler | null = null;
  let dataHandler: DataHandler | null = null;
  let closeHandler: CloseHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg: TCPServerConfig): Promise<Result<void, Error>> {
      if (config !== null) {
        return err(new Error('Server already initialized'));
      }

      config = {
        hostname: '0.0.0.0',
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
        const socketHandler: SocketHandler<SocketData> = {
          open(socket) {
            const connectionId = `conn-${++connectionIdCounter}`;
            const connectionInfo: TCPConnection = {
              id: connectionId,
              remoteAddress: socket.remoteAddress || 'unknown',
              remotePort: 0,
              connectedAt: new Date(),
            };

            socket.data = {
              connectionId,
              connectedAt: new Date(),
            };

            sockets.set(connectionId, socket);

            if (connectionHandler) {
              Promise.resolve(connectionHandler(connectionInfo)).catch((error) => {
                if (errorHandler) {
                  errorHandler(error, connectionId);
                }
              });
            }
          },

          data(socket, data) {
            const connectionId = socket.data?.connectionId;
            if (!connectionId) return;

            const buffer = Buffer.from(data);

            if (dataHandler) {
              Promise.resolve(dataHandler(connectionId, buffer)).catch((error) => {
                if (errorHandler) {
                  errorHandler(error, connectionId);
                }
              });
            }
          },

          close(socket) {
            const connectionId = socket.data?.connectionId;
            if (!connectionId) return;

            sockets.delete(connectionId);

            if (closeHandler) {
              Promise.resolve(closeHandler(connectionId)).catch((error) => {
                if (errorHandler) {
                  errorHandler(error, connectionId);
                }
              });
            }
          },

          error(socket, error) {
            const connectionId = socket.data?.connectionId;

            if (errorHandler) {
              errorHandler(error, connectionId);
            }
          },

          drain(_socket) {
            // Handle backpressure if needed
          },
        };

        server = Bun.listen({
          hostname: config.hostname!,
          port: config.port,
          socket: socketHandler,
        });

        isRunning = true;
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
        // Close all connections
        for (const [_connectionId, socket] of sockets.entries()) {
          try {
            socket.end();
          } catch (error) {
            // Ignore errors when closing connections
          }
        }

        sockets.clear();

        if (server) {
          server.stop(true); // true = close active connections
          server = null;
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
      connectionHandler = null;
      dataHandler = null;
      closeHandler = null;
      errorHandler = null;

      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      try {
        return ok(isRunning && server !== null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    onConnection(handler: ConnectionHandler): void {
      connectionHandler = handler;
    },

    onData(handler: DataHandler): void {
      dataHandler = handler;
    },

    onClose(handler: CloseHandler): void {
      closeHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    async send(connectionId: string, data: string | Buffer): Promise<Result<void, Error>> {
      const socket = sockets.get(connectionId);
      if (!socket) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      try {
        const buffer = typeof data === 'string' ? Buffer.from(data) : data;
        socket.write(buffer);

        // If write returns false, backpressure is applied
        // For now, we'll just continue - proper backpressure handling
        // would use the drain event

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async broadcast(data: string | Buffer): Promise<Result<void, Error>> {
      const buffer = typeof data === 'string' ? Buffer.from(data) : data;

      try {
        for (const socket of sockets.values()) {
          try {
            socket.write(buffer);
          } catch (error) {
            // Continue broadcasting even if one connection fails
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async closeConnection(connectionId: string): Promise<Result<void, Error>> {
      const socket = sockets.get(connectionId);
      if (!socket) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      try {
        socket.end();
        sockets.delete(connectionId);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async getConnections(): Promise<Result<TCPConnection[], Error>> {
      try {
        const conns: TCPConnection[] = [];

        for (const [id, socket] of sockets.entries()) {
          conns.push({
            id,
            remoteAddress: socket.remoteAddress || 'unknown',
            remotePort: 0,
            connectedAt: socket.data?.connectedAt || new Date(),
          });
        }

        return ok(conns);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
