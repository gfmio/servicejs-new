/**
 * Adapter utilities for easily creating small adapters between ports and implementations.
 *
 * In ports-and-adapters (hexagonal) architecture, adapters translate between:
 * - Core domain interfaces (ports)
 * - External implementations (adapters)
 *
 * These utilities make creating adapters as simple as possible.
 */

/**
 * Creates a simple adapter that maps one interface to another.
 *
 * @param from - The implementation to adapt from
 * @param mapping - Function that maps the source to the target interface
 * @returns The adapted interface
 *
 * @example
 * ```typescript
 * interface Logger {
 *   log(message: string): void;
 * }
 *
 * interface Console {
 *   info(msg: string): void;
 * }
 *
 * const logger = adapt<Console, Logger>(console, (c) => ({
 *   log: (message) => c.info(message),
 * }));
 * ```
 */
export const adapt = <TFrom, TTo>(
  from: TFrom,
  mapping: (source: TFrom) => TTo
): TTo => {
  return mapping(from);
};

/**
 * Creates an adapter that wraps an implementation with additional behavior.
 *
 * @param implementation - The base implementation
 * @param wrapper - Function that wraps the implementation
 * @returns The wrapped implementation
 *
 * @example
 * ```typescript
 * const loggedLogger = wrap(logger, (base) => ({
 *   log: (message) => {
 *     console.log(`[${new Date().toISOString()}]`);
 *     base.log(message);
 *   },
 * }));
 * ```
 */
export const wrap = <T>(implementation: T, wrapper: (base: T) => T): T => {
  return wrapper(implementation);
};

/**
 * Creates an adapter that delegates specific methods to different implementations.
 *
 * @param delegates - Record of method names to their implementations
 * @returns The composite implementation
 *
 * @example
 * ```typescript
 * interface Storage {
 *   get(key: string): string | undefined;
 *   set(key: string, value: string): void;
 * }
 *
 * const storage = composite<Storage>({
 *   get: (key) => localStorage.getItem(key) ?? undefined,
 *   set: (key, value) => localStorage.setItem(key, value),
 * });
 * ```
 */
export const composite = <T extends Record<string, any>>(
  delegates: T
): T => {
  return delegates;
};

/**
 * Creates a method adapter that transforms method arguments and/or return values.
 *
 * @param method - The original method
 * @param transform - Transformation configuration
 * @returns The adapted method
 *
 * @example
 * ```typescript
 * const uppercaseLog = adaptMethod(
 *   logger.log,
 *   {
 *     input: (message: string) => [message.toUpperCase()],
 *   }
 * );
 * ```
 */
export const adaptMethod = <TArgs extends any[], TReturn, TNewArgs extends any[], TNewReturn>(
  method: (...args: TArgs) => TReturn,
  transform: {
    input?: (...args: TNewArgs) => TArgs;
    output?: (result: TReturn) => TNewReturn;
  }
): (...args: TNewArgs) => TNewReturn => {
  return (...args: TNewArgs) => {
    const transformedArgs = transform.input ? transform.input(...args) : (args as unknown as TArgs);
    const result = method(...transformedArgs);
    return transform.output ? transform.output(result) : (result as unknown as TNewReturn);
  };
};

/**
 * Creates an async adapter that converts sync methods to async.
 *
 * @param implementation - Sync implementation
 * @param mapping - Function that maps sync to async interface
 * @returns Async implementation
 *
 * @example
 * ```typescript
 * interface SyncStorage {
 *   get(key: string): string | undefined;
 * }
 *
 * interface AsyncStorage {
 *   get(key: string): Promise<string | undefined>;
 * }
 *
 * const asyncStorage = asyncAdapter<SyncStorage, AsyncStorage>(
 *   syncStorage,
 *   (sync) => ({
 *     get: async (key) => sync.get(key),
 *   })
 * );
 * ```
 */
export const asyncAdapter = <TFrom, TTo>(
  from: TFrom,
  mapping: (source: TFrom) => TTo
): TTo => {
  return mapping(from);
};

/**
 * Creates a capability adapter that mediates access through a capability object.
 * This is the primary pattern for ServiceJS - components interact through capabilities, not direct references.
 *
 * @param implementation - The actual implementation
 * @param createCapability - Function that creates a capability for the implementation
 * @returns The capability object
 *
 * @example
 * ```typescript
 * interface LoggerCapability {
 *   send(message: { type: 'log'; text: string }): void;
 * }
 *
 * const loggerCapability = capabilityAdapter(
 *   logger,
 *   (impl) => ({
 *     send: (msg) => {
 *       if (msg.type === 'log') {
 *         impl.log(msg.text);
 *       }
 *     },
 *   })
 * );
 * ```
 */
export const capabilityAdapter = <TImpl, TCapability>(
  implementation: TImpl,
  createCapability: (impl: TImpl) => TCapability
): TCapability => {
  return createCapability(implementation);
};

/**
 * Creates a lazy adapter that only initializes the implementation when first used.
 *
 * @param factory - Function that creates the implementation
 * @param methods - Methods to expose on the lazy proxy
 * @returns Lazy proxy that initializes on first use
 *
 * @example
 * ```typescript
 * const lazyLogger = lazy(
 *   () => new ExpensiveLogger(),
 *   ['log', 'error', 'warn']
 * );
 * ```
 */
export const lazy = <T extends Record<string, any>>(
  factory: () => T,
  methods: (keyof T)[]
): T => {
  let instance: T | null = null;

  const getInstance = (): T => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };

  const proxy: any = {};
  for (const method of methods) {
    proxy[method] = (...args: any[]) => {
      const impl = getInstance();
      return (impl[method] as any)(...args);
    };
  }

  return proxy as T;
};

/**
 * Creates a memoized adapter that caches method results.
 *
 * @param implementation - The implementation to memoize
 * @param methods - Methods to memoize (by first argument)
 * @returns Memoized implementation
 *
 * @example
 * ```typescript
 * const memoizedFetcher = memoize(
 *   fetcher,
 *   ['fetch']
 * );
 * ```
 */
export const memoize = <T extends Record<string, any>>(
  implementation: T,
  methods: (keyof T)[]
): T => {
  const caches = new Map<string | symbol, Map<any, any>>();

  const proxy: any = { ...implementation };

  for (const method of methods) {
    const cache = new Map<any, any>();
    caches.set(method, cache);

    const original = implementation[method];
    proxy[method] = (arg: any, ...rest: any[]) => {
      if (cache.has(arg)) {
        return cache.get(arg);
      }
      const result = original.call(implementation, arg, ...rest);
      cache.set(arg, result);
      return result;
    };
  }

  return proxy as T;
};
