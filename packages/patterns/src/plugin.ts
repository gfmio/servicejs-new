/**
 * Plugin System
 *
 * Provides extensibility through hooks and plugins.
 * Plugins can intercept and customize framework behavior at key extension points.
 *
 * Key capabilities:
 * - Hook-based architecture
 * - Plugin lifecycle management
 * - Dependency resolution
 * - Priority-based ordering
 *
 * Use cases:
 * - Logging and tracing
 * - Message transformation
 * - Custom error handling
 * - Protocol extensions
 */

import { type Result, ok, err, isErr, isOk } from '@servicejs/result';
import { type Option, some, none } from '@servicejs/option';

// ============================================================================
// Types
// ============================================================================

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin name (unique identifier) */
  readonly name: string;

  /** Plugin version */
  readonly version: string;

  /** Plugin description */
  readonly description?: string;

  /** Plugin author */
  readonly author?: string;

  /** Plugin dependencies (other plugin names) */
  readonly dependencies?: ReadonlyArray<string>;

  /** Plugin priority (higher = earlier execution, default = 0) */
  readonly priority?: number;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginHooks<TContext = unknown> {
  /**
   * Called when plugin is initialized
   */
  onInit?(context: TContext): Promise<Result<void, Error>>;

  /**
   * Called when plugin is destroyed
   */
  onDestroy?(context: TContext): Promise<Result<void, Error>>;

  /**
   * Called before a message is sent
   */
  beforeSend?(context: TContext, message: unknown): Promise<Result<unknown, Error>>;

  /**
   * Called after a message is sent
   */
  afterSend?(context: TContext, message: unknown): Promise<Result<void, Error>>;

  /**
   * Called when an error occurs
   */
  onError?(context: TContext, error: Error): Promise<Result<void, Error>>;

  /**
   * Called before component state update
   */
  beforeUpdate?(context: TContext, oldState: unknown, newState: unknown): Promise<Result<unknown, Error>>;

  /**
   * Called after component state update
   */
  afterUpdate?(context: TContext, oldState: unknown, newState: unknown): Promise<Result<void, Error>>;
}

/**
 * A plugin that extends framework behavior
 */
export interface Plugin<TContext = unknown> {
  /** Plugin metadata */
  readonly metadata: PluginMetadata;

  /** Plugin hooks */
  readonly hooks: PluginHooks<TContext>;
}

/**
 * Plugin registry state
 */
export type PluginState =
  | { readonly type: 'uninitialized' }
  | { readonly type: 'initializing' }
  | { readonly type: 'initialized' }
  | { readonly type: 'destroyed' };

/**
 * Registered plugin with state
 */
export interface RegisteredPlugin<TContext = unknown> {
  /** The plugin */
  readonly plugin: Plugin<TContext>;

  /** Current state */
  state: PluginState;
}

/**
 * Plugin manager for loading and managing plugins
 */
export interface PluginManager<TContext = unknown> {
  /**
   * Register a plugin
   */
  register(plugin: Plugin<TContext>): Result<void, Error>;

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): Result<void, Error>;

  /**
   * Get a registered plugin
   */
  get(pluginName: string): Option<RegisteredPlugin<TContext>>;

  /**
   * Get all registered plugins
   */
  getAll(): ReadonlyArray<RegisteredPlugin<TContext>>;

  /**
   * Initialize all plugins
   */
  initAll(context: TContext): Promise<Result<void, Error>>;

  /**
   * Destroy all plugins
   */
  destroyAll(context: TContext): Promise<Result<void, Error>>;

  /**
   * Call beforeSend hooks
   */
  callBeforeSend(context: TContext, message: unknown): Promise<Result<unknown, Error>>;

  /**
   * Call afterSend hooks
   */
  callAfterSend(context: TContext, message: unknown): Promise<Result<void, Error>>;

  /**
   * Call onError hooks
   */
  callOnError(context: TContext, error: Error): Promise<Result<void, Error>>;

  /**
   * Call beforeUpdate hooks
   */
  callBeforeUpdate(context: TContext, oldState: unknown, newState: unknown): Promise<Result<unknown, Error>>;

  /**
   * Call afterUpdate hooks
   */
  callAfterUpdate(context: TContext, oldState: unknown, newState: unknown): Promise<Result<void, Error>>;
}

// ============================================================================
// Plugin Manager Implementation
// ============================================================================

/**
 * Create a plugin manager
 *
 * @example
 * ```typescript
 * const manager = createPluginManager<MyContext>();
 *
 * // Register plugins
 * manager.register({
 *   metadata: {
 *     name: 'logger',
 *     version: '1.0.0',
 *     description: 'Logs all messages'
 *   },
 *   hooks: {
 *     beforeSend: async (ctx, msg) => {
 *       console.log('Sending:', msg);
 *       return ok(msg);
 *     }
 *   }
 * });
 *
 * // Initialize plugins
 * await manager.initAll(context);
 *
 * // Call hooks
 * const result = await manager.callBeforeSend(context, message);
 * ```
 */
export const createPluginManager = <TContext = unknown>(): PluginManager<TContext> => {
  const plugins = new Map<string, RegisteredPlugin<TContext>>();

  /**
   * Sort plugins by priority and dependencies
   */
  const sortPlugins = (): ReadonlyArray<RegisteredPlugin<TContext>> => {
    const sorted: Array<RegisteredPlugin<TContext>> = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (plugin: RegisteredPlugin<TContext>): void => {
      if (visited.has(plugin.plugin.metadata.name)) {
        return;
      }

      if (visiting.has(plugin.plugin.metadata.name)) {
        throw new Error(
          `Circular dependency detected involving plugin: ${plugin.plugin.metadata.name}`
        );
      }

      visiting.add(plugin.plugin.metadata.name);

      // Visit dependencies first
      const deps = plugin.plugin.metadata.dependencies || [];
      for (const depName of deps) {
        const depPlugin = plugins.get(depName);
        if (depPlugin) {
          visit(depPlugin);
        }
      }

      visiting.delete(plugin.plugin.metadata.name);
      visited.add(plugin.plugin.metadata.name);
      sorted.push(plugin);
    };

    // Visit all plugins
    for (const plugin of plugins.values()) {
      visit(plugin);
    }

    // Sort by priority (higher priority first)
    sorted.sort((a, b) => {
      const priorityA = a.plugin.metadata.priority || 0;
      const priorityB = b.plugin.metadata.priority || 0;
      return priorityB - priorityA;
    });

    return sorted;
  };

  return {
    register(plugin: Plugin<TContext>): Result<void, Error> {
      // Check if already registered
      if (plugins.has(plugin.metadata.name)) {
        return err(new Error(`Plugin already registered: ${plugin.metadata.name}`));
      }

      // Check dependencies exist
      const deps = plugin.metadata.dependencies || [];
      for (const depName of deps) {
        if (!plugins.has(depName)) {
          return err(
            new Error(
              `Plugin ${plugin.metadata.name} depends on ${depName}, which is not registered`
            )
          );
        }
      }

      // Register plugin
      plugins.set(plugin.metadata.name, {
        plugin,
        state: { type: 'uninitialized' },
      });

      return ok(undefined);
    },

    unregister(pluginName: string): Result<void, Error> {
      const registered = plugins.get(pluginName);
      if (!registered) {
        return err(new Error(`Plugin not found: ${pluginName}`));
      }

      // Check if any other plugins depend on this one
      for (const other of plugins.values()) {
        const deps = other.plugin.metadata.dependencies || [];
        if (deps.includes(pluginName)) {
          return err(
            new Error(
              `Cannot unregister ${pluginName}: plugin ${other.plugin.metadata.name} depends on it`
            )
          );
        }
      }

      plugins.delete(pluginName);
      return ok(undefined);
    },

    get(pluginName: string): Option<RegisteredPlugin<TContext>> {
      const plugin = plugins.get(pluginName);
      return plugin ? some(plugin) : none();
    },

    getAll(): ReadonlyArray<RegisteredPlugin<TContext>> {
      return Array.from(plugins.values());
    },

    async initAll(context: TContext): Promise<Result<void, Error>> {
      try {
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'uninitialized') {
            continue;
          }

          registered.state = { type: 'initializing' };

          if (registered.plugin.hooks.onInit) {
            const result = await registered.plugin.hooks.onInit(context);
            if (isErr(result)) {
              return err(
                new Error(
                  `Failed to initialize plugin ${registered.plugin.metadata.name}: ${result.error.message}`
                )
              );
            }
          }

          registered.state = { type: 'initialized' };
        }

        return ok(undefined);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    async destroyAll(context: TContext): Promise<Result<void, Error>> {
      try {
        // Destroy in reverse order
        const sorted = Array.from(sortPlugins()).reverse();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.onDestroy) {
            const result = await registered.plugin.hooks.onDestroy(context);
            if (isErr(result)) {
              const errorMessage = result.error instanceof Error ? result.error.message : String(result.error);
              return err(
                new Error(
                  `Failed to destroy plugin ${registered.plugin.metadata.name}: ${errorMessage}`
                )
              );
            }
          }

          registered.state = { type: 'destroyed' };
        }

        return ok(undefined);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    async callBeforeSend(context: TContext, message: unknown): Promise<Result<unknown, Error>> {
      try {
        let currentMessage = message;
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.beforeSend) {
            const result = await registered.plugin.hooks.beforeSend(context, currentMessage);
            if (isErr(result)) {
              return result;
            }
            if (!isOk(result)) {
              throw new Error('Unexpected: result should be Ok');
            }
            currentMessage = result.value;
          }
        }

        return ok(currentMessage);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    async callAfterSend(context: TContext, message: unknown): Promise<Result<void, Error>> {
      try {
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.afterSend) {
            const result = await registered.plugin.hooks.afterSend(context, message);
            if (isErr(result)) {
              return result;
            }
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    async callOnError(context: TContext, error: Error): Promise<Result<void, Error>> {
      try {
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.onError) {
            const result = await registered.plugin.hooks.onError(context, error);
            if (isErr(result)) {
              return result;
            }
          }
        }

        return ok(undefined);
      } catch (error_) {
        return err(
          error_ instanceof Error ? error_ : new Error(String(error_))
        );
      }
    },

    async callBeforeUpdate(
      context: TContext,
      oldState: unknown,
      newState: unknown
    ): Promise<Result<unknown, Error>> {
      try {
        let currentNewState = newState;
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.beforeUpdate) {
            const result = await registered.plugin.hooks.beforeUpdate(
              context,
              oldState,
              currentNewState
            );
            if (isErr(result)) {
              return result;
            }
            if (!isOk(result)) {
              throw new Error('Unexpected: result should be Ok');
            }
            currentNewState = result.value;
          }
        }

        return ok(currentNewState);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },

    async callAfterUpdate(
      context: TContext,
      oldState: unknown,
      newState: unknown
    ): Promise<Result<void, Error>> {
      try {
        const sorted = sortPlugins();

        for (const registered of sorted) {
          if (registered.state.type !== 'initialized') {
            continue;
          }

          if (registered.plugin.hooks.afterUpdate) {
            const result = await registered.plugin.hooks.afterUpdate(
              context,
              oldState,
              newState
            );
            if (isErr(result)) {
              return result;
            }
          }
        }

        return ok(undefined);
      } catch (error) {
        return err(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    },
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple plugin
 *
 * @example
 * ```typescript
 * const loggerPlugin = createPlugin(
 *   {
 *     name: 'logger',
 *     version: '1.0.0',
 *     description: 'Logs all messages'
 *   },
 *   {
 *     beforeSend: async (ctx, msg) => {
 *       console.log('Sending:', msg);
 *       return ok(msg);
 *     }
 *   }
 * );
 * ```
 */
export const createPlugin = <TContext = unknown>(
  metadata: PluginMetadata,
  hooks: PluginHooks<TContext>
): Plugin<TContext> => ({
  metadata,
  hooks,
});

/**
 * Validate plugin dependencies
 *
 * Checks if all dependencies are satisfied before initialization.
 */
export const validatePluginDependencies = (
  plugins: ReadonlyArray<Plugin>
): Result<void, Error> => {
  const pluginNames = new Set(plugins.map((p) => p.metadata.name));

  for (const plugin of plugins) {
    const deps = plugin.metadata.dependencies || [];
    for (const dep of deps) {
      if (!pluginNames.has(dep)) {
        return err(
          new Error(
            `Plugin ${plugin.metadata.name} has unsatisfied dependency: ${dep}`
          )
        );
      }
    }
  }

  return ok(undefined);
};
