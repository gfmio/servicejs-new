/**
 * Node.js HTTP Adapter for ServiceJS
 *
 * Provides HTTP server capabilities using Node.js built-in http/https modules.
 */

import * as http from 'http';
import * as https from 'https';
import { ok, err } from '@servicejs/result';
import {
  createServerAdapter,
  type ServerAdapter,
  type ServerRequest,
  type ServerResponse,
} from '@servicejs/integration-server';

export interface NodeHttpConfig {
  port: number;
  hostname?: string;

  /**
   * Use HTTPS instead of HTTP
   */
  https?: boolean;

  /**
   * HTTPS options (cert, key, etc.)
   */
  httpsOptions?: https.ServerOptions;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Keep-alive timeout in milliseconds
   */
  keepAliveTimeout?: number;

  /**
   * Max header size in bytes
   */
  maxHeaderSize?: number;
}

/**
 * Create a Node.js HTTP adapter
 *
 * Uses Node.js's built-in http/https modules for HTTP server functionality.
 *
 * @example
 * ```typescript
 * const server = createNodeHttpAdapter();
 *
 * await server.init({ port: 3000, hostname: 'localhost' });
 * await server.start();
 *
 * server.onRequest(async (req) => {
 *   return {
 *     status: 200,
 *     headers: new Map([['content-type', 'application/json']]),
 *     body: { message: 'Hello from Node.js!' }
 *   };
 * });
 *
 * // Later...
 * await server.stop();
 * await server.destroy();
 * ```
 */
export const createNodeHttpAdapter = (): ServerAdapter => {
  let server: http.Server | https.Server | null = null;
  let requestHandler: ((req: ServerRequest) => Promise<ServerResponse>) | null = null;
  let config: NodeHttpConfig | null = null;

  const adapter = createServerAdapter(
    {
      name: 'node-http',
      version: '1.0.0',
      type: 'server',
      platforms: ['node'],
      description: 'Node.js HTTP server adapter using http/https modules',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as NodeHttpConfig;

        if (!config.port) {
          return err(new Error('Port is required'));
        }

        if (config.port < 1 || config.port > 65535) {
          return err(new Error('Port must be between 1 and 65535'));
        }

        return ok(undefined);
      },

      onStart: async () => {
        if (!config) {
          return err(new Error('Server not initialized'));
        }

        try {
          return new Promise((resolve) => {
            const handler = async (
              req: http.IncomingMessage,
              res: http.ServerResponse
            ): Promise<void> => {
              if (!requestHandler) {
                res.writeHead(503, { 'Content-Type': 'text/plain' });
                res.end('Service Unavailable');
                return;
              }

              try {
                // Parse request headers
                const headers = new Map<string, string>();
                for (const [key, value] of Object.entries(req.headers)) {
                  if (typeof value === 'string') {
                    headers.set(key.toLowerCase(), value);
                  } else if (Array.isArray(value)) {
                    headers.set(key.toLowerCase(), value[0] || '');
                  }
                }

                // Parse body
                let body: unknown = undefined;
                const contentType = headers.get('content-type') || '';

                if (req.method !== 'GET' && req.method !== 'HEAD') {
                  const chunks: Buffer[] = [];

                  await new Promise<void>((resolveBody, rejectBody) => {
                    req.on('data', (chunk: Buffer) => chunks.push(chunk));
                    req.on('end', () => resolveBody());
                    req.on('error', rejectBody);
                  });

                  const bodyText = Buffer.concat(chunks).toString('utf-8');

                  if (contentType.includes('application/json')) {
                    try {
                      body = JSON.parse(bodyText);
                    } catch {
                      body = bodyText;
                    }
                  } else {
                    body = bodyText;
                  }
                }

                // Create ServiceJS request
                const serverRequest: ServerRequest = {
                  method: req.method || 'GET',
                  url: req.url || '/',
                  headers,
                  body,
                };

                // Call handler
                const response = await requestHandler(serverRequest);

                // Convert response
                const responseHeaders: Record<string, string> = {};
                if (response.headers) {
                  response.headers.forEach((value: string, key: string) => {
                    responseHeaders[key] = value;
                  });
                }

                // Serialize body
                let responseBody: string;
                if (typeof response.body === 'string') {
                  responseBody = response.body;
                } else if (response.body === null || response.body === undefined) {
                  responseBody = '';
                } else {
                  responseBody = JSON.stringify(response.body);
                  if (!responseHeaders['content-type']) {
                    responseHeaders['content-type'] = 'application/json';
                  }
                }

                res.writeHead(response.status, responseHeaders);
                res.end(responseBody);
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
              }
            };

            // Create server
            if (config!.https && config!.httpsOptions) {
              server = https.createServer(config!.httpsOptions, handler);
            } else {
              server = http.createServer(handler);
            }

            // Configure timeouts
            if (config!.timeout !== undefined) {
              server.timeout = config!.timeout;
            }

            if (config!.keepAliveTimeout !== undefined) {
              server.keepAliveTimeout = config!.keepAliveTimeout;
            }

            if (config!.maxHeaderSize !== undefined) {
              server.maxHeadersCount = config!.maxHeaderSize;
            }

            // Start listening
            const hostname = config!.hostname || 'localhost';
            const port = config!.port;

            server.listen(port, hostname, () => {
              resolve(ok(undefined));
            });

            server.on('error', (error: Error) => {
              resolve(err(error));
            });
          });
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStop: async () => {
        if (!server) {
          return err(new Error('Server not running'));
        }

        try {
          return new Promise((resolve) => {
            server!.close((error?: Error) => {
              if (error) {
                resolve(err(error));
              } else {
                resolve(ok(undefined));
              }
            });
          });
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onDestroy: async () => {
        server = null;
        config = null;
        requestHandler = null;
        return ok(undefined);
      },
    }
  );

  // Add request handler registration
  adapter.onRequest = (handler: (request: ServerRequest) => Promise<ServerResponse>): void => {
    requestHandler = handler;
  };

  return adapter;
};
