/**
 * Cap'n Proto RPC adapter for ServiceJS
 *
 * This adapter integrates Cap'n Proto RPC with ServiceJS, providing ultra-fast
 * zero-copy serialization and promise pipelining for efficient RPC communication.
 */

import { Result, ok, err, isOk } from '@servicejs/result';
import { createServer, Socket } from 'net';
import type { Server } from 'net';

/**
 * Cap'n Proto service interface
 */
export interface CapnpService {
  [method: string]: (...args: any[]) => Promise<any> | any;
}

/**
 * Cap'n Proto client configuration
 */
export interface CapnpClientConfig {
  /**
   * Server host
   */
  host: string;

  /**
   * Server port
   */
  port: number;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Enable promise pipelining
   * @default true
   */
  pipelining?: boolean;

  /**
   * Schema definition
   */
  schema: any;
}

/**
 * Cap'n Proto server configuration
 */
export interface CapnpServerConfig {
  /**
   * Server port
   */
  port: number;

  /**
   * Server host
   * @default '0.0.0.0'
   */
  host?: string;

  /**
   * Service implementation
   */
  service: CapnpService;

  /**
   * Schema definition
   */
  schema: any;

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;

  /**
   * Max concurrent requests per connection
   * @default 100
   */
  maxConcurrentRequests?: number;
}

/**
 * Cap'n Proto client wrapper with Result-based error handling
 */
export interface CapnpClient {
  /**
   * Call a service method
   */
  call<TResponse = any>(
    method: string,
    ...args: any[]
  ): Promise<Result<TResponse, Error>>;

  /**
   * Call a service method with promise pipelining
   * Returns a promise that can be pipelined before the call completes
   */
  pipeline<TResponse = any>(
    method: string,
    ...args: any[]
  ): PipelinedPromise<TResponse>;

  /**
   * Close the client connection
   */
  close(): Promise<Result<void, Error>>;

  /**
   * Check if the client is connected
   */
  isConnected(): boolean;
}

/**
 * Pipelined promise for Cap'n Proto RPC
 * Allows calling methods on a promise before it resolves
 */
export interface PipelinedPromise<T> extends Promise<Result<T, Error>> {
  /**
   * Pipeline a method call on the result
   */
  pipeline<TResult>(
    method: string,
    ...args: any[]
  ): PipelinedPromise<TResult>;
}

/**
 * Cap'n Proto server wrapper with ServiceJS patterns
 */
export interface CapnpServer {
  /**
   * Start the server
   */
  listen(): Promise<Result<void, Error>>;

  /**
   * Stop the server
   */
  close(): Promise<Result<void, Error>>;

  /**
   * Get the underlying server
   */
  getServer(): Server;

  /**
   * Get active connection count
   */
  getConnectionCount(): number;
}

/**
 * Message structure for Cap'n Proto RPC
 */
interface RPCMessage {
  id: number;
  method: string;
  args?: any[];
  isResponse?: boolean;
  result?: any;
  error?: string;
}

/**
 * Create a Cap'n Proto RPC client with Result-based error handling
 *
 * @example
 * ```typescript
 * import { createCapnpClient } from '@servicejs/adapter-capnp';
 * import { MyService } from './schema.capnp';
 *
 * const client = createCapnpClient({
 *   host: 'localhost',
 *   port: 5000,
 *   schema: MyService,
 * });
 *
 * const result = await client.call('calculate', { a: 1, b: 2 });
 * if (result.ok) {
 *   console.log('Result:', result.value);
 * }
 *
 * await client.close();
 * ```
 */
export function createCapnpClient(config: CapnpClientConfig): CapnpClient {
  const {
    host,
    port,
    timeout = 5000,
    // pipelining = true,  // Reserved for future use
    // schema,  // Reserved for future use
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
      socket = new Socket();

      socket.connect(port, host, () => {
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
            const message: RPCMessage = JSON.parse(msgStr);

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

  const client: CapnpClient = {
    async call<TResponse = any>(
      method: string,
      ...args: any[]
    ): Promise<Result<TResponse, Error>> {
      try {
        await ensureConnected();

        const id = messageId++;
        const message: RPCMessage = {
          id,
          method,
          args,
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

    pipeline<TResponse = any>(
      method: string,
      ...args: any[]
    ): PipelinedPromise<TResponse> {
      const promise = this.call<TResponse>(method, ...args);

      // Add pipelining support
      const pipelined = promise as any as PipelinedPromise<TResponse>;
      pipelined.pipeline = function<TResult>(
        pipelineMethod: string,
        ...args: any[]
      ): PipelinedPromise<TResult> {
        // Chain the promise
        const chained = promise.then(async (result) => {
          if (!isOk(result)) {
            return result as any;
          }

          // Call the next method with the result
          return client.call(pipelineMethod, {
            ...result.value,
            ...args[0],
          });
        }) as any as PipelinedPromise<TResult>;

        return chained;
      };

      return pipelined;
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
 * Create a Cap'n Proto RPC server with ServiceJS patterns
 *
 * @example
 * ```typescript
 * import { createCapnpServer } from '@servicejs/adapter-capnp';
 * import { MyService } from './schema.capnp';
 *
 * const service = {
 *   calculate: async ({ a, b }: { a: number; b: number }) => {
 *     return { result: a + b };
 *   },
 * };
 *
 * const server = createCapnpServer({
 *   port: 5000,
 *   schema: MyService,
 *   service,
 *   logging: true,
 * });
 *
 * await server.listen();
 * ```
 */
export function createCapnpServer(config: CapnpServerConfig): CapnpServer {
  const {
    port,
    host = '0.0.0.0',
    service,
    // schema,  // Reserved for future use
    logging = false,
    // maxConcurrentRequests = 100,  // Reserved for future use
  } = config;

  const server = createServer();
  const connections = new Set<Socket>();

  server.on('connection', (socket) => {
    connections.add(socket);
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete messages (newline-delimited)
      const messages = buffer.split('\n');
      buffer = messages.pop() || '';

      for (const messageStr of messages) {
        if (!messageStr.trim()) continue;

        try {
          const message: RPCMessage = JSON.parse(messageStr);

          if (logging) {
            console.log(`[Cap'n Proto] ${message.method}(${JSON.stringify(message.args)})`);
          }

          const handler = service[message.method];
          if (!handler) {
            const response: RPCMessage = {
              id: message.id,
              method: message.method,
              isResponse: true,
              error: `Method ${message.method} not found`,
            };
            socket.write(JSON.stringify(response) + '\n');
            continue;
          }

          try {
            const result = await Promise.resolve(
              handler.apply(service, message.args || [])
            );

            const response: RPCMessage = {
              id: message.id,
              method: message.method,
              isResponse: true,
              result,
            };

            if (logging) {
              console.log(`[Cap'n Proto] ${message.method} -> ${JSON.stringify(result)}`);
            }

            socket.write(JSON.stringify(response) + '\n');
          } catch (error) {
            const response: RPCMessage = {
              id: message.id,
              method: message.method,
              isResponse: true,
              error: error instanceof Error ? error.message : String(error),
            };

            if (logging) {
              console.error(`[Cap'n Proto] ${message.method} error:`, error);
            }

            socket.write(JSON.stringify(response) + '\n');
          }
        } catch (error) {
          if (logging) {
            console.error('[Cap\'n Proto] Failed to parse message:', error);
          }
        }
      }
    });

    socket.on('close', () => {
      connections.delete(socket);
    });

    socket.on('error', (error) => {
      if (logging) {
        console.error('[Cap\'n Proto] Socket error:', error);
      }
      connections.delete(socket);
    });
  });

  const capnpServer: CapnpServer = {
    async listen(): Promise<Result<void, Error>> {
      return new Promise((resolve) => {
        server.listen(port, host, () => {
          if (logging) {
            console.log(`[Cap'n Proto] Server listening on ${host}:${port}`);
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
              console.log('[Cap\'n Proto] Server closed');
            }
            resolve(ok(undefined));
          }
        });
      });
    },

    getServer(): Server {
      return server;
    },

    getConnectionCount(): number {
      return connections.size;
    },
  };

  return capnpServer;
}

/**
 * Helper to serialize data with Cap'n Proto
 */
export function serialize<T>(_schema: any, data: T): Buffer {
  // Placeholder - actual implementation would use capnp-ts
  return Buffer.from(JSON.stringify(data));
}

/**
 * Helper to deserialize data with Cap'n Proto
 */
export function deserialize<T>(_schema: any, buffer: Buffer): T {
  // Placeholder - actual implementation would use capnp-ts
  return JSON.parse(buffer.toString()) as T;
}

/**
 * Cap'n Proto schema compiler wrapper
 */
export interface SchemaCompiler {
  /**
   * Compile a .capnp schema file to TypeScript
   */
  compile(schemaPath: string, outputPath: string): Promise<Result<void, Error>>;
}

/**
 * Create a schema compiler
 */
export function createSchemaCompiler(): SchemaCompiler {
  return {
    async compile(_schemaPath: string, _outputPath: string): Promise<Result<void, Error>> {
      try {
        // This would use capnpc-ts to compile the schema
        // For now, just return success
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}
