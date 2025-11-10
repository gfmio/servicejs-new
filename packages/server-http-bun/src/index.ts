/**
 * @packageDocumentation
 * HTTP server adapter for ServiceJS using Bun's native HTTP server.
 *
 * This adapter leverages Bun.serve() for high-performance HTTP serving.
 */

import { Result, ok, err } from '@servicejs/result';

/**
 * Configuration options for the HTTP server.
 */
export interface HTTPServerConfig {
  /**
   * Port number to listen on.
   */
  port: number;

  /**
   * Hostname to bind to (default: '0.0.0.0').
   */
  hostname?: string;

  /**
   * Enable development mode (default: false).
   */
  development?: boolean;
}

/**
 * HTTP request information.
 */
export interface HTTPRequest {
  /**
   * HTTP method (GET, POST, etc.).
   */
  method: string;

  /**
   * Request URL path.
   */
  url: string;

  /**
   * Request headers.
   */
  headers: Record<string, string>;

  /**
   * Query parameters.
   */
  query: Record<string, string>;

  /**
   * Request body (for POST, PUT, etc.).
   */
  body?: string;
}

/**
 * HTTP response information.
 */
export interface HTTPResponse {
  /**
   * HTTP status code (default: 200).
   */
  statusCode?: number;

  /**
   * Response headers.
   */
  headers?: Record<string, string>;

  /**
   * Response body.
   */
  body: string | Buffer | ReadableStream;
}

/**
 * Handler for HTTP requests.
 */
export type RequestHandler = (
  request: HTTPRequest
) => HTTPResponse | Promise<HTTPResponse>;

/**
 * Handler for errors.
 */
export type ErrorHandler = (error: Error) => void | Promise<void>;

/**
 * HTTP server adapter interface.
 */
export interface HTTPServerAdapter {
  /**
   * Initialize the server with configuration.
   */
  init(config: HTTPServerConfig): Promise<Result<void, Error>>;

  /**
   * Start the HTTP server.
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the HTTP server.
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
   * Register a handler for HTTP requests.
   */
  onRequest(handler: RequestHandler): void;

  /**
   * Register a handler for errors.
   */
  onError(handler: ErrorHandler): void;
}

/**
 * Create a new HTTP server adapter using Bun's native HTTP server.
 *
 * @example
 * ```typescript
 * import { createHTTPServer } from '@servicejs/server-http-bun';
 *
 * const server = createHTTPServer();
 *
 * await server.init({ port: 3000 });
 *
 * server.onRequest((request) => ({
 *   statusCode: 200,
 *   body: `Hello, ${request.method} ${request.url}`,
 * }));
 *
 * await server.start();
 * ```
 */
export function createHTTPServer(): HTTPServerAdapter {
  let config: HTTPServerConfig | null = null;
  let server: ReturnType<typeof Bun.serve> | null = null;
  let isRunning = false;

  // Event handlers
  let requestHandler: RequestHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg: HTTPServerConfig): Promise<Result<void, Error>> {
      if (config !== null) {
        return err(new Error('Server already initialized'));
      }

      config = {
        hostname: '0.0.0.0',
        development: false,
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
        server = Bun.serve({
          port: config.port,
          hostname: config.hostname,
          development: config.development,

          async fetch(req: Request): Promise<Response> {
            try {
              // Parse URL
              const url = new URL(req.url);

              // Parse query parameters
              const query: Record<string, string> = {};
              url.searchParams.forEach((value, key) => {
                query[key] = value;
              });

              // Parse headers
              const headers: Record<string, string> = {};
              req.headers.forEach((value, key) => {
                headers[key] = value;
              });

              // Parse body if present
              let body: string | undefined;
              if (req.method !== 'GET' && req.method !== 'HEAD') {
                body = await req.text();
              }

              const httpRequest: HTTPRequest = {
                method: req.method,
                url: url.pathname,
                headers,
                query,
                body,
              };

              if (requestHandler) {
                const response = await Promise.resolve(requestHandler(httpRequest));

                return new Response(response.body, {
                  status: response.statusCode || 200,
                  headers: response.headers,
                });
              }

              return new Response('Not Found', { status: 404 });
            } catch (error) {
              if (errorHandler) {
                await Promise.resolve(
                  errorHandler(error instanceof Error ? error : new Error(String(error)))
                );
              }

              return new Response('Internal Server Error', { status: 500 });
            }
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
      requestHandler = null;
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

    onRequest(handler: RequestHandler): void {
      requestHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },
  };
}
