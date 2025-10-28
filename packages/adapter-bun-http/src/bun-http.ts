/**
 * Bun HTTP Server Adapter
 *
 * Real implementation using Bun.serve()
 */

import { ok, err } from '@servicejs/result';
import {
  createServerAdapter,
  type ServerAdapter,
  type ServerRequest,
  type ServerResponse,
} from '@servicejs/integration-server';

export interface BunHttpConfig {
  port: number;
  hostname?: string;
  development?: boolean;
}

/**
 * Create a Bun HTTP server adapter
 *
 * Uses Bun's native HTTP server (Bun.serve) for maximum performance.
 *
 * @example
 * ```typescript
 * const server = createBunHttpAdapter();
 *
 * await server.init({ port: 3000, hostname: 'localhost' });
 * await server.start();
 *
 * server.onRequest(async (req) => {
 *   return {
 *     status: 200,
 *     headers: new Map([['content-type', 'application/json']]),
 *     body: { message: 'Hello from Bun!' }
 *   };
 * });
 *
 * // Later...
 * await server.stop();
 * await server.destroy();
 * ```
 */
export const createBunHttpAdapter = (): ServerAdapter => {
  let bunServer: ReturnType<typeof Bun.serve> | null = null;
  let requestHandler: ((req: ServerRequest) => Promise<ServerResponse>) | null = null;
  let config: BunHttpConfig | null = null;

  const adapter = createServerAdapter(
    {
      name: 'bun-http',
      version: '1.0.0',
      type: 'server',
      platforms: ['bun'],
      description: 'Bun HTTP server adapter using Bun.serve',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as BunHttpConfig;

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
          bunServer = Bun.serve({
            port: config.port,
            hostname: config.hostname || 'localhost',
            development: config.development ?? false,

            fetch: async (request: Request): Promise<Response> => {
              if (!requestHandler) {
                return new Response('No request handler registered', { status: 500 });
              }

              try {
                // Convert Bun Request to ServerRequest
                const headers = new Map<string, string>();
                request.headers.forEach((value, key) => {
                  headers.set(key, value);
                });

                let body: unknown = undefined;
                const contentType = request.headers.get('content-type') || '';

                if (request.method !== 'GET' && request.method !== 'HEAD') {
                  if (contentType.includes('application/json')) {
                    try {
                      body = await request.json();
                    } catch {
                      body = await request.text();
                    }
                  } else {
                    body = await request.text();
                  }
                }

                const serverRequest: ServerRequest = {
                  method: request.method,
                  url: new URL(request.url).pathname + new URL(request.url).search,
                  headers,
                  body,
                };

                // Call handler
                const response = await requestHandler(serverRequest);

                // Convert ServerResponse to Bun Response
                const responseHeaders = new Headers();
                response.headers.forEach((value, key) => {
                  responseHeaders.set(key, value);
                });

                let responseBody: string | null = null;
                if (response.body !== undefined) {
                  const contentType = response.headers.get('content-type') || '';
                  if (contentType.includes('application/json')) {
                    responseBody = JSON.stringify(response.body);
                    if (!response.headers.has('content-type')) {
                      responseHeaders.set('content-type', 'application/json');
                    }
                  } else if (typeof response.body === 'string') {
                    responseBody = response.body;
                  } else {
                    responseBody = JSON.stringify(response.body);
                  }
                }

                return new Response(responseBody, {
                  status: response.status,
                  headers: responseHeaders,
                });
              } catch (error) {
                console.error('Error handling request:', error);
                return new Response('Internal Server Error', { status: 500 });
              }
            },

            error: (error: Error) => {
              console.error('Server error:', error);
              return new Response('Internal Server Error', { status: 500 });
            },
          });

          console.log(`Bun HTTP server listening on http://${config.hostname || 'localhost'}:${config.port}`);
          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStop: async () => {
        if (bunServer) {
          try {
            bunServer.stop();
            bunServer = null;
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        }
        return ok(undefined);
      },

      onDestroy: async () => {
        if (bunServer) {
          bunServer.stop();
          bunServer = null;
        }
        requestHandler = null;
        config = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!bunServer) {
          return ok({ status: 'degraded', reason: 'Server not running' });
        }

        if (!requestHandler) {
          return ok({ status: 'degraded', reason: 'No request handler registered' });
        }

        return ok({ status: 'healthy' });
      },
    }
  );

  // Add request handler registration
  const serverAdapter = adapter as ServerAdapter;
  serverAdapter.onRequest = (handler) => {
    requestHandler = handler;
  };

  return serverAdapter;
};
