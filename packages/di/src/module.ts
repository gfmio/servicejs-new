import type { Container } from './container.js';
import type { Token } from './types.js';

/**
 * A module groups related dependency registrations together.
 * Modules can be composed to build up complex applications.
 */
export interface Module {
  /**
   * Register the module's dependencies in the container.
   *
   * @param container - The container to register dependencies in
   */
  register(container: Container): void | Promise<void>;

  /**
   * Optional module metadata
   */
  readonly name?: string;
  readonly description?: string;
  readonly dependencies?: Module[];
}

/**
 * Creates a module from a registration function.
 *
 * @param register - Function that registers dependencies
 * @param metadata - Optional module metadata
 * @returns A module object
 *
 * @example
 * ```typescript
 * const loggingModule = createModule((container) => {
 *   container.singleton(LoggerToken, () => new ConsoleLogger());
 *   container.singleton(MetricsToken, (deps) => new Metrics(deps.logger));
 * }, {
 *   name: 'Logging',
 *   description: 'Provides logging and metrics'
 * });
 * ```
 */
export const createModule = (
  register: (container: Container) => void | Promise<void>,
  metadata?: {
    name?: string;
    description?: string;
    dependencies?: Module[];
  }
): Module => {
  return {
    register,
    ...metadata,
  };
};

/**
 * Composes multiple modules into a single module.
 *
 * @param modules - Modules to compose
 * @param metadata - Optional metadata for the composed module
 * @returns A composed module
 *
 * @example
 * ```typescript
 * const appModule = composeModules(
 *   [loggingModule, databaseModule, apiModule],
 *   { name: 'Application' }
 * );
 * ```
 */
export const composeModules = (
  modules: Module[],
  metadata?: {
    name?: string;
    description?: string;
  }
): Module => {
  return {
    register: async (container) => {
      for (const module of modules) {
        // Register dependencies of the module first
        if (module.dependencies) {
          for (const dep of module.dependencies) {
            await dep.register(container);
          }
        }
        await module.register(container);
      }
    },
    dependencies: modules,
    ...metadata,
  };
};

/**
 * Builder pattern for creating modules with a fluent API.
 */
export class ModuleBuilder {
  private registrations: Array<(container: Container) => void | Promise<void>> = [];
  private moduleName?: string;
  private moduleDescription?: string;
  private moduleDeps: Module[] = [];

  /**
   * Set the module name.
   */
  name(name: string): this {
    this.moduleName = name;
    return this;
  }

  /**
   * Set the module description.
   */
  description(description: string): this {
    this.moduleDescription = description;
    return this;
  }

  /**
   * Add a dependency module.
   */
  dependsOn(module: Module): this {
    this.moduleDeps.push(module);
    return this;
  }

  /**
   * Register a singleton.
   */
  singleton<T>(
    token: Token<T>,
    factory: (deps: any) => T | Promise<T>,
    deps: Token<any>[] = []
  ): this {
    this.registrations.push((container) => {
      container.singleton(token, factory, deps);
    });
    return this;
  }

  /**
   * Register a transient.
   */
  transient<T>(
    token: Token<T>,
    factory: (deps: any) => T | Promise<T>,
    deps: Token<any>[] = []
  ): this {
    this.registrations.push((container) => {
      container.transient(token, factory, deps);
    });
    return this;
  }

  /**
   * Register a value.
   */
  value<T>(token: Token<T>, value: T): this {
    this.registrations.push((container) => {
      container.value(token, value);
    });
    return this;
  }

  /**
   * Add a custom registration function.
   */
  configure(fn: (container: Container) => void | Promise<void>): this {
    this.registrations.push(fn);
    return this;
  }

  /**
   * Build the module.
   */
  build(): Module {
    return createModule(
      async (container) => {
        for (const register of this.registrations) {
          await register(container);
        }
      },
      {
        ...(this.moduleName ? { name: this.moduleName } : {}),
        ...(this.moduleDescription ? { description: this.moduleDescription } : {}),
        dependencies: this.moduleDeps,
      }
    );
  }
}

/**
 * Creates a new module builder.
 *
 * @returns A module builder instance
 *
 * @example
 * ```typescript
 * const module = moduleBuilder()
 *   .name('MyModule')
 *   .singleton(LoggerToken, () => new Logger())
 *   .singleton(DbToken, (deps) => new Database(deps.logger), [LoggerToken])
 *   .build();
 * ```
 */
export const moduleBuilder = (): ModuleBuilder => {
  return new ModuleBuilder();
};
