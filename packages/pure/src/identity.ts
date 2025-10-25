/**
 * Identity Monad
 *
 * A simple wrapper for pure functional transformations and method chaining.
 * The Identity monad is the simplest monad - it just wraps a value and
 * allows you to chain operations on it.
 *
 * @example
 * ```typescript
 * import { Identity } from '@servicejs/pure';
 *
 * // Create and transform values
 * const result = Identity.of(42)
 *   .map(x => x * 2)
 *   .map(x => x + 10)
 *   .unwrap(); // 94
 *
 * // Chain computations
 * const result2 = Identity.of(10)
 *   .andThen(x => Identity.of(x * 2))
 *   .andThen(x => Identity.of(x.toString()))
 *   .unwrap(); // "20"
 * ```
 */

/**
 * Identity class - wraps a value for pure functional transformations
 */
export class Identity<T> {
  /**
   * Create an Identity wrapping a value
   *
   * @param value - The value to wrap
   */
  constructor(readonly value: T) {}

  /**
   * Create an Identity (alternative constructor)
   *
   * @param value - The value to wrap
   * @returns Identity wrapping the value
   */
  static of<T>(value: T): Identity<T> {
    return new Identity(value);
  }

  /**
   * Transform the wrapped value
   *
   * @param fn - Function to apply to the value
   * @returns New Identity with transformed value
   */
  map<U>(fn: (value: T) => U): Identity<U> {
    return new Identity(fn(this.value));
  }

  /**
   * Chain Identity-returning operations (flatMap)
   *
   * @param fn - Function that returns an Identity
   * @returns The resulting Identity
   */
  andThen<U>(fn: (value: T) => Identity<U>): Identity<U> {
    return fn(this.value);
  }

  /**
   * Alias for andThen (standard monad method name)
   */
  flatMap<U>(fn: (value: T) => Identity<U>): Identity<U> {
    return this.andThen(fn);
  }

  /**
   * Alias for andThen (common functional name)
   */
  chain<U>(fn: (value: T) => Identity<U>): Identity<U> {
    return this.andThen(fn);
  }

  /**
   * Apply a function wrapped in an Identity to this value
   *
   * @param fn - Identity wrapping a function
   * @returns New Identity with function applied
   */
  ap<U>(fn: Identity<(value: T) => U>): Identity<U> {
    return new Identity(fn.value(this.value));
  }

  /**
   * Extract the wrapped value
   *
   * @returns The wrapped value
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Alias for unwrap (common functional name)
   */
  extract(): T {
    return this.value;
  }

  /**
   * Execute a side effect without changing the value
   *
   * @param fn - Side effect function
   * @returns This Identity (for chaining)
   */
  tap(fn: (value: T) => void): Identity<T> {
    fn(this.value);
    return this;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Identity(${JSON.stringify(this.value)})`;
  }

  /**
   * Convert to JSON representation
   */
  toJSON(): T {
    return this.value;
  }
}

/**
 * Create an Identity wrapping a value (convenience function)
 *
 * @param value - The value to wrap
 * @returns Identity wrapping the value
 */
export function of<T>(value: T): Identity<T> {
  return new Identity(value);
}

/**
 * Alias using "pure" name (emphasizes pure computation)
 */
export const pure = of;

/**
 * Shorter alias for Identity class
 */
export { Identity as Id };
