/**
 * Cloudflare Workers fetch handler adapter
 */

import { Result, ok, err } from '@servicejs/result';
import type { WorkersHTTPRequest, WorkersHTTPResponse, FetchHandler, ErrorHandler } from './types';

/**
 * Configuration for the fetch handler adapter
 */
export interface FetchHandlerConfig {
  /**
   * Enable automatic error responses
   */
  autoErrorResponse?: boolean;

  /**
   * Default status code for errors
   */
  errorStatusCode?: number;
}

/**
 * Fetch handler adapter for Cloudflare Workers
 */
export interface FetchHandlerAdapter<Env = unknown> {
  /**
   * Initialize the adapter
   */
  init(config?: FetchHandlerConfig): Promise<Result<void, Error>>;

  /**
   * Register a fetch handler
   */
  onFetch(handler: FetchHandler<Env>): void;

  /**
   * Register an error handler
   */
  onError(handler: ErrorHandler): void;

  /**
   * Handle a fetch event (called by Workers runtime)
   */
  handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response>;
}

/**
 * Create a fetch handler adapter for Cloudflare Workers
 *
 * @example
 * ```typescript
 * import { createFetchHandler } from '@servicejs/server-cloudflare-workers';
 *
 * const handler = createFetchHandler<Env>();
 * await handler.init();
 *
 * handler.onFetch(async (request, env, ctx) => {
 *   return {
 *     statusCode: 200,
 *     body: JSON.stringify({ message: 'Hello from Workers!' }),
 *     headers: { 'Content-Type': 'application/json' },
 *   };
 * });
 *
 * export default {
 *   fetch: (req, env, ctx) => handler.handleFetch(req, env, ctx),
 * };
 * ```
 */
export function createFetchHandler<Env = unknown>(): FetchHandlerAdapter<Env> {
  let config: FetchHandlerConfig = {
    autoErrorResponse: true,
    errorStatusCode: 500,
  };

  let fetchHandler: FetchHandler<Env> | null = null;
  let errorHandler: ErrorHandler | null = null;

  return {
    async init(cfg?: FetchHandlerConfig): Promise<Result<void, Error>> {
      config = {
        ...config,
        ...cfg,
      };
      return ok(undefined);
    },

    onFetch(handler: FetchHandler<Env>): void {
      fetchHandler = handler;
    },

    onError(handler: ErrorHandler): void {
      errorHandler = handler;
    },

    async handleFetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
      try {
        if (!fetchHandler) {
          return new Response('No fetch handler registered', { status: 500 });
        }

        // Convert Request to WorkersHTTPRequest
        const url = new URL(request.url);
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key] = value;
        });

        let body: string | ArrayBuffer | undefined;
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          const contentType = request.headers.get('content-type');
          if (contentType?.includes('application/json') || contentType?.includes('text/')) {
            body = await request.text();
          } else {
            body = await request.arrayBuffer();
          }
        }

        const workersRequest: WorkersHTTPRequest = {
          method: request.method,
          url: url.pathname + url.search,
          headers,
          body,
          cf: request.cf,
        };

        // Call the user's handler
        const response = await Promise.resolve(fetchHandler(workersRequest, env, ctx));

        // Convert WorkersHTTPResponse to Response
        const responseHeaders = new Headers(response.headers);
        const statusCode = response.statusCode || 200;

        return new Response(response.body, {
          status: statusCode,
          headers: responseHeaders,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (errorHandler) {
          try {
            await Promise.resolve(errorHandler(err));
          } catch (handlerError) {
            console.error('Error in error handler:', handlerError);
          }
        }

        if (config.autoErrorResponse) {
          return new Response(
            JSON.stringify({
              error: err.message,
              stack: err.stack,
            }),
            {
              status: config.errorStatusCode,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }

        throw error;
      }
    },
  };
}
