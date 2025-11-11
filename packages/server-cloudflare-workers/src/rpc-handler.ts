/**
 * Cloudflare Workers RPC integration
 */

import { Result, ok, err } from '@servicejs/result';

/**
 * RPC method handler
 */
export type RPCMethod<Args = unknown[], Return = unknown> = (
  ...args: Args
) => Promise<Return> | Return;

/**
 * RPC service interface
 */
export interface RPCService {
  [method: string]: RPCMethod;
}

/**
 * RPC client for calling remote services
 */
export interface RPCClient<T extends RPCService> {
  /**
   * Call a remote RPC method
   */
  call<K extends keyof T>(
    method: K,
    ...args: Parameters<T[K]>
  ): Promise<Result<ReturnType<T[K]>, Error>>;
}

/**
 * Create an RPC service binding handler
 *
 * This provides type-safe RPC calls between Workers using service bindings.
 *
 * @example
 * ```typescript
 * // Define your RPC service interface
 * interface UserService {
 *   getUser(id: string): Promise<User>;
 *   createUser(name: string, email: string): Promise<User>;
 *   deleteUser(id: string): Promise<void>;
 * }
 *
 * // In your worker with the service binding:
 * interface Env {
 *   USER_SERVICE: Service<UserService>;
 * }
 *
 * const client = createRPCClient<UserService>(env.USER_SERVICE);
 *
 * const userResult = await client.call('getUser', '123');
 * if (isOk(userResult)) {
 *   console.log('User:', userResult.value);
 * }
 * ```
 */
export function createRPCClient<T extends RPCService>(
  binding: Fetcher
): RPCClient<T> {
  return {
    async call<K extends keyof T>(
      method: K,
      ...args: Parameters<T[K]>
    ): Promise<Result<ReturnType<T[K]>, Error>> {
      try {
        const response = await binding.fetch('https://rpc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            method: String(method),
            args,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return err(new Error(`RPC call failed: ${errorText}`));
        }

        const result = await response.json();
        return ok(result as ReturnType<T[K]>);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
}

/**
 * Create an RPC service handler
 *
 * @example
 * ```typescript
 * // Implement your RPC service
 * const userService: UserService = {
 *   async getUser(id: string) {
 *     return await db.getUser(id);
 *   },
 *
 *   async createUser(name: string, email: string) {
 *     return await db.createUser({ name, email });
 *   },
 *
 *   async deleteUser(id: string) {
 *     await db.deleteUser(id);
 *   },
 * };
 *
 * const handler = createRPCService(userService);
 *
 * export default {
 *   fetch: (req, env, ctx) => handler.handleRPC(req, env, ctx),
 * };
 * ```
 */
export function createRPCService<T extends RPCService>(service: T) {
  return {
    async handleRPC(
      request: Request,
      env: unknown,
      ctx: ExecutionContext
    ): Promise<Response> {
      try {
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }

        const body = await request.json<{
          method: string;
          args: unknown[];
        }>();

        const { method, args } = body;

        if (!method || typeof method !== 'string') {
          return new Response('Invalid method', { status: 400 });
        }

        if (!(method in service)) {
          return new Response(`Method ${method} not found`, { status: 404 });
        }

        const handler = service[method];
        if (typeof handler !== 'function') {
          return new Response(`${method} is not a function`, { status: 400 });
        }

        const result = await Promise.resolve(handler.apply(service, args as never[]));

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        return new Response(
          JSON.stringify({
            error: err.message,
            stack: err.stack,
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    },
  };
}

/**
 * Helper to create a typed RPC service binding
 */
export function bindRPCService<T extends RPCService>(
  env: Record<string, unknown>,
  bindingName: string
): RPCClient<T> | null {
  const binding = env[bindingName];

  if (!binding || typeof (binding as Fetcher).fetch !== 'function') {
    return null;
  }

  return createRPCClient<T>(binding as Fetcher);
}
