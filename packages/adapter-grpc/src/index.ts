/**
 * gRPC-like RPC adapter for ServiceJS
 *
 * This is a simplified gRPC-like implementation that demonstrates the patterns including streaming.
 * For production use with real gRPC, install '@grpc/grpc-js' and '@grpc/proto-loader'.
 */

import { Result, ok, err } from '@servicejs/result';
import { createServer as createTCPServer, connect, type Server, type Socket } from 'net';

/**
 * gRPC service definition
 */
export interface GRPCService {
  [method: string]: (...args: any[]) => Promise<any> | any | AsyncIterable<any>;
}

/**
 * gRPC client configuration
 */
export interface GRPCClientConfig {
  address: string; // host:port
  timeout?: number;
}

/**
 * gRPC server configuration
 */
export interface GRPCServerConfig {
  address?: string; // host:port, default '0.0.0.0:50051'
  service: GRPCService;
  logging?: boolean;
}

/**
 * gRPC message types
 */
type MessageType = 'unary' | 'server-stream' | 'client-stream' | 'bidi-stream';

interface GRPCMessage {
  id: number;
  type: MessageType;
  method: string;
  data?: any;
  isResponse?: boolean;
  isStream?: boolean;
  isEnd?: boolean;
  error?: string;
}

/**
 * gRPC client
 */
export interface GRPCClient {
  unary<TRequest = any, TResponse = any>(
    method: string,
    request: TRequest
  ): Promise<Result<TResponse, Error>>;

  serverStream<TRequest = any, TResponse = any>(
    method: string,
    request: TRequest
  ): AsyncIterable<Result<TResponse, Error>>;

  close(): Promise<Result<void, Error>>;
  isConnected(): boolean;
}

/**
 * gRPC server
 */
export interface GRPCServer {
  listen(): Promise<Result<void, Error>>;
  close(): Promise<Result<void, Error>>;
  getConnectionCount(): number;
}

/**
 * Helper to create async iterable from array
 */
export async function* fromArray<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) {
    yield item;
  }
}

/**
 * Helper to collect async iterable to array
 */
export async function toArray<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

/**
 * Create a gRPC client
 */
export function createGRPCClient(config: GRPCClientConfig): GRPCClient {
  const { address, timeout = 5000 } = config;
  const [host, portStr] = address.split(':');
  const port = parseInt(portStr, 10);

  let socket: Socket | null = null;
  let messageId = 0;
  const pendingCalls = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timer?: NodeJS.Timeout;
    isStream?: boolean;
    streamQueue?: any[];
  }>();

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
            const message: GRPCMessage = JSON.parse(msgStr);

            if (message.isResponse) {
              const pending = pendingCalls.get(message.id);
              if (pending) {
                if (message.error) {
                  if (pending.timer) clearTimeout(pending.timer);
                  pendingCalls.delete(message.id);
                  pending.reject(new Error(message.error));
                } else if (message.isStream) {
                  if (message.isEnd) {
                    if (pending.timer) clearTimeout(pending.timer);
                    pendingCalls.delete(message.id);
                    pending.resolve(null); // Signal end of stream
                  } else {
                    // Push to stream queue
                    if (pending.streamQueue) {
                      pending.streamQueue.push(message.data);
                    }
                    pending.resolve(message.data);
                  }
                } else {
                  if (pending.timer) clearTimeout(pending.timer);
                  pendingCalls.delete(message.id);
                  pending.resolve(message.data);
                }
              }
            }
          } catch (error) {
            // Ignore malformed messages
          }
        }
      });

      socket.on('close', () => {
        for (const pending of pendingCalls.values()) {
          if (pending.timer) clearTimeout(pending.timer);
          pending.reject(new Error('Connection closed'));
        }
        pendingCalls.clear();
      });
    });
  }

  const client: GRPCClient = {
    async unary<TRequest = any, TResponse = any>(
      method: string,
      request: TRequest
    ): Promise<Result<TResponse, Error>> {
      try {
        await ensureConnected();

        const id = messageId++;
        const message: GRPCMessage = {
          id,
          type: 'unary',
          method,
          data: request,
        };

        return await new Promise<Result<TResponse, Error>>((resolve) => {
          const timer = setTimeout(() => {
            pendingCalls.delete(id);
            resolve(err(new Error(`Call timeout after ${timeout}ms`)));
          }, timeout);

          pendingCalls.set(id, {
            resolve: (result: TResponse) => {
              resolve(ok(result));
            },
            reject: (error: Error) => {
              resolve(err(error));
            },
            timer,
          });

          socket!.write(JSON.stringify(message) + '\n');
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async *serverStream<TRequest = any, TResponse = any>(
      method: string,
      request: TRequest
    ): AsyncIterable<Result<TResponse, Error>> {
      try {
        await ensureConnected();

        const id = messageId++;
        const message: GRPCMessage = {
          id,
          type: 'server-stream',
          method,
          data: request,
        };

        const streamQueue: any[] = [];
        let streamEnded = false;
        let streamError: Error | null = null;

        const promise = new Promise<void>((resolve, reject) => {
          pendingCalls.set(id, {
            resolve: (data: any) => {
              if (data === null) {
                streamEnded = true;
                resolve();
              }
            },
            reject: (error: Error) => {
              streamError = error;
              reject(error);
            },
            isStream: true,
            streamQueue,
          });
        });

        socket!.write(JSON.stringify(message) + '\n');

        // Yield items as they arrive
        while (!streamEnded && !streamError) {
          if (streamQueue.length > 0) {
            const item = streamQueue.shift();
            yield ok(item);
          } else {
            // Wait a bit for more data
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
        }

        // Yield any remaining items
        while (streamQueue.length > 0) {
          yield ok(streamQueue.shift());
        }

        if (streamError) {
          yield err(streamError);
        }

        await promise.catch(() => {});
      } catch (error) {
        yield err(error instanceof Error ? error : new Error(String(error)));
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
 * Create a gRPC server
 */
export function createGRPCServer(config: GRPCServerConfig): GRPCServer {
  const { address = '0.0.0.0:50051', service, logging = false } = config;
  const [host, portStr] = address.split(':');
  const port = parseInt(portStr, 10);

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
          const message: GRPCMessage = JSON.parse(msgStr);

          if (logging) {
            console.log(`[gRPC] ${message.type} ${message.method}(${JSON.stringify(message.data)})`);
          }

          const handler = service[message.method];
          if (!handler) {
            const response: GRPCMessage = {
              id: message.id,
              type: message.type,
              method: message.method,
              isResponse: true,
              error: `Method ${message.method} not found`,
            };
            socket.write(JSON.stringify(response) + '\n');
            continue;
          }

          try {
            if (message.type === 'unary') {
              // Unary call
              const result = await Promise.resolve(handler(message.data));
              const response: GRPCMessage = {
                id: message.id,
                type: 'unary',
                method: message.method,
                isResponse: true,
                data: result,
              };

              if (logging) {
                console.log(`[gRPC] ${message.method} -> ${JSON.stringify(result)}`);
              }

              socket.write(JSON.stringify(response) + '\n');
            } else if (message.type === 'server-stream') {
              // Server streaming
              const result = await Promise.resolve(handler(message.data));

              // Check if result is async iterable
              if (result && typeof result[Symbol.asyncIterator] === 'function') {
                for await (const item of result) {
                  const response: GRPCMessage = {
                    id: message.id,
                    type: 'server-stream',
                    method: message.method,
                    isResponse: true,
                    isStream: true,
                    data: item,
                  };
                  socket.write(JSON.stringify(response) + '\n');
                }

                // Send end marker
                const endResponse: GRPCMessage = {
                  id: message.id,
                  type: 'server-stream',
                  method: message.method,
                  isResponse: true,
                  isStream: true,
                  isEnd: true,
                };
                socket.write(JSON.stringify(endResponse) + '\n');
              } else {
                // Not a stream, send as single response
                const response: GRPCMessage = {
                  id: message.id,
                  type: 'server-stream',
                  method: message.method,
                  isResponse: true,
                  isStream: true,
                  data: result,
                };
                socket.write(JSON.stringify(response) + '\n');

                const endResponse: GRPCMessage = {
                  id: message.id,
                  type: 'server-stream',
                  method: message.method,
                  isResponse: true,
                  isStream: true,
                  isEnd: true,
                };
                socket.write(JSON.stringify(endResponse) + '\n');
              }
            }
          } catch (error) {
            const response: GRPCMessage = {
              id: message.id,
              type: message.type,
              method: message.method,
              isResponse: true,
              error: error instanceof Error ? error.message : String(error),
            };

            if (logging) {
              console.error(`[gRPC] ${message.method} error:`, error);
            }

            socket.write(JSON.stringify(response) + '\n');
          }
        } catch (error) {
          if (logging) {
            console.error('[gRPC] Failed to parse message:', error);
          }
        }
      }
    });

    socket.on('close', () => {
      connections.delete(socket);
    });

    socket.on('error', (error) => {
      if (logging) {
        console.error('[gRPC] Socket error:', error);
      }
      connections.delete(socket);
    });
  });

  const grpcServer: GRPCServer = {
    async listen(): Promise<Result<void, Error>> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          if (logging) {
            console.log(`[gRPC] Server listening on ${address}`);
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
        for (const socket of connections) {
          socket.end();
        }
        connections.clear();

        server.close((error) => {
          if (error) {
            resolve(err(error));
          } else {
            if (logging) {
              console.log('[gRPC] Server closed');
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

  return grpcServer;
}
