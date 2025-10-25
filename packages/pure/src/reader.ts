/**
 * Reader Monad - Dependency Injection
 *
 * Represents a computation that depends on some shared environment/configuration.
 */

/**
 * Reader - Computation that needs access to an environment
 */
export class Reader<R, A> {
  constructor(private readonly runFn: (env: R) => A) {}

  /**
   * Create a Reader that returns a constant value
   */
  static of<R, A>(value: A): Reader<R, A> {
    return new Reader(() => value);
  }

  /**
   * Create a Reader that returns the environment
   */
  static ask<R>(): Reader<R, R> {
    return new Reader(env => env);
  }

  /**
   * Create a Reader that extracts a value from environment
   */
  static asks<R, A>(fn: (env: R) => A): Reader<R, A> {
    return new Reader(fn);
  }

  /**
   * Map over the result
   */
  map<B>(fn: (value: A) => B): Reader<R, B> {
    return new Reader(env => fn(this.runFn(env)));
  }

  /**
   * FlatMap (chain Reader-returning operations)
   */
  flatMap<B>(fn: (value: A) => Reader<R, B>): Reader<R, B> {
    return new Reader(env => {
      const value = this.runFn(env);
      return fn(value).run(env);
    });
  }

  /**
   * Alias for flatMap
   */
  andThen<B>(fn: (value: A) => Reader<R, B>): Reader<R, B> {
    return this.flatMap(fn);
  }

  /**
   * Apply a Reader-wrapped function
   */
  ap<B>(fn: Reader<R, (value: A) => B>): Reader<R, B> {
    return new Reader(env => {
      const value = this.runFn(env);
      const f = fn.run(env);
      return f(value);
    });
  }

  /**
   * Transform the environment before running
   */
  local<R2>(fn: (env: R2) => R): Reader<R2, A> {
    return new Reader(env => this.runFn(fn(env)));
  }

  /**
   * Run the Reader with an environment
   */
  run(env: R): A {
    return this.runFn(env);
  }
}

/**
 * Create a Reader (convenience function)
 */
export function reader<R, A>(fn: (env: R) => A): Reader<R, A> {
  return Reader.asks(fn);
}

/**
 * Get the environment
 */
export function ask<R>(): Reader<R, R> {
  return Reader.ask();
}

/**
 * Extract a value from environment
 */
export function asks<R, A>(fn: (env: R) => A): Reader<R, A> {
  return Reader.asks(fn);
}
