/**
 * Node.js TCP Server Adapter for ServiceJS
 *
 * Provides TCP server functionality with connection handling as messages
 */

import * as net from 'net';
import { Result, ok, err } from '@servicejs/result';

export interface TCPServerConfig {
  host?: string;
  port: number;
  backlog?: number;
  allowHalfOpen?: boolean;
}

export interface TCPConnection {
  id: string;
  remoteAddress?: string;
  remotePort?: number;
  localAddress?: string;
  localPort?: number;
}

export interface TCPMessage {
  connectionId: string;
  data: Buffer;
}

export type ConnectionHandler = (connection: TCPConnection) => void | Promise<void>;
export type DataHandler = (message: TCPMessage) => void | Promise<void>;
export type ErrorHandler = (error: Error, connectionId?: string) => void;
export type CloseHandler = (connectionId: string) => void;

export interface TCPServerAdapter {
  init(config: TCPServerConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  onConnection(handler: ConnectionHandler): void;
  onData(handler: DataHandler): void;
  onError(handler: ErrorHandler): void;
  onClose(handler: CloseHandler): void;

  send(connectionId: string, data: Buffer | string): Promise<Result<void, Error>>;
  closeConnection(connectionId: string): Promise<Result<void, Error>>;
  getConnections(): Promise<Result<TCPConnection[], Error>>;
}

export function createTCPServer(): TCPServerAdapter {
  let config: TCPServerConfig | null = null;
  let server: net.Server | null = null;
  let isRunning = false;

  const connections = new Map<string, net.Socket>();
  let connectionIdCounter = 0;

  let connectionHandler: ConnectionHandler | null = null;
  let dataHandler: DataHandler | null = null;
  let errorHandler: ErrorHandler | null = null;
  let closeHandler: CloseHandler | null = null;

  return {
    async init(cfg: TCPServerConfig): Promise<Result<void, Error>> {
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
      if (server) {
        return err(new Error('Server already started'));
      }

      return new Promise((resolve) => {
        server = net.createServer({
          allowHalfOpen: config!.allowHalfOpen || false,
        }, (socket) => {
          const connectionId = `conn_${++connectionIdCounter}`;
          connections.set(connectionId, socket);

          const connection: TCPConnection = {
            id: connectionId,
            remoteAddress: socket.remoteAddress,
            remotePort: socket.remotePort,
            localAddress: socket.localAddress,
            localPort: socket.localPort,
          };

          if (connectionHandler) {
            Promise.resolve(connectionHandler(connection)).catch((error) => {
              if (errorHandler) errorHandler(error, connectionId);
            });
          }

          socket.on('data', (data) => {
            if (dataHandler) {
              Promise.resolve(dataHandler({
                connectionId,
                data,
              })).catch((error) => {
                if (errorHandler) errorHandler(error, connectionId);
              });
            }
          });

          socket.on('error', (error) => {
            if (errorHandler) errorHandler(error, connectionId);
          });

          socket.on('close', () => {
            connections.delete(connectionId);
            if (closeHandler) closeHandler(connectionId);
          });
        });

        server!.on('error', (error) => {
          if (errorHandler) errorHandler(error);
          resolve(err(error));
        });

        server!.listen({
          host: config!.host || '0.0.0.0',
          port: config!.port,
          backlog: config!.backlog || 511,
        }, () => {
          isRunning = true;
          resolve(ok(undefined));
        });
      });
    },

    async stop(): Promise<Result<void, Error>> {
      if (!server) {
        return ok(undefined);
      }

      return new Promise((resolve) => {
        // Close all connections
        for (const [id, socket] of connections.entries()) {
          socket.end();
          connections.delete(id);
        }

        server!.close((error) => {
          isRunning = false;
          server = null;
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async destroy(): Promise<Result<void, Error>> {
      const result = await this.stop();
      config = null;
      connectionHandler = null;
      dataHandler = null;
      errorHandler = null;
      closeHandler = null;
      return result;
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(isRunning && server !== null);
    },

    onConnection(handler: ConnectionHandler): void {
      connectionHandler = handler;
    },

    onData(handler: DataHandler): void {
      dataHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    onClose(handler: CloseHandler): void {
      closeHandler = handler;
    },

    async send(connectionId: string, data: Buffer | string): Promise<Result<void, Error>> {
      const socket = connections.get(connectionId);
      if (!socket) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      return new Promise((resolve) => {
        socket.write(data, (error) => {
          if (error) {
            resolve(err(error));
          } else {
            resolve(ok(undefined));
          }
        });
      });
    },

    async closeConnection(connectionId: string): Promise<Result<void, Error>> {
      const socket = connections.get(connectionId);
      if (!socket) {
        return err(new Error(`Connection ${connectionId} not found`));
      }

      socket.end();
      connections.delete(connectionId);
      return ok(undefined);
    },

    async getConnections(): Promise<Result<TCPConnection[], Error>> {
      const conns: TCPConnection[] = [];
      for (const [id, socket] of connections.entries()) {
        conns.push({
          id,
          remoteAddress: socket.remoteAddress,
          remotePort: socket.remotePort,
          localAddress: socket.localAddress,
          localPort: socket.localPort,
        });
      }
      return ok(conns);
    },
  };
}
