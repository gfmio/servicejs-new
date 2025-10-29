/**
 * AsyncResult - Promise wrapper for Result types
 *
 * Provides a convenient way to work with async Results without needing
 * to manually catch errors. AsyncResult<T, E> wraps Promise<Result<T, E>>
 * and provides combinators that work directly on the async Result.
 */

import type { Result } from './types.js';
import { ok, err, isOk, isErr } from './result.js';
import { some, none, type Option } from '@servicejs/option';

/**
 * AsyncResult - A Promise wrapper for Result types
 *
 * AsyncResult<T, E> wraps a Promise<Result<T, E>> and provides convenient
 * methods for chaining operations without needing to catch errors manually.
 *
 * Key features:
 * - **Awaitable**: Implements PromiseLike, can be used with `await`
 * - **Chainable**: Map, andThen, etc. work directly on async Results
 * - **Safe**: Automatically catches unexpected errors and converts to Result
 * - **Type-safe**: Full TypeScript inference
 *
 * @example
 * ```typescript
 * // Create from a Promise
 * const result = AsyncResult.from(
 *   fetch('/api/user').then(r => r.json()),
 *   error => new FetchError(String(error))
 * );
 *
 * // Chain operations
 * const name = await result
 *   .map(user => user.name)
 *   .mapErr(err => `Failed: ${err.message}`);
 *
 * // Use with pattern matching
 * const user = await result;
 * if (isOk(user)) {
 *   console.log(user.value);
 * }
 * ```
 */
export class AsyncResult<T, E> implements PromiseLike<Result<T, E>> {
  /**
   * @internal
   * The underlying Promise<Result<T, E>>
   */
  private readonly promise: Promise<Result<T, E>>;

  /**
   * Create an AsyncResult from a Promise<Result<T, E>>
   *
   * @param promise - Promise that resolves to a Result
   */
  constructor(promise: Promise<Result<T, E>>) {
    this.promise = promise;
  }

  /**
   * Make AsyncResult awaitable (implements PromiseLike)
   *
   * This allows AsyncResult to be used with `await` directly:
   * ```typescript
   * const result: Result<T, E> = await asyncResult;
   * ```
   */
  then<TResult1 = Result<T, E>, TResult2 = never>(
    onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  /**
   * Transform the Ok value
   *
   * If the Result is Ok, applies the function to the value.
   * If the Result is Err, passes the error through unchanged.
   *
   * @param fn - Function to transform the Ok value
   * @returns AsyncResult with transformed value
   *
   * @example
   * ```typescript
   * const doubled = asyncResult.map(x => x * 2);
   * ```
   */
  map<U>(fn: (value: T) => U): AsyncResult<U, E> {
    return new AsyncResult(
      this.promise.then(result => {
        if (isOk(result)) {
          return ok(fn(result.value));
        }
        return result as Result<U, E>;
      })
    );
  }

  /**
   * Transform the Err value
   *
   * If the Result is Err, applies the function to the error.
   * If the Result is Ok, passes the value through unchanged.
   *
   * @param fn - Function to transform the Err value
   * @returns AsyncResult with transformed error
   *
   * @example
   * ```typescript
   * const betterError = asyncResult.mapErr(e => `Error: ${e}`);
   * ```
   */
  mapErr<F>(fn: (error: E) => F): AsyncResult<T, F> {
    return new AsyncResult(
      this.promise.then(result => {
        if (isErr(result)) {
          return err(fn(result.error));
        }
        return result as Result<T, F>;
      })
    );
  }

  /**
   * Chain Result-returning operations (flatMap)
   *
   * If the Result is Ok, applies the function and returns its Result.
   * If the Result is Err, passes the error through unchanged.
   *
   * @param fn - Function that returns an AsyncResult or Result
   * @returns AsyncResult from the function
   *
   * @example
   * ```typescript
   * const result = asyncResult.andThen(user =>
   *   validateUser(user) // returns AsyncResult
   * );
   * ```
   */
  andThen<U>(fn: (value: T) => AsyncResult<U, E> | Result<U, E>): AsyncResult<U, E> {
    return new AsyncResult(
      this.promise.then(async result => {
        if (isOk(result)) {
          const next = fn(result.value);
          return next instanceof AsyncResult ? await next : next;
        }
        return result as Result<U, E>;
      })
    );
  }

  /**
   * Recover from Err with Result-returning function
   *
   * If the Result is Err, applies the function and returns its Result.
   * If the Result is Ok, passes the value through unchanged.
   *
   * @param fn - Function that returns an AsyncResult or Result
   * @returns AsyncResult from the function
   *
   * @example
   * ```typescript
   * const recovered = asyncResult.orElse(error =>
   *   ok(defaultValue) // fallback value
   * );
   * ```
   */
  orElse<F>(fn: (error: E) => AsyncResult<T, F> | Result<T, F>): AsyncResult<T, F> {
    return new AsyncResult(
      this.promise.then(async result => {
        if (isErr(result)) {
          const next = fn(result.error);
          return next instanceof AsyncResult ? await next : next;
        }
        return result as Result<T, F>;
      })
    );
  }

  /**
   * Extract the Ok value or throw
   *
   * @returns Promise that resolves to the value if Ok
   * @throws Error if the Result is Err
   *
   * @example
   * ```typescript
   * const value = await asyncResult.unwrap(); // throws if Err
   * ```
   */
  async unwrap(): Promise<T> {
    const result = await this.promise;
    if (isOk(result)) {
      return result.value;
    }
    // isErr(result) is true here
    throw new Error(`Called unwrap on an Err value: ${JSON.stringify((result as any).error)}`);
  }

  /**
   * Extract the Ok value or return a default
   *
   * @param defaultValue - Value to return if Result is Err
   * @returns Promise that resolves to the value or default
   *
   * @example
   * ```typescript
   * const value = await asyncResult.unwrapOr(42);
   * ```
   */
  async unwrapOr(defaultValue: T): Promise<T> {
    const result = await this.promise;
    return isOk(result) ? result.value : defaultValue;
  }

  /**
   * Extract the Ok value or compute a default
   *
   * @param fn - Function to compute default from error
   * @returns Promise that resolves to the value or computed default
   *
   * @example
   * ```typescript
   * const value = await asyncResult.unwrapOrElse(error => {
   *   console.error(error);
   *   return 42;
   * });
   * ```
   */
  async unwrapOrElse(fn: (error: E) => T): Promise<T> {
    const result = await this.promise;
    if (isOk(result)) {
      return result.value;
    }
    return fn((result as any).error);
  }

  /**
   * Extract the Err value or throw
   *
   * @returns Promise that resolves to the error if Err
   * @throws Error if the Result is Ok
   *
   * @example
   * ```typescript
   * const error = await asyncResult.unwrapErr(); // throws if Ok
   * ```
   */
  async unwrapErr(): Promise<E> {
    const result = await this.promise;
    if (isErr(result)) {
      return result.error;
    }
    // isOk(result) is true here
    throw new Error(`Called unwrapErr on an Ok value: ${JSON.stringify((result as any).value)}`);
  }

  /**
   * Check if the Result is Ok
   *
   * @returns Promise that resolves to true if Ok, false if Err
   *
   * @example
   * ```typescript
   * if (await asyncResult.isOk()) {
   *   console.log('Success!');
   * }
   * ```
   */
  async isOk(): Promise<boolean> {
    const result = await this.promise;
    return isOk(result);
  }

  /**
   * Check if the Result is Err
   *
   * @returns Promise that resolves to true if Err, false if Ok
   *
   * @example
   * ```typescript
   * if (await asyncResult.isErr()) {
   *   console.log('Failed!');
   * }
   * ```
   */
  async isErr(): Promise<boolean> {
    const result = await this.promise;
    return isErr(result);
  }

  /**
   * Pattern match on the Result
   *
   * @param handlers - Object with onOk and onErr handlers
   * @returns Promise that resolves to the result of the matching handler
   *
   * @example
   * ```typescript
   * const message = await asyncResult.match({
   *   onOk: value => `Success: ${value}`,
   *   onErr: error => `Error: ${error}`,
   * });
   * ```
   */
  async match<U>(handlers: {
    onOk: (value: T) => U;
    onErr: (error: E) => U;
  }): Promise<U> {
    const result = await this.promise;
    if (isOk(result)) {
      return handlers.onOk(result.value);
    }
    return handlers.onErr((result as any).error);
  }

  /**
   * Convert to Option (Ok -> Some, Err -> None)
   *
   * @returns Promise that resolves to Some if Ok, None if Err
   *
   * @example
   * ```typescript
   * const option = await asyncResult.toOption();
   * ```
   */
  async toOption(): Promise<Option<T>> {
    const result = await this.promise;
    return isOk(result) ? some(result.value) : none();
  }

  // ============================================================================
  // Static Factory Methods
  // ============================================================================

  /**
   * Create AsyncResult from a Promise that might throw
   *
   * Catches any errors thrown by the Promise and converts them to Err.
   * This is the primary way to create AsyncResult from async operations.
   *
   * @param promise - Promise that might throw
   * @param mapError - Optional function to transform caught errors
   * @returns AsyncResult that never throws
   *
   * @example
   * ```typescript
   * const result = AsyncResult.from(
   *   fetch('/api/user').then(r => r.json()),
   *   error => new FetchError(String(error))
   * );
   * ```
   */
  static from<T, E = unknown>(
    promise: Promise<T>,
    mapError?: (error: unknown) => E
  ): AsyncResult<T, E> {
    return new AsyncResult(
      promise
        .then(value => ok(value) as Result<T, E>)
        .catch(error => err(mapError ? mapError(error) : (error as E)))
    );
  }

  /**
   * Create AsyncResult from a Result
   *
   * Wraps a synchronous Result in a Promise.
   *
   * @param result - Result to wrap
   * @returns AsyncResult that resolves immediately
   *
   * @example
   * ```typescript
   * const asyncResult = AsyncResult.fromResult(ok(42));
   * ```
   */
  static fromResult<T, E>(result: Result<T, E>): AsyncResult<T, E> {
    return new AsyncResult(Promise.resolve(result));
  }

  /**
   * Create AsyncResult from Ok value
   *
   * @param value - Value to wrap in Ok
   * @returns AsyncResult that resolves to Ok(value)
   *
   * @example
   * ```typescript
   * const asyncResult = AsyncResult.ok(42);
   * ```
   */
  static ok<T, E = never>(value: T): AsyncResult<T, E> {
    return new AsyncResult(Promise.resolve(ok(value)));
  }

  /**
   * Create AsyncResult from Err value
   *
   * @param error - Error to wrap in Err
   * @returns AsyncResult that resolves to Err(error)
   *
   * @example
   * ```typescript
   * const asyncResult = AsyncResult.err('something went wrong');
   * ```
   */
  static err<T = never, E = unknown>(error: E): AsyncResult<T, E> {
    return new AsyncResult(Promise.resolve(err(error)));
  }

  /**
   * Combine multiple AsyncResults into a single AsyncResult
   *
   * Returns Ok with array of values if all are Ok, otherwise first Err.
   *
   * @param results - Array of AsyncResults to combine
   * @returns AsyncResult with array of values or first error
   *
   * @example
   * ```typescript
   * const combined = AsyncResult.all([
   *   AsyncResult.ok(1),
   *   AsyncResult.ok(2),
   *   AsyncResult.ok(3),
   * ]);
   * // Result: Ok([1, 2, 3])
   * ```
   */
  static all<T, E>(results: readonly AsyncResult<T, E>[]): AsyncResult<readonly T[], E> {
    return new AsyncResult(
      Promise.all(results.map(r => r.promise)).then(resolvedResults => {
        const values: T[] = [];
        for (const result of resolvedResults) {
          if (isOk(result)) {
            values.push(result.value);
          } else {
            return result as Result<readonly T[], E>;
          }
        }
        return ok(values as readonly T[]);
      })
    );
  }

  /**
   * Race multiple AsyncResults, returning the first to complete
   *
   * @param results - Array of AsyncResults to race
   * @returns AsyncResult that resolves to the first completed result
   *
   * @example
   * ```typescript
   * const fastest = AsyncResult.race([
   *   AsyncResult.from(slowFetch()),
   *   AsyncResult.from(fastFetch()),
   * ]);
   * ```
   */
  static race<T, E>(results: readonly AsyncResult<T, E>[]): AsyncResult<T, E> {
    return new AsyncResult(
      Promise.race(results.map(r => r.promise))
    );
  }
}
