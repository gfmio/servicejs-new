import { ok, err, type Result } from '@servicejs/result';
import { some, none, type Option } from '@servicejs/option';
import type {
  Token,
  Registration,
  Factory,
  Scope,
  ResolutionError,
  Resolved,
  DisposeFn,
} from './types.js';

/**
 * Dependency injection container that manages dependency registration and resolution.
 *
 * Features:
 * - Type-safe dependency registration and resolution
 * - Support for transient, singleton, and scoped lifetimes
 * - Automatic dependency graph resolution
 * - Circular dependency detection
 * - Async factory support
 * - Resource cleanup/disposal
 * - Capability-based architecture friendly
 */
export class Container {
  private readonly registrations = new Map<symbol, Registration<any, any>>();
  private readonly singletons = new Map<symbol, any>();
  private readonly scoped = new Map<symbol, any>();
  private readonly disposables: DisposeFn[] = [];
  private resolving = new Set<symbol>();

  /**
   * Register a dependency with its factory function.
   *
   * @param token - Unique token identifying the dependency
   * @param factory - Factory function to create the dependency
   * @param options - Registration options (scope, dependencies)
   * @returns The container for chaining
   *
   * @example
   * ```typescript
   * container.register(
   *   LoggerToken,
   *   () => new ConsoleLogger(),
   *   { scope: 'singleton' }
   * );
   * ```
   */
  register<T, TDeps extends Record<string, any> = {}>(
    token: Token<T>,
    factory: Factory<T, TDeps>,
    options: {
      scope?: Scope;
      dependencies?: Token<any>[];
    } = {}
  ): this {
    const { scope = 'transient', dependencies = [] } = options;

    this.registrations.set(token, {
      token,
      factory,
      scope,
      dependencies,
    });

    return this;
  }

  /**
   * Register a singleton dependency.
   * The factory will be called only once, and the same instance will be returned for all resolutions.
   *
   * @param token - Unique token identifying the dependency
   * @param factory - Factory function to create the dependency
   * @param dependencies - Dependencies required by this factory
   * @returns The container for chaining
   */
  singleton<T, TDeps extends Record<string, any> = {}>(
    token: Token<T>,
    factory: Factory<T, TDeps>,
    dependencies: Token<any>[] = []
  ): this {
    return this.register(token, factory, { scope: 'singleton', dependencies });
  }

  /**
   * Register a transient dependency.
   * The factory will be called every time the dependency is resolved.
   *
   * @param token - Unique token identifying the dependency
   * @param factory - Factory function to create the dependency
   * @param dependencies - Dependencies required by this factory
   * @returns The container for chaining
   */
  transient<T, TDeps extends Record<string, any> = {}>(
    token: Token<T>,
    factory: Factory<T, TDeps>,
    dependencies: Token<any>[] = []
  ): this {
    return this.register(token, factory, { scope: 'transient', dependencies });
  }

  /**
   * Register a scoped dependency.
   * The factory will be called once per scope, and the same instance will be returned within that scope.
   *
   * @param token - Unique token identifying the dependency
   * @param factory - Factory function to create the dependency
   * @param dependencies - Dependencies required by this factory
   * @returns The container for chaining
   */
  scoped<T, TDeps extends Record<string, any> = {}>(
    token: Token<T>,
    factory: Factory<T, TDeps>,
    dependencies: Token<any>[] = []
  ): this {
    return this.register(token, factory, { scope: 'scoped', dependencies });
  }

  /**
   * Register a constant value as a singleton.
   *
   * @param token - Unique token identifying the dependency
   * @param value - The constant value to register
   * @returns The container for chaining
   */
  value<T>(token: Token<T>, value: T): this {
    this.singletons.set(token, value);
    return this.register(token, () => value, { scope: 'singleton' });
  }

  /**
   * Resolve a dependency from the container.
   *
   * @param token - Token identifying the dependency to resolve
   * @returns Result containing the resolved dependency or an error
   *
   * @example
   * ```typescript
   * const result = container.resolve(LoggerToken);
   * if (isOk(result)) {
   *   const logger = result.value;
   *   logger.log('Hello!');
   * }
   * ```
   */
  async resolve<T>(token: Token<T>): Promise<Result<T, ResolutionError>> {
    // Check for circular dependencies
    if (this.resolving.has(token)) {
      return err({
        token,
        message: `Circular dependency detected: ${String(token)}`,
      });
    }

    // Check if registration exists
    const registration = this.registrations.get(token);
    if (!registration) {
      return err({
        token,
        message: `No registration found for token: ${String(token)}`,
      });
    }

    // Check singleton cache
    if (registration.scope === 'singleton' && this.singletons.has(token)) {
      return ok(this.singletons.get(token));
    }

    // Check scoped cache
    if (registration.scope === 'scoped' && this.scoped.has(token)) {
      return ok(this.scoped.get(token));
    }

    // Mark as resolving to detect circular dependencies
    this.resolving.add(token);

    try {
      // Resolve dependencies
      const deps: Record<string, any> = {};
      for (const depToken of registration.dependencies) {
        const depResult = await this.resolve(depToken);
        if (depResult._tag === 'Err') {
          return err({
            token,
            message: `Failed to resolve dependency: ${String(depToken)}`,
            cause: depResult.error,
          });
        }
        deps[String(depToken)] = depResult.value;
      }

      // Call factory
      const instance = await registration.factory(deps);

      // Cache based on scope
      if (registration.scope === 'singleton') {
        this.singletons.set(token, instance);
      } else if (registration.scope === 'scoped') {
        this.scoped.set(token, instance);
      }

      return ok(instance);
    } catch (error) {
      return err({
        token,
        message: `Factory threw an error: ${error}`,
        cause: error,
      });
    } finally {
      this.resolving.delete(token);
    }
  }

  /**
   * Try to resolve a dependency, returning None if not found.
   *
   * @param token - Token identifying the dependency to resolve
   * @returns Option containing the resolved dependency
   */
  async tryResolve<T>(token: Token<T>): Promise<Option<T>> {
    const result = await this.resolve(token);
    if (result._tag === 'Ok') {
      return some(result.value);
    }
    return none();
  }

  /**
   * Check if a token is registered in the container.
   *
   * @param token - Token to check
   * @returns true if the token is registered
   */
  has(token: Token<any>): boolean {
    return this.registrations.has(token);
  }

  /**
   * Create a new scope (child container) that inherits registrations but has its own scoped instances.
   *
   * @returns A new container with scoped lifetime
   */
  createScope(): Container {
    const scope = new Container();

    // Copy all registrations
    for (const [token, registration] of this.registrations) {
      scope.registrations.set(token, registration);
    }

    // Copy singletons (they're shared across scopes)
    for (const [token, instance] of this.singletons) {
      scope.singletons.set(token, instance);
    }

    return scope;
  }

  /**
   * Clear all scoped instances.
   * Useful for cleaning up between requests or operations.
   */
  clearScope(): void {
    this.scoped.clear();
  }

  /**
   * Register a disposable resource for cleanup.
   *
   * @param dispose - Cleanup function to call on disposal
   */
  onDispose(dispose: DisposeFn): void {
    this.disposables.push(dispose);
  }

  /**
   * Dispose all registered resources and clear the container.
   * Should be called when the container is no longer needed.
   */
  async dispose(): Promise<void> {
    // Call all disposal functions
    for (const dispose of this.disposables) {
      await dispose();
    }

    // Clear all caches
    this.singletons.clear();
    this.scoped.clear();
    this.registrations.clear();
    this.disposables.length = 0;
  }
}

/**
 * Create a new dependency injection container.
 *
 * @returns A new container instance
 */
export const createContainer = (): Container => {
  return new Container();
};
