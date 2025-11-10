/**
 * Node.js WebSocket Server Adapter for ServiceJS
 *
 * Provides WebSocket server functionality with connection lifecycle as messages
 */

import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { Result, ok, err } from '@servicejs/result';

export interface WebSocketServerConfig {
  host?: string;
  port: number;
  path?: string;
  perMessageDeflate?: boolean;
  maxPayload?: number;
  clientTracking?: boolean;
}

export interface WSConnection {
  id: string;
  remoteAddress?: string;
  protocol?: string;
  extensions?: string;
}

export interface WSMessage {
  connectionId: string;
  data: Buffer | string;
  isBinary: boolean;
}

export type ConnectionHandler = (connection: WSConnection) => void | Promise<void>;
export type MessageHandler = (message: WSMessage) => void | Promise<void>;
export type CloseHandler = (connectionId: string, code: number, reason: string) => void;
export type ErrorHandler = (error: Error, connectionId?: string) => void;
export type PingHandler = (connectionId: string, data: Buffer) => void;
export type PongHandler = (connectionId: string, data: Buffer) => void;

export interface WebSocketServerAdapter {
  init(config: WebSocketServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  onConnection(handler: ConnectionHandler): void;
  onMessage(handler: MessageHandler): void;
  onClose(handler: CloseHandler): void;
  onError(handler: ErrorHandler): void;
  onPing(handler: PingHandler): void;
  onPong(handler: PongHandler): void;

  send(connectionId: string, data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>;
  broadcast(data: string | Buffer, isBinary?: boolean): Promise<Result<void, Error>>;
  closeConnection(connectionId: string, code?: number, reason?: string): Promise<Result<void, Error>>;
  ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>>;
  getConnections(): Promise<Result<WSConnection[], Error>>;
}

export function createWebSocketServer(): WebSocketServerAdapter {
  let config: WebSocketServerConfig | null = null;
  let httpServer: http.Server | null = null;
  let wss: WebSocketServer | null = null;
  let isRunning = false;

  const connections = new Map<string, WebSocket>();
  let connectionIdCounter = 0;

  let connectionHandler: ConnectionHandler | null = null;
  let messageHandler: MessageHandler | null = null;
  let closeHandler: CloseHandler | null = null;
  let errorHandler: ErrorHandler | null = null;
  let pingHandler: PingHandler | null = null;
  let pongHandler: PongHandler | null = null;

  return {
    async init(cfg: WebSocketServerConfig): Promise<Result<void, Error>> {
      if (!cfg.port) {
        return err(new Error('Port is required'));
      }
      config = cfg;
      return ok(undefined);
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Server not initialized'));
      }
      if (wss) {
        return err(new Error('Server already started'));
      }

      return new Promise((resolve) => {
        // Create HTTP server for WebSocket upgrade
        httpServer = http.createServer();

        // Create WebSocket server
        wss = new WebSocketServer({
          server: httpServer,
          path: config!.path,
          perMessageDeflate: config!.perMessageDeflate ?? true,
          maxPayload: config!.maxPayload ?? 100 * 1024 * 1024, // 100MB default
          clientTracking: config!.clientTracking ?? true,
        });

        wss!.on('connection', (ws, req) => {
          const connectionId = `ws_${++connectionIdCounter}`;
          connections.set(connectionId, ws);

          const connection: WSConnection = {
            id: connectionId,
            remoteAddress: req.socket.remoteAddress,
            protocol: ws.protocol,
            extensions: ws.extensions,
          };

          if (connectionHandler) {
            Promise.resolve(connectionHandler(connection)).catch((error) => {
              if (errorHandler) errorHandler(error, connectionId);
            });
          }

          ws.on('message', (data, isBinary) => {
            if (messageHandler) {
              const message: WSMessage = {
                connectionId,
                data: isBinary ? data as Buffer : data.toString(),
                isBinary,
              };

              Promise.resolve(messageHandler(message)).catch((error) => {
                if (errorHandler) errorHandler(error, connectionId);
              });
            }
          });

          ws.on('close', (code, reason) => {
            connections.delete(connectionId);
            if (closeHandler) {
              closeHandler(connectionId, code, reason.toString());
            }
          });

          ws.on('error', (error) => {
            if (errorHandler) errorHandler(error, connectionId);
          });

          ws.on('ping', (data) => {
            if (pingHandler) pingHandler(connectionId, data);
          });

          ws.on('pong', (data) => {
            if (pongHandler) pongHandler(connectionId, data);
          });
        });

        wss!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          if (!isRunning) {
            resolve(err(error));
          }
        });

        httpServer!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          resolve(err(error));
        });

        httpServer!.listen(config!.port, config!.host || '0.0.0.0', () => {
          isRunning = true;
          resolve(ok(undefined));
        });
      });
    },

    async stop(): Promise<Result<void, Error>> {
      if (!wss || !httpServer) {
        return ok(undefined);
      }

      return new Promise((resolve) => {
        // Close all connections
        for (const [id, ws] of connections.entries()) {
          ws.close(1000, 'Server shutting down');
          connections.delete(id);
        }

        // Close WebSocket server
        wss!.close((error) => {
          if (error) {
            resolve(err(error));
            return;
          }

          // Close HTTP server
          httpServer!.close((httpError) => {
            isRunning = false;
            wss = null;
            httpServer = null;

            if (httpError) {
              resolve(err(httpError));
            } else {
              resolve(ok(undefined));
            }
          });
        });
      });
    },

    async destroy(): Promise<Result<void, Error>> {
      const result = await this.stop();
      config = null;
      connectionHandler = null;
      messageHandler = null;
      closeHandler = null;
      errorHandler = null;
      pingHandler = null;
      pongHandler = null;
      return result;
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(isRunning && wss !== null && httpServer !== null);
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

    async send(connectionId: string, data: string | Buffer, isBinary = false): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      if (ws.readyState !== WebSocket.OPEN) {
        return err(new Error(`Connection ${connectionId} is not open`));
      }

      return new Promise((resolve) => {
        ws.send(data, { binary: isBinary }, (error) => {
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async broadcast(data: string | Buffer, isBinary = false): Promise<Result<void, Error>> {
      const errors: Error[] = [];

      for (const [id, ws] of connections.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            await new Promise<void>((resolve, reject) => {
              ws.send(data, { binary: isBinary }, (error) => {
                if (error) reject(error);
                else resolve();
              });
            });
          } catch (error) {
            errors.push(new Error(`Failed to send to ${id}: ${(error as Error).message}`));
          }
        }
      }

      if (errors.length > 0) {
        return err(new Error(`Broadcast failed for ${errors.length} connections`));
      }

      return ok(undefined);
    },

    async closeConnection(connectionId: string, code = 1000, reason = ''): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      ws.close(code, reason);
      connections.delete(connectionId);
      return ok(undefined);
    },

    async ping(connectionId: string, data?: Buffer): Promise<Result<void, Error>> {
      const ws = connections.get(connectionId);
      if (!ws) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      if (ws.readyState !== WebSocket.OPEN) {
        return err(new Error(`Connection ${connectionId} is not open`));
      }

      return new Promise((resolve) => {
        ws.ping(data, undefined, (error) => {
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async getConnections(): Promise<Result<WSConnection[], Error>> {
      const conns: WSConnection[] = [];
      for (const [id, ws] of connections.entries()) {
        conns.push({
          id,
          protocol: ws.protocol,
          extensions: ws.extensions,
        });
      }
      return ok(conns);
    },
  };
}
