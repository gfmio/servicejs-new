/**
 * @servicejs/lifecycle - Lifecycle Hooks
 *
 * Optional lifecycle management for components.
 */

import type { Message, Component, Capability } from '@servicejs/core';
import { ok, err, type Result } from '@servicejs/result';

/**
 * Lifecycle hooks interface.
 *
 * Provides optional init and shutdown hooks for components.
 */
export interface LifecycleHooks {
  /**
   * Called when the component is initialized.
   * Use for opening connections, loading resources, etc.
   *
   * @returns Promise that resolves when initialization is complete
   */
  onInit?: () => Promise<void>;

  /**
   * Called when the component is shutting down.
   * Use for closing connections, releasing resources, etc.
   *
   * @returns Promise that resolves when shutdown is complete
   */
  onShutdown?: () => Promise<void>;
}

/**
 * Lifecycle error types.
 */
export type LifecycleError =
  | { type: 'INIT_ERROR'; error: unknown }
  | { type: 'SHUTDOWN_ERROR'; error: unknown }
  | { type: 'ALREADY_INITIALIZED' }
  | { type: 'ALREADY_SHUTDOWN' }
  | { type: 'NOT_INITIALIZED' };

/**
 * Managed component with lifecycle support.
 *
 * Extends a regular component with init/shutdown methods.
 */
export interface ManagedComponent<TState, TMsg extends Message> {
  /**
   * The underlying component.
   */
  readonly component: Component<TState, TMsg>;

  /**
   * The component's capability.
   */
  readonly capability: Capability<TMsg>;

  /**
   * Initialize the component.
   * Calls the onInit hook if provided.
   *
   * @returns Result indicating success or error
   */
  init(): Promise<Result<void, LifecycleError>>;

  /**
   * Shutdown the component.
   * Calls the onShutdown hook if provided.
   *
   * @returns Result indicating success or error
   */
  shutdown(): Promise<Result<void, LifecycleError>>;

  /**
   * Check if the component is initialized.
   *
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean;

  /**
   * Check if the component is shutdown.
   *
   * @returns True if shutdown, false otherwise
   */
  isShutdown(): boolean;
}

/**
 * Wrap a component with lifecycle management.
 *
 * Adds init/shutdown methods that call the provided hooks.
 *
 * @typeParam TState - The component state type
 * @typeParam TMsg - The component message type
 * @param component - The component to wrap
 * @param capability - The component's capability
 * @param hooks - Optional lifecycle hooks
 * @returns A managed component with lifecycle support
 *
 * @example
 * ```typescript
 * const { component, capability } = createComponent(
 *   createURN('app', 'database'),
 *   { connection: null },
 *   reducer
 * );
 *
 * const managed = withLifecycle(component, capability, {
 *   onInit: async () => {
 *     console.log('Opening database connection...');
 *     await openConnection();
 *   },
 *   onShutdown: async () => {
 *     console.log('Closing database connection...');
 *     await closeConnection();
 *   },
 * });
 *
 * await managed.init(); // Calls onInit
 * // ... use component ...
 * await managed.shutdown(); // Calls onShutdown
 * ```
 */
export function withLifecycle<TState, TMsg extends Message>(
  component: Component<TState, TMsg>,
  capability: Capability<TMsg>,
  hooks: LifecycleHooks = {}
): ManagedComponent<TState, TMsg> {
  let initialized = false;
  let shutdown = false;

  return {
    component,
    capability,

    async init(): Promise<Result<void, LifecycleError>> {
      if (shutdown) {
        return err({ type: 'ALREADY_SHUTDOWN' });
      }

      if (initialized) {
        return err({ type: 'ALREADY_INITIALIZED' });
      }

      if (hooks.onInit) {
        try {
          await hooks.onInit();
        } catch (error) {
          return err({ type: 'INIT_ERROR', error });
        }
      }

      initialized = true;
      return ok(undefined);
    },

    async shutdown(): Promise<Result<void, LifecycleError>> {
      if (shutdown) {
        return err({ type: 'ALREADY_SHUTDOWN' });
      }

      if (!initialized && hooks.onInit) {
        return err({ type: 'NOT_INITIALIZED' });
      }

      if (hooks.onShutdown) {
        try {
          await hooks.onShutdown();
        } catch (error) {
          return err({ type: 'SHUTDOWN_ERROR', error });
        }
      }

      shutdown = true;
      return ok(undefined);
    },

    isInitialized(): boolean {
      return initialized;
    },

    isShutdown(): boolean {
      return shutdown;
    },
  };
}
