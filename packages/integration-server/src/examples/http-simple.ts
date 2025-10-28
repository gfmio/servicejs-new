/**
 * Simple HTTP Server Adapter Example
 *
 * Demonstrates how to implement a basic HTTP server adapter.
 * This is a minimal example - production adapters would be more robust.
 */

import { ok, err, type Result } from '@servicejs/result';
import { createServerAdapter, type ServerAdapter, type ServerRequest, type ServerResponse } from '../server.js';

export interface SimpleHttpServerConfig {
  port: number;
  host?: string;
}

/**
 * Create a simple HTTP server adapter
 *
 * This is an example implementation that shows the pattern.
 * Real implementations would use Node.js http module, Bun.serve, etc.
 *
 * @example
 * ```typescript
 * const server = createSimpleHttpServer();
 *
 * await server.init({ port: 3000 });
 * await server.start();
 *
 * server.onRequest(async (req) => {
 *   return {
 *     status: 200,
 *     headers: new Map([['content-type', 'application/json']]),
 *     body: { message: 'Hello World' }
 *   };
 * });
 *
 * // Later...
 * await server.stop();
 * await server.destroy();
 * ```
 */
export const createSimpleHttpServer = (): ServerAdapter => {
  let requestHandler: ((req: ServerRequest) => Promise<ServerResponse>) | null = null;
  let serverRunning = false;

  const adapter = createServerAdapter(
    {
      name: 'simple-http-server',
      version: '1.0.0',
      type: 'server',
      platforms: ['node', 'bun'],
      description: 'Simple HTTP server example adapter',
    },
    {
      onInit: async (config) => {
        const serverConfig = config as SimpleHttpServerConfig;

        if (!serverConfig.port) {
          return err(new Error('Port is required'));
        }

        if (serverConfig.port < 1 || serverConfig.port > 65535) {
          return err(new Error('Port must be between 1 and 65535'));
        }

        // In a real implementation, you would initialize the HTTP server here
        // For example: server = http.createServer()

        return ok(undefined);
      },

      onStart: async () => {
        // In a real implementation, you would start listening here
        // For example: await server.listen(port, host)

        serverRunning = true;
        return ok(undefined);
      },

      onStop: async () => {
        // In a real implementation, you would stop the server here
        // For example: await server.close()

        serverRunning = false;
        return ok(undefined);
      },

      onDestroy: async () => {
        // Cleanup resources
        requestHandler = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!serverRunning) {
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

/**
 * Example: Create an HTTP server with routing
 *
 * @example
 * ```typescript
 * const server = createSimpleHttpServer();
 * await server.init({ port: 3000 });
 * await server.start();
 *
 * server.onRequest(async (req) => {
 *   // Simple routing
 *   if (req.url === '/' && req.method === 'GET') {
 *     return {
 *       status: 200,
 *       headers: new Map([['content-type', 'text/plain']]),
 *       body: 'Hello World'
 *     };
 *   }
 *
 *   if (req.url === '/api/users' && req.method === 'GET') {
 *     return {
 *       status: 200,
 *       headers: new Map([['content-type', 'application/json']]),
 *       body: { users: ['alice', 'bob'] }
 *     };
 *   }
 *
 *   // 404 Not Found
 *   return {
 *     status: 404,
 *     headers: new Map([['content-type', 'text/plain']]),
 *     body: 'Not Found'
 *   };
 * });
 * ```
 */
export const exampleHttpServerWithRouting = async () => {
  const server = createSimpleHttpServer();

  await server.init({ port: 3000 });
  await server.start();

  server.onRequest?.(async (req) => {
    // Simple routing logic
    const routes: Record<string, () => ServerResponse> = {
      'GET /': () => ({
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        body: 'Welcome!',
      }),
      'GET /health': () => ({
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        body: { status: 'ok' },
      }),
    };

    const key = `${req.method} ${req.url}`;
    const handler = routes[key];

    if (handler) {
      return handler();
    }

    return {
      status: 404,
      headers: new Map([['content-type', 'text/plain']]),
      body: 'Not Found',
    };
  });

  return server;
};
