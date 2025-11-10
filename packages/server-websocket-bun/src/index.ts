/**
 * @packageDocumentation
 * WebSocket server adapter for ServiceJS using Bun's native WebSocket support.
 *
 * This adapter leverages Bun.serve() with WebSocket handlers for high-performance
 * bidirectional communication.
 */

import { Result, ok, err } from '@servicejs/result';
import type { Server, ServerWebSocket } from 'bun';

/**
 * Configuration options for the WebSocket server.
 */
export interface WebSocketServerConfig {
  /**
   * Port number to listen on.
   */
  port: number;

  /**
   * Hostname to bind to (default: '0.0.0.0').
   */
  hostname?: string;

  /**
   * WebSocket endpoint path (default: '/').
   */
  path?: string;

  /**
   * Per-message deflate compression (default: false).
   */
  perMessageDeflate?: boolean;

  /**
   * Maximum payload size in bytes (default: 16MB).
   */
  maxPayloadLength?: number;

  /**
   * Idle timeout in seconds (default: 120).
   */
  idleTimeout?: number;
}

/**
 * WebSocket connection information.
 */
export interface WSConnection {
  /**
   * Unique connection identifier.
   */
  id: string;

  /**
   * Remote address.
   */
  remoteAddress: string;

  /**
   * Connection timestamp.
   */
  connectedAt: Date;

  /**
   * Connection ready state.
   */
  readyState: number;
}

/**
 * Handler called when a new connection is established.
 */
export type ConnectionHandler = (connection: WSConnection) => void | Promise<void>;

/**
 * Handler called when a message is received.
 */
export type MessageHandler = (
  connectionId: string,
  data: string | Buffer,
  isBinary: boolean
) => void | Promise<void>;

/**
 * Handler called when a connection is closed.
 */
export type CloseHandler = (
  connectionId: string,
  code: number,
  reason: string
) => void | Promise<void>;

/**
 * Handler called when an error occurs.
 */
export type ErrorHandler = (error: Error, connectionId?: string) => void | Promise<void>;

/**
 * Handler called when a ping is received.
 */
export type PingHandler = (connectionId: string, data?: Buffer) => void | Promise<void>;

/**
 * Handler called when a pong is received.
 */
export type PongHandler = (connectionId: string, data?: Buffer) => void | Promise<void>;

/**
 * WebSocket server adapter interface.
 */
export interface WebSocketServerAdapter {
  /**
   * Initialize the server with configuration.
   */
  init(config: WebSocketServerConfig): Promise<Result<void, Error>>;

  /**
   * Start the WebSocket server.
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the WebSocket server.
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Destroy the server and cleanup resources.
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Check if the server is healthy.
   */
  health(): Promise<Result<boolean, Error>>;

  /**
   * Register a handler for new connections.
   */
  onConnection(handler: ConnectionHandler): void;

  /**
   * Register a handler for incoming messages.
   */
  onMessage(handler: MessageHandler): void;

  /**
   * Register a handler for connection closures.
   */
  onClose(handler: CloseHandler): void;

  /**
   * Register a handler for errors.
   */
  onError(handler: ErrorHandler): void;

  /**
   * Register a handler for ping messages.
   */
  onPing(handler: PingHandler): void;

  /**
   * Register a handler for pong messages.
   */
  onPong(handler: PongHandler): void;

  /**
   * Send a message to a specific connection.
   */
  send(connectionId: string, data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>;

  /**
   * Broadcast a message to all connected clients.
   */
  broadcast(data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>;

  /**
   * Close a specific connection.
   */
  closeConnection(
    connectionId: string,
    code?: number,
    reason?: string
  ): Promise<Result<void, Error>>;

  /**
   * Send a ping to a specific connection.
   */
  ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>>;

  /**
   * Get all active connections.
   */
  getConnections(): Promise<Result<WSConnection[], Error>>;
}

interface WebSocketData {
  connectionId: string;
  connectedAt: Date;
}

/**
 * Create a new WebSocket server adapter using Bun's native WebSocket support.
 *
 * @example
 * ```typescript
 * import { createWebSocketServer } from '@servicejs/server-websocket-bun';
 *
 * const server = createWebSocketServer();
 *
 * await server.init({ port: 3000 });
 *
 * server.onConnection((conn) => {
 *   console.log(`New connection: ${conn.id}`);
 * });
 *
 * server.onMessage((id, data) => {
 *   server.send(id, data); // Echo back
 * });
 *
 * await server.start();
 * ```
 */
export function createWebSocketServer(): WebSocketServerAdapter {
  let config: WebSocketServerConfig | null = null;
  let server: Server | null = null;
  let isRunning = false;

  const connections = new Map<string, ServerWebSocket<WebSocketData>>();
  let connectionIdCounter = 0;

  // Event handlers
  let connectionHandler: ConnectionHandler | null = null;
  let messageHandler: MessageHandler | null = null;
  let closeHandler: CloseHandler | null = null;
  let errorHandler: ErrorHandler | null = null;
  let pingHandler: PingHandler | null = null;
  let pongHandler: PongHandler | null = null;

  return {
    async init(cfg: WebSocketServerConfig): Promise<Result<void, Error>> {
      if (config !== null) {
        return err(new Error('Server already initialized'));
      }

      config = {
        hostname: '0.0.0.0',
        path: '/',
        perMessageDeflate: false,
        maxPayloadLength: 16 * 1024 * 1024, // 16MB
        idleTimeout: 120,
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
        server = Bun.serve<WebSocketData>({
          port: config.port,
          hostname: config.hostname,

          fetch(req, server) {
            const url = new URL(req.url);

            if (url.pathname === config!.path) {
              const connectionId = `conn-${++connectionIdCounter}`;
              const upgraded = server.upgrade(req, {
                data: {
                  connectionId,
                  connectedAt: new Date(),
                },
              });

              if (upgraded) {
                return undefined;
              }
            }

            return new Response('WebSocket endpoint not found', { status: 404 });
          },

          websocket: {
            perMessageDeflate: config.perMessageDeflate,
            maxPayloadLength: config.maxPayloadLength,
            idleTimeout: config.idleTimeout,

            open(ws) {
              const { connectionId, connectedAt } = ws.data;
              connections.set(connectionId, ws);

              const connectionInfo: WSConnection = {
                id: connectionId,
                remoteAddress: ws.remoteAddress,
                connectedAt,
                readyState: ws.readyState,
              };

              if (connectionHandler) {
                Promise.resolve(connectionHandler(connectionInfo)).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error, connectionId);
                  }
                });
              }
            },

            message(ws, message) {
              const { connectionId } = ws.data;
              const isBinary = message instanceof Buffer || message instanceof ArrayBuffer;
              const data = isBinary ? Buffer.from(message as any) : String(message);

              if (messageHandler) {
                Promise.resolve(messageHandler(connectionId, data, isBinary)).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error, connectionId);
                  }
                });
              }
            },

            close(ws, code, reason) {
              const { connectionId } = ws.data;
              connections.delete(connectionId);

              if (closeHandler) {
                Promise.resolve(closeHandler(connectionId, code, reason)).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error, connectionId);
                  }
                });
              }
            },

            error(ws, error) {
              const connectionId = ws.data?.connectionId;

              if (errorHandler) {
                errorHandler(error, connectionId);
              }
            },

            ping(ws, data) {
              const { connectionId } = ws.data;

              if (pingHandler) {
                Promise.resolve(pingHandler(connectionId, Buffer.from(data))).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error, connectionId);
                  }
                });
              }
            },

            pong(ws, data) {
              const { connectionId } = ws.data;

              if (pongHandler) {
                Promise.resolve(pongHandler(connectionId, Buffer.from(data))).catch((error) => {
                  if (errorHandler) {
                    errorHandler(error, connectionId);
                  }
                });
              }
            },
          },
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
        for (const ws of connections.values()) {
          ws.close(1000, 'Server shutting down');
        }

        connections.clear();

        if (server) {
          server.stop();
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
        if (!stopResult.ok) {
          return stopResult;
        }
      }

      config = null;
      connectionHandler = null;
      messageHandler = null;
      closeHandler = null;
      errorHandler = null;
      pingHandler = null;
      pongHandler = null;

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

    onMessage(handler: MessageHandler): void {
      messageHandler = handler;
    },

    onClose(handler: CloseHandler): void {
      closeHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    onPing(handler: PingHandler): void {
      pingHandler = handler;
    },

    onPong(handler: PongHandler): void {
      pongHandler = handler;
    },

    async send(
      connectionId: string,
      data: string | Buffer,
      isBinary = false
    ): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      try {
        if (isBinary && typeof data === 'string') {
          ws.send(Buffer.from(data));
        } else if (!isBinary && data instanceof Buffer) {
          ws.send(data.toString());
        } else {
          ws.send(data);
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async broadcast(data: string | Buffer, isBinary = false): Promise<Result<void, Error>> {
      try {
        for (const ws of connections.values()) {
          try {
            if (isBinary && typeof data === 'string') {
              ws.send(Buffer.from(data));
            } else if (!isBinary && data instanceof Buffer) {
              ws.send(data.toString());
            } else {
              ws.send(data);
            }
          } catch (error) {
            // Continue broadcasting even if one connection fails
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async closeConnection(
      connectionId: string,
      code = 1000,
      reason = ''
    ): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      try {
        ws.close(code, reason);
        connections.delete(connectionId);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      try {
        ws.ping(data);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async getConnections(): Promise<Result<WSConnection[], Error>> {
      try {
        const conns: WSConnection[] = [];

        for (const [id, ws] of connections.entries()) {
          conns.push({
            id,
            remoteAddress: ws.remoteAddress,
            connectedAt: ws.data.connectedAt,
            readyState: ws.readyState,
          });
        }

        return ok(conns);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
