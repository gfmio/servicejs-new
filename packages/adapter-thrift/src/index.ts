/**
 * Apache Thrift RPC adapter for ServiceJS
 *
 * This is a simplified Thrift-like RPC implementation that demonstrates the patterns.
 * For production use with real Thrift, install 'thrift' package and generate code from .thrift files.
 */

import { Result, ok, err } from '@servicejs/result';
import { createServer as createTCPServer, connect, type Server, type Socket } from 'net';

/**
 * Thrift service definition
 */
export interface ThriftService {
  [method: string]: (...args: any[]) => Promise<any> | any;
}

/**
 * Thrift protocol types
 */
export const ThriftProtocol = {
  BINARY: 'binary' as const,
  JSON: 'json' as const,
  COMPACT: 'compact' as const,
};

/**
 * Thrift transport types
 */
export const ThriftTransport = {
  BUFFERED: 'buffered' as const,
  FRAMED: 'framed' as const,
};

/**
 * Thrift client configuration
 */
export interface ThriftClientConfig {
  host: string;
  port: number;
  transport?: 'buffered' | 'framed';
  protocol?: 'binary' | 'json' | 'compact';
  timeout?: number;
}

/**
 * Thrift server configuration
 */
export interface ThriftServerConfig {
  port: number;
  host?: string;
  transport?: 'buffered' | 'framed';
  protocol?: 'binary' | 'json' | 'compact';
  logging?: boolean;
  service: ThriftService;
}

/**
 * Thrift RPC message
 */
interface ThriftMessage {
  id: number;
  method: string;
  args: any[];
  isResponse?: boolean;
  result?: any;
  error?: string;
}

/**
 * Thrift client
 */
export interface ThriftClient {
  call<TResult = any>(method: string, ...args: any[]): Promise<Result<TResult, Error>>;
  close(): Promise<Result<void, Error>>;
  isConnected(): boolean;
}

/**
 * Thrift server
 */
export interface ThriftServer {
  listen(): Promise<Result<void, Error>>;
  close(): Promise<Result<void, Error>>;
  getConnectionCount(): number;
}

/**
 * Serialize message based on protocol
 */
function serializeMessage(message: ThriftMessage, protocol: string): Buffer {
  switch (protocol) {
    case 'json':
      return Buffer.from(JSON.stringify(message) + '\n');
    case 'binary':
    case 'compact':
      // Simplified: In real Thrift, this would use actual binary protocol
      return Buffer.from(JSON.stringify(message) + '\n');
    default:
      return Buffer.from(JSON.stringify(message) + '\n');
  }
}

/**
 * Deserialize message based on protocol
 */
function deserializeMessage(data: string, protocol: string): ThriftMessage {
  switch (protocol) {
    case 'json':
      return JSON.parse(data);
    case 'binary':
    case 'compact':
      // Simplified: In real Thrift, this would use actual binary protocol
      return JSON.parse(data);
    default:
      return JSON.parse(data);
  }
}

/**
 * Create a Thrift RPC client
 */
export function createThriftClient(config: ThriftClientConfig): ThriftClient {
  const {
    host,
    port,
    transport = 'buffered',
    protocol = 'binary',
    timeout = 5000,
  } = config;

  let socket: Socket | null = null;
  let messageId = 0;
  const pendingCalls = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>();

  // Connect to server
  function ensureConnected(): Promise<void> {
    if (socket && !socket.destroyed) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      socket = connect(port, host, () => {
        resolve();
      });

      socket.on('error', (error) => {
        reject(error);
      });

      let buffer = '';
      socket.on('data', (data) => {
        buffer += data.toString();
        const messages = buffer.split('\n');
        buffer = messages.pop() || '';

        for (const msgStr of messages) {
          if (!msgStr.trim()) continue;

          try {
            const message = deserializeMessage(msgStr, protocol);

            if (message.isResponse) {
              const pending = pendingCalls.get(message.id);
              if (pending) {
                clearTimeout(pending.timer);
                pendingCalls.delete(message.id);

                if (message.error) {
                  pending.reject(new Error(message.error));
                } else {
                  pending.resolve(message.result);
                }
              }
            }
          } catch (error) {
            // Ignore malformed messages
          }
        }
      });

      socket.on('close', () => {
        // Reject all pending calls
        for (const pending of pendingCalls.values()) {
          clearTimeout(pending.timer);
          pending.reject(new Error('Connection closed'));
        }
        pendingCalls.clear();
      });
    });
  }

  const client: ThriftClient = {
    async call<TResult = any>(method: string, ...args: any[]): Promise<Result<TResult, Error>> {
      try {
        await ensureConnected();

        const id = messageId++;
        const message: ThriftMessage = { id, method, args };

        return await new Promise<Result<TResult, Error>>((resolve) => {
          const timer = setTimeout(() => {
            pendingCalls.delete(id);
            resolve(err(new Error(`Call timeout after ${timeout}ms`)));
          }, timeout);

          pendingCalls.set(id, {
            resolve: (result: TResult) => {
              resolve(ok(result));
            },
            reject: (error: Error) => {
              resolve(err(error));
            },
            timer,
          });

          const serialized = serializeMessage(message, protocol);
          socket!.write(serialized);
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async close(): Promise<Result<void, Error>> {
      try {
        if (socket) {
          socket.end();
          socket = null;
        }
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    isConnected(): boolean {
      return socket !== null && !socket.destroyed;
    },
  };

  return client;
}

/**
 * Create a Thrift RPC server
 */
export function createThriftServer(config: ThriftServerConfig): ThriftServer {
  const {
    port,
    host = '0.0.0.0',
    transport = 'buffered',
    protocol = 'binary',
    logging = false,
    service,
  } = config;

  const server = createTCPServer();
  const connections = new Set<Socket>();

  server.on('connection', (socket) => {
    connections.add(socket);
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';

      for (const msgStr of messages) {
        if (!msgStr.trim()) continue;

        try {
          const message = deserializeMessage(msgStr, protocol);

          if (logging) {
            console.log(`[Thrift] ${message.method}(${JSON.stringify(message.args)})`);
          }

          const handler = service[message.method];
          if (!handler) {
            const response: ThriftMessage = {
              id: message.id,
              method: message.method,
              args: [],
              isResponse: true,
              error: `Method ${message.method} not found`,
            };
            socket.write(serializeMessage(response, protocol));
            continue;
          }

          try {
            const result = await Promise.resolve(handler.apply(service, message.args));

            const response: ThriftMessage = {
              id: message.id,
              method: message.method,
              args: [],
              isResponse: true,
              result,
            };

            if (logging) {
              console.log(`[Thrift] ${message.method} -> ${JSON.stringify(result)}`);
            }

            socket.write(serializeMessage(response, protocol));
          } catch (error) {
            const response: ThriftMessage = {
              id: message.id,
              method: message.method,
              args: [],
              isResponse: true,
              error: error instanceof Error ? error.message : String(error),
            };

            if (logging) {
              console.error(`[Thrift] ${message.method} error:`, error);
            }

            socket.write(serializeMessage(response, protocol));
          }
        } catch (error) {
          if (logging) {
            console.error('[Thrift] Failed to parse message:', error);
          }
        }
      }
    });

    socket.on('close', () => {
      connections.delete(socket);
    });

    socket.on('error', (error) => {
      if (logging) {
        console.error('[Thrift] Socket error:', error);
      }
      connections.delete(socket);
    });
  });

  const thriftServer: ThriftServer = {
    async listen(): Promise<Result<void, Error>> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          if (logging) {
            console.log(`[Thrift] Server listening on ${host}:${port}`);
          }
          resolve(ok(undefined));
        });

        server.on('error', (error) => {
          resolve(err(error));
        });
      });
    },

    async close(): Promise<Result<void, Error>> {
      return new Promise((resolve) => {
        // Close all connections
        for (const socket of connections) {
          socket.end();
        }
        connections.clear();

        server.close((error) => {
          if (error) {
            resolve(err(error));
          } else {
            if (logging) {
              console.log('[Thrift] Server closed');
            }
            resolve(ok(undefined));
          }
        });
      });
    },

    getConnectionCount(): number {
      return connections.size;
    },
  };

  return thriftServer;
}

/**
 * Helper to wrap a service implementation with automatic error handling
 */
export function wrapThriftService<T extends ThriftService>(service: T): T {
  const wrapped: any = {};

  for (const [method, handler] of Object.entries(service)) {
    wrapped[method] = async (...args: any[]) => {
      try {
        return await Promise.resolve(handler.apply(service, args));
      } catch (error) {
        throw error;
      }
    };
  }

  return wrapped as T;
}
