/**
 * @servicejs/lifecycle - Shutdown Coordinator
 *
 * Coordinates graceful shutdown of multiple components.
 */

import type { Message } from '@servicejs/core';
import { ok, err, isErr, type Result } from '@servicejs/result';
import type { ManagedComponent, LifecycleError } from './lifecycle.js';

/**
 * Shutdown error types.
 */
export type ShutdownError =
  | { type: 'ALREADY_SHUTDOWN' }
  | { type: 'COMPONENT_SHUTDOWN_ERROR'; componentIndex: number; error: LifecycleError }
  | { type: 'PARTIAL_SHUTDOWN'; errors: Array<{ componentIndex: number; error: LifecycleError }> };

/**
 * Options for shutdown coordination.
 */
export interface ShutdownOptions {
  /**
   * If true, continue shutting down remaining components even if one fails.
   * Default: true
   */
  continueOnError?: boolean;

  /**
   * Timeout in milliseconds for each component shutdown.
   * Default: 5000 (5 seconds)
   */
  timeout?: number;
}

/**
 * Shutdown coordinator interface.
 *
 * Manages graceful shutdown of multiple components.
 */
export interface ShutdownCoordinator {
  /**
   * Register a managed component for shutdown.
   * Components are shut down in reverse order of registration.
   *
   * @param component - The managed component to register
   */
  register<TState, TMsg extends Message>(
    component: ManagedComponent<TState, TMsg>
  ): void;

  /**
   * Shutdown all registered components.
   * Components are shut down in reverse order of registration.
   *
   * @param options - Shutdown options
   * @returns Result indicating success or errors encountered
   */
  shutdown(options?: ShutdownOptions): Promise<Result<void, ShutdownError>>;

  /**
   * Check if shutdown has been initiated.
   *
   * @returns True if shutdown was called, false otherwise
   */
  isShutdown(): boolean;

  /**
   * Get the number of registered components.
   *
   * @returns The number of components
   */
  size(): number;
}

/**
 * Create a shutdown coordinator.
 *
 * The coordinator manages graceful shutdown of multiple components,
 * shutting them down in reverse order of registration (LIFO).
 *
 * @returns A new shutdown coordinator
 *
 * @example
 * ```typescript
 * const coordinator = createShutdownCoordinator();
 *
 * const db = withLifecycle(dbComponent, dbCapability, {
 *   onInit: async () => { await openConnection(); },
 *   onShutdown: async () => { await closeConnection(); }
 * });
 *
 * const cache = withLifecycle(cacheComponent, cacheCapability, {
 *   onInit: async () => { await connectToRedis(); },
 *   onShutdown: async () => { await disconnectFromRedis(); }
 * });
 *
 * coordinator.register(db);
 * coordinator.register(cache);
 *
 * // Later, shutdown all components (cache first, then db)
 * await coordinator.shutdown();
 * ```
 */
export function createShutdownCoordinator(): ShutdownCoordinator {
  const components: Array<ManagedComponent<unknown, Message>> = [];
  let shutdown = false;

  return {
    register<TState, TMsg extends Message>(
      component: ManagedComponent<TState, TMsg>
    ): void {
      components.push(component as ManagedComponent<unknown, Message>);
    },

    async shutdown(options: ShutdownOptions = {}): Promise<Result<void, ShutdownError>> {
      if (shutdown) {
        return err({ type: 'ALREADY_SHUTDOWN' });
      }

      shutdown = true;

      const {
        continueOnError = true,
        timeout = 5000,
      } = options;

      const errors: Array<{ componentIndex: number; error: LifecycleError }> = [];

      // Shutdown in reverse order (LIFO)
      for (let i = components.length - 1; i >= 0; i--) {
        const component = components[i]!;

        try {
          // Create timeout promise
          const timeoutPromise = new Promise<Result<void, LifecycleError>>(
            (resolve) =>
              setTimeout(
                () =>
                  resolve(
                    err({
                      type: 'SHUTDOWN_ERROR',
                      error: new Error(`Shutdown timeout after ${timeout}ms`),
                    })
                  ),
                timeout
              )
          );

          // Race between shutdown and timeout
          const result: Result<void, LifecycleError> = await Promise.race([
            component.shutdown(),
            timeoutPromise,
          ]);

          if (isErr(result)) {
            errors.push({ componentIndex: i, error: result.error });

            if (!continueOnError) {
              return err({
                type: 'COMPONENT_SHUTDOWN_ERROR',
                componentIndex: i,
                error: result.error,
              });
            }
          }
        } catch (error) {
          const lifecycleError: LifecycleError = {
            type: 'SHUTDOWN_ERROR',
            error,
          };
          errors.push({ componentIndex: i, error: lifecycleError });

          if (!continueOnError) {
            return err({
              type: 'COMPONENT_SHUTDOWN_ERROR',
              componentIndex: i,
              error: lifecycleError,
            });
          }
        }
      }

      if (errors.length > 0) {
        return err({ type: 'PARTIAL_SHUTDOWN', errors });
      }

      return ok(undefined);
    },

    isShutdown(): boolean {
      return shutdown;
    },

    size(): number {
      return components.length;
    },
  };
}
