/**
 * Result Runtime Implementation
 *
 * Runtime functions for working with Result types.
 */

import type { Result, Ok as OkType, Err as ErrType } from './types.js';
import { some, none, type Option } from '@servicejs/option';

/**
 * Ok class - represents a successful result
 */
export class Ok<T> implements OkType<T> {
  readonly _tag = 'Ok' as const;

  constructor(readonly value: T) {}

  /**
   * Map the Ok value
   */
  map<U>(fn: (value: T) => U): Result<U, never> {
    return new Ok(fn(this.value));
  }

  /**
   * Map the Err value (no-op for Ok)
   */
  mapErr<F>(_fn: (error: never) => F): Result<T, F> {
    return this as any;
  }

  /**
   * Chain Result-returning operations
   */
  andThen<E, U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  /**
   * Recover from Err (no-op for Ok)
   */
  orElse<F>(_fn: (error: never) => Result<T, F>): Result<T, F> {
    return this as any;
  }

  /**
   * Extract the value
   */
  unwrap(): T {
    return this.value;
  }

  /**
   * Extract the value or return default (returns value)
   */
  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  /**
   * Extract the value or compute default (returns value)
   */
  unwrapOrElse(_fn: (error: never) => T): T {
    return this.value;
  }

  /**
   * Extract error (throws for Ok)
   */
  unwrapErr(): never {
    throw new Error(`Called unwrapErr on an Ok value: ${JSON.stringify(this.value)}`);
  }

  /**
   * Check if this is Ok
   */
  isOk(): this is Ok<T> {
    return true;
  }

  /**
   * Check if this is Err
   */
  isErr(): this is never {
    return false;
  }

  /**
   * Pattern match on Result
   */
  match<U>(handlers: { onOk: (value: T) => U; onErr: (error: never) => U }): U {
    return handlers.onOk(this.value);
  }

  /**
   * Convert to Option
   */
  toOption(): Option<T> {
    return some(this.value);
  }
}

/**
 * Err class - represents a failed result
 */
export class Err<E> implements ErrType<E> {
  readonly _tag = 'Err' as const;

  constructor(readonly error: E) {}

  /**
   * Map the Ok value (no-op for Err)
   */
  map<U>(_fn: (value: never) => U): Result<U, E> {
    return this as any;
  }

  /**
   * Map the Err value
   */
  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    return new Err(fn(this.error));
  }

  /**
   * Chain Result-returning operations (no-op for Err)
   */
  andThen<U>(_fn: (value: never) => Result<U, E>): Result<U, E> {
    return this as any;
  }

  /**
   * Recover from Err
   */
  orElse<T, F>(fn: (error: E) => Result<T, F>): Result<T, F> {
    return fn(this.error);
  }

  /**
   * Extract value (throws for Err)
   */
  unwrap(): never {
    throw new Error(`Called unwrap on an Err value: ${JSON.stringify(this.error)}`);
  }

  /**
   * Extract value or return default
   */
  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  /**
   * Extract value or compute default
   */
  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error);
  }

  /**
   * Extract the error
   */
  unwrapErr(): E {
    return this.error;
  }

  /**
   * Check if this is Ok
   */
  isOk(): this is never {
    return false;
  }

  /**
   * Check if this is Err
   */
  isErr(): this is Err<E> {
    return true;
  }

  /**
   * Pattern match on Result
   */
  match<T, U>(handlers: { onOk: (value: T) => U; onErr: (error: E) => U }): U {
    return handlers.onErr(this.error);
  }

  /**
   * Convert to Option (returns None for Err)
   */
  toOption(): Option<never> {
    return none();
  }
}

/**
 * Create an Ok Result
 */
export function ok<T>(value: T): Ok<T> {
  return new Ok(value);
}

/**
 * Create an Err Result
 */
export function err<E>(error: E): Err<E> {
  return new Err(error);
}

/**
 * Check if Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result._tag === 'Ok';
}

/**
 * Check if Result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result._tag === 'Err';
}

/**
 * Map the Ok value
 */
export function map<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result as Result<U, E>;
}

/**
 * Map the Err value
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result as Result<T, F>;
}

/**
 * Chain Result-returning operations (flatMap)
 */
export function andThen<T, E, U>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result as Result<U, E>;
}

/**
 * Recover from Err with Result-returning function
 */
export function orElse<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> {
  if (isErr(result)) {
    return fn(result.error);
  }
  return result as Result<T, F>;
}

/**
 * Extract value or throw error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Called unwrap on an Err value: ${JSON.stringify((result as Err<E>).error)}`);
}

/**
 * Extract value or return default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Extract value or compute default lazily
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn((result as Err<E>).error);
}

/**
 * Extract error or throw
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error(`Called unwrapErr on an Ok value: ${JSON.stringify((result as Ok<T>).value)}`);
}

/**
 * Pattern match on Result
 */
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: {
    onOk: (value: T) => U;
    onErr: (error: E) => U;
  }
): U {
  if (isOk(result)) {
    return handlers.onOk(result.value);
  }
  return handlers.onErr((result as Err<E>).error);
}

/**
 * Convert Result to Option (Ok -> Some, Err -> None)
 */
export function toOption<T, E>(result: Result<T, E>): Option<T> {
  if (isOk(result)) {
    return some(result.value);
  }
  return none();
}

/**
 * Combine multiple Results into a single Result
 * Returns Ok with array of values if all are Ok, otherwise first Err
 */
export function all<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push((result as Ok<T>).value);
  }
  return ok(values);
}

/**
 * Try to execute a function and catch errors
 */
export function tryCatch<T, E = unknown>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(onError(error));
  }
}

/**
 * Try to execute an async function and catch errors
 */
export async function tryCatchAsync<T, E = unknown>(
  fn: () => Promise<T>,
  onError: (error: unknown) => E
): Promise<Result<T, E>> {
  try {
    return ok(await fn());
  } catch (error) {
    return err(onError(error));
  }
}
