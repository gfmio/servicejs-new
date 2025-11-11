/**
 * Hono web framework adapter for ServiceJS
 *
 * This adapter integrates Hono's routing and middleware system with ServiceJS,
 * providing a lightweight, fast web framework for building HTTP APIs.
 */

import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { Result, ok, err, isOk } from '@servicejs/result';

/**
 * Service handler function type
 */
export type ServiceHandler<T = unknown> = (
  data: T
) => Promise<Result<unknown, Error>> | Result<unknown, Error>;

/**
 * Route configuration
 */
export interface RouteConfig<TInput = unknown, TOutput = unknown> {
  /**
   * HTTP method
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

  /**
   * Route path (Hono-style with parameters like /users/:id)
   */
  path: string;

  /**
   * Service handler function
   */
  handler: ServiceHandler<TInput>;

  /**
   * Optional input parser/validator
   */
  parseInput?: (c: Context) => Promise<TInput> | TInput;

  /**
   * Optional response formatter
   */
  formatOutput?: (result: TOutput) => unknown;
}

/**
 * Hono adapter configuration
 */
export interface HonoAdapterConfig {
  /**
   * Enable automatic error responses
   */
  autoErrorResponse?: boolean;

  /**
   * Default status code for errors
   */
  errorStatusCode?: number;

  /**
   * Enable request logging
   */
  logging?: boolean;

  /**
   * Custom error formatter
   */
  errorFormatter?: (error: Error) => unknown;
}

/**
 * Create a Hono app with ServiceJS integration
 *
 * @example
 * ```typescript
 * import { createHonoAdapter } from '@servicejs/adapter-hono';
 *
 * const app = createHonoAdapter({
 *   autoErrorResponse: true,
 *   logging: true,
 * });
 *
 * // Add routes with service handlers
 * app.addRoute({
 *   method: 'GET',
 *   path: '/users/:id',
 *   handler: async (data: { id: string }) => {
 *     const user = await getUserById(data.id);
 *     return ok(user);
 *   },
 *   parseInput: async (c) => ({
 *     id: c.req.param('id'),
 *   }),
 * });
 *
 * export default app.getApp();
 * ```
 */
export function createHonoAdapter(config: HonoAdapterConfig = {}) {
  const {
    autoErrorResponse = true,
    errorStatusCode = 500,
    logging = false,
    errorFormatter = (error: Error) => ({ error: error.message }),
  } = config;

  const app = new Hono();

  // Add logging middleware if enabled
  if (logging) {
    app.use('*', async (c, next) => {
      const start = Date.now();
      await next();
      const ms = Date.now() - start;
      console.log(`${c.req.method} ${c.req.url} - ${c.res.status} (${ms}ms)`);
    });
  }

  /**
   * Add a route with a service handler
   */
  function addRoute<TInput = unknown, TOutput = unknown>(
    route: RouteConfig<TInput, TOutput>
  ): void {
    const { method, path, handler, parseInput, formatOutput } = route;

    const honoHandler = async (c: Context) => {
      try {
        // Parse input
        const input = parseInput ? await parseInput(c) : ({} as TInput);

        // Call service handler
        const result = await Promise.resolve(handler(input));

        // Handle result
        if (isOk(result)) {
          const output = formatOutput ? formatOutput(result.value as TOutput) : result.value;
          return c.json(output);
        }

        // Error result (type narrowed to Err)
        const error = (result as any).error;
        if (autoErrorResponse) {
          const err = error instanceof Error ? error : new Error(String(error));
          return c.json(errorFormatter(err), errorStatusCode as any);
        }
        throw error;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (autoErrorResponse) {
          return c.json(errorFormatter(err), errorStatusCode as any);
        }

        throw error;
      }
    };

    // Register route with Hono
    switch (method) {
      case 'GET':
        app.get(path, honoHandler);
        break;
      case 'POST':
        app.post(path, honoHandler);
        break;
      case 'PUT':
        app.put(path, honoHandler);
        break;
      case 'DELETE':
        app.delete(path, honoHandler);
        break;
      case 'PATCH':
        app.patch(path, honoHandler);
        break;
      case 'HEAD':
        // HEAD requests are handled automatically by GET
        app.get(path, honoHandler);
        break;
      case 'OPTIONS':
        app.options(path, honoHandler);
        break;
    }
  }

  /**
   * Add custom middleware
   */
  function use(path: string, middleware: MiddlewareHandler): void {
    app.use(path, middleware);
  }

  /**
   * Add global middleware
   */
  function useGlobal(middleware: MiddlewareHandler): void {
    app.use('*', middleware);
  }

  /**
   * Get the underlying Hono app
   */
  function getApp(): Hono {
    return app;
  }

  /**
   * Start the server (Node.js/Bun)
   */
  async function listen(port: number): Promise<Result<void, Error>> {
    try {
      // For Bun
      if (typeof Bun !== 'undefined') {
        Bun.serve({
          port,
          fetch: app.fetch,
        });
        console.log(`Server running on http://localhost:${port}`);
        return ok(undefined);
      }

      // For Node.js (requires @hono/node-server)
      return err(new Error('Node.js server not implemented. Use Bun or deploy to edge runtime.'));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  return {
    addRoute,
    use,
    useGlobal,
    getApp,
    listen,
  };
}

/**
 * Helper to create a service handler from a function
 */
export function createServiceHandler<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput> | TOutput
): ServiceHandler<TInput> {
  return async (input: TInput): Promise<Result<TOutput, Error>> => {
    try {
      const result = await Promise.resolve(fn(input));
      return ok(result);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Common input parsers
 */
export const parsers = {
  /**
   * Parse JSON body
   */
  json: async <T = unknown>(c: Context): Promise<T> => {
    return await c.req.json<T>();
  },

  /**
   * Parse route params
   */
  params: <T extends Record<string, string> = Record<string, string>>(c: Context): T => {
    return c.req.param() as T;
  },

  /**
   * Parse query params
   */
  query: <T extends Record<string, string> = Record<string, string>>(c: Context): T => {
    return c.req.query() as T;
  },

  /**
   * Combine body and params
   */
  bodyAndParams: async <T = unknown>(c: Context): Promise<T & Record<string, string>> => {
    const body = await c.req.json<T>();
    const params = c.req.param();
    return { ...body, ...params };
  },

  /**
   * Combine body, params, and query
   */
  all: async <T = unknown>(
    c: Context
  ): Promise<T & Record<string, string>> => {
    const body = await c.req.json<T>();
    const params = c.req.param();
    const query = c.req.query();
    return { ...body, ...params, ...query };
  },
};

/**
 * Common middleware
 */
export const middleware = {
  /**
   * CORS middleware
   */
  cors: (options: {
    origin?: string | string[];
    credentials?: boolean;
  } = {}): MiddlewareHandler => {
    const { origin = '*', credentials = false } = options;

    return async (c, next) => {
      const originHeader = Array.isArray(origin) ? origin.join(', ') : origin;

      c.header('Access-Control-Allow-Origin', originHeader);
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (credentials) {
        c.header('Access-Control-Allow-Credentials', 'true');
      }

      if (c.req.method === 'OPTIONS') {
        return c.text('', 204 as any);
      }

      return await next();
    };
  },

  /**
   * Request ID middleware
   */
  requestId: (): MiddlewareHandler => {
    return async (c, next) => {
      const requestId = crypto.randomUUID();
      c.set('requestId', requestId);
      c.header('X-Request-ID', requestId);
      await next();
    };
  },

  /**
   * Timing middleware
   */
  timing: (): MiddlewareHandler => {
    return async (c, next) => {
      const start = Date.now();
      await next();
      const duration = Date.now() - start;
      c.header('X-Response-Time', `${duration}ms`);
    };
  },
};
