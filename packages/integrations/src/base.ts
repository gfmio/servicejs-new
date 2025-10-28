/**
 * Base Integration Framework
 *
 * Provides foundational types and utilities for creating ServiceJS integrations.
 */

import { type Result, ok, err, isErr } from '@servicejs/result';

// ============================================================================
// Types
// ============================================================================

/**
 * Integration metadata
 */
export interface IntegrationMetadata {
  /** Integration name */
  readonly name: string;

  /** Integration version */
  readonly version: string;

  /** Integration description */
  readonly description?: string;

  /** Integration author */
  readonly author?: string;

  /** Integration type */
  readonly type: 'server' | 'database' | 'message-queue' | 'cache' | 'other';

  /** Platform/runtime requirements */
  readonly platforms?: ReadonlyArray<'node' | 'bun' | 'deno' | 'browser' | 'cloudflare' | 'edge'>;
}

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  /** Custom configuration options */
  [key: string]: unknown;
}

/**
 * Integration lifecycle
 */
export interface IntegrationLifecycle {
  /**
   * Initialize the integration
   */
  init(config: IntegrationConfig): Promise<Result<void, Error>>;

  /**
   * Start the integration
   */
  start(): Promise<Result<void, Error>>;

  /**
   * Stop the integration
   */
  stop(): Promise<Result<void, Error>>;

  /**
   * Cleanup resources
   */
  destroy(): Promise<Result<void, Error>>;

  /**
   * Health check
   */
  health(): Promise<Result<HealthStatus, Error>>;
}

/**
 * Health status
 */
export type HealthStatus =
  | { readonly status: 'healthy' }
  | { readonly status: 'degraded'; readonly reason: string }
  | { readonly status: 'unhealthy'; readonly error: Error };

/**
 * Base integration interface
 */
export interface Integration extends IntegrationLifecycle {
  /** Integration metadata */
  readonly metadata: IntegrationMetadata;

  /** Current state */
  readonly state: IntegrationState;
}

/**
 * Integration state
 */
export type IntegrationState =
  | { readonly type: 'uninitialized' }
  | { readonly type: 'initializing' }
  | { readonly type: 'initialized' }
  | { readonly type: 'starting' }
  | { readonly type: 'started' }
  | { readonly type: 'stopping' }
  | { readonly type: 'stopped' }
  | { readonly type: 'error'; readonly error: Error };

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a base integration
 *
 * Provides default lifecycle management and state tracking.
 *
 * @example
 * ```typescript
 * const integration = createIntegration(
 *   {
 *     name: 'my-adapter',
 *     version: '1.0.0',
 *     type: 'server'
 *   },
 *   {
 *     onInit: async (config) => {
 *       // Initialize resources
 *       return ok(undefined);
 *     },
 *     onStart: async () => {
 *       // Start service
 *       return ok(undefined);
 *     },
 *     onStop: async () => {
 *       // Stop service
 *       return ok(undefined);
 *     },
 *     onDestroy: async () => {
 *       // Cleanup resources
 *       return ok(undefined);
 *     }
 *   }
 * );
 * ```
 */
export const createIntegration = (
  metadata: IntegrationMetadata,
  handlers: {
    onInit?: (config: IntegrationConfig) => Promise<Result<void, Error>>;
    onStart?: () => Promise<Result<void, Error>>;
    onStop?: () => Promise<Result<void, Error>>;
    onDestroy?: () => Promise<Result<void, Error>>;
    onHealth?: () => Promise<Result<HealthStatus, Error>>;
  }
): Integration => {
  let state: IntegrationState = { type: 'uninitialized' };

  return {
    metadata,

    get state(): IntegrationState {
      return state;
    },

    async init(config: IntegrationConfig): Promise<Result<void, Error>> {
      if (state.type !== 'uninitialized') {
        return err(new Error(`Cannot initialize from state: ${state.type}`));
      }

      state = { type: 'initializing' };

      try {
        if (handlers.onInit) {
          const result = await handlers.onInit(config);
          if (isErr(result)) {
            state = { type: 'error', error: result.error };
            return result;
          }
        }

        state = { type: 'initialized' };
        return ok(undefined);
      } catch (error) {
        const err_ = error instanceof Error ? error : new Error(String(error));
        state = { type: 'error', error: err_ };
        return err(err_);
      }
    },

    async start(): Promise<Result<void, Error>> {
      if (state.type !== 'initialized' && state.type !== 'stopped') {
        return err(new Error(`Cannot start from state: ${state.type}`));
      }

      state = { type: 'starting' };

      try {
        if (handlers.onStart) {
          const result = await handlers.onStart();
          if (isErr(result)) {
            state = { type: 'error', error: result.error };
            return result;
          }
        }

        state = { type: 'started' };
        return ok(undefined);
      } catch (error) {
        const err_ = error instanceof Error ? error : new Error(String(error));
        state = { type: 'error', error: err_ };
        return err(err_);
      }
    },

    async stop(): Promise<Result<void, Error>> {
      if (state.type !== 'started') {
        return err(new Error(`Cannot stop from state: ${state.type}`));
      }

      state = { type: 'stopping' };

      try {
        if (handlers.onStop) {
          const result = await handlers.onStop();
          if (isErr(result)) {
            state = { type: 'error', error: result.error };
            return result;
          }
        }

        state = { type: 'stopped' };
        return ok(undefined);
      } catch (error) {
        const err_ = error instanceof Error ? error : new Error(String(error));
        state = { type: 'error', error: err_ };
        return err(err_);
      }
    },

    async destroy(): Promise<Result<void, Error>> {
      try {
        // Stop first if started
        if (state.type === 'started') {
          const stopResult = await this.stop();
          if (isErr(stopResult)) {
            return stopResult;
          }
        }

        if (handlers.onDestroy) {
          const result = await handlers.onDestroy();
          if (isErr(result)) {
            return result;
          }
        }

        state = { type: 'uninitialized' };
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    async health(): Promise<Result<HealthStatus, Error>> {
      if (state.type === 'error') {
        return ok({ status: 'unhealthy', error: state.error });
      }

      if (state.type !== 'started') {
        return ok({ status: 'degraded', reason: `Integration not started (state: ${state.type})` });
      }

      if (handlers.onHealth) {
        return handlers.onHealth();
      }

      return ok({ status: 'healthy' });
    },
  };
};
