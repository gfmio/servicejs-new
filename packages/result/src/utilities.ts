/**
 * Result Utility Functions
 *
 * Additional utility functions for working with Result types.
 */

import type { Result } from './types.js';
import { Ok, Err, ok, err, isOk } from './result.js';

/**
 * Lift a function that throws into a Result-returning function
 *
 * @param fn - Function that may throw
 * @returns Function that returns Result instead of throwing
 *
 * @example
 * ```typescript
 * const parseJSON = fromThrowable(JSON.parse);
 * const result = parseJSON('{"a":1}'); // Ok({a: 1})
 * const error = parseJSON('{invalid}'); // Err(Error)
 * ```
 */
export function fromThrowable<Args extends readonly any[], T>(
  fn: (...args: Args) => T
): (...args: Args) => Result<T, Error> {
  return (...args: Args) => {
    try {
      return ok(fn(...args));
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Sequence an array of Results into a Result of array
 * Returns Err with first error, or Ok with array of all values
 *
 * @param results - Array of Results
 * @returns Result containing array of values or first error
 *
 * @example
 * ```typescript
 * sequence([ok(1), ok(2), ok(3)]); // Ok([1, 2, 3])
 * sequence([ok(1), err('error'), ok(3)]); // Err('error')
 * ```
 */
export function sequence<T, E>(
  results: readonly Result<T, E>[]
): Result<readonly T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (isOk(result)) {
      values.push((result as Ok<T>).value);
    } else {
      return result as Result<readonly T[], E>;
    }
  }
  return ok(values);
}

/**
 * Map and sequence in one operation (traverse)
 * Apply a Result-returning function to each element and collect results
 *
 * @param arr - Array of values
 * @param fn - Function that returns Result
 * @returns Result containing array of values or first error
 *
 * @example
 * ```typescript
 * const validate = (x: number) => x > 0 ? ok(x) : err('negative');
 * traverse([1, 2, 3], validate); // Ok([1, 2, 3])
 * traverse([1, -2, 3], validate); // Err('negative')
 * ```
 */
export function traverse<T, U, E>(
  arr: readonly T[],
  fn: (value: T) => Result<U, E>
): Result<readonly U[], E> {
  return sequence(arr.map(fn));
}

/**
 * Collect all Ok values, ignoring Errs
 *
 * @param results - Array of Results
 * @returns Array of Ok values
 *
 * @example
 * ```typescript
 * collectOk([ok(1), err('error'), ok(2)]); // [1, 2]
 * ```
 */
export function collectOk<T, E>(results: readonly Result<T, E>[]): readonly T[] {
  const values: T[] = [];
  for (const result of results) {
    if (isOk(result)) {
      values.push((result as Ok<T>).value);
    }
  }
  return values;
}

/**
 * Collect all Err values, ignoring Oks
 *
 * @param results - Array of Results
 * @returns Array of Err values
 *
 * @example
 * ```typescript
 * collectErr([ok(1), err('error1'), err('error2')]); // ['error1', 'error2']
 * ```
 */
export function collectErr<T, E>(results: readonly Result<T, E>[]): readonly E[] {
  const errors: E[] = [];
  for (const result of results) {
    if (!isOk(result)) {
      errors.push((result as Err<E>).error);
    }
  }
  return errors;
}

/**
 * Find first Ok in array of Results
 *
 * @param results - Array of Results
 * @returns First Ok result or last Err if all are Err
 *
 * @example
 * ```typescript
 * firstOk([err('e1'), ok(42), ok(100)]); // Ok(42)
 * firstOk([err('e1'), err('e2')]); // Err('e2')
 * ```
 */
export function firstOk<T, E>(results: readonly Result<T, E>[]): Result<T, E> {
  for (const result of results) {
    if (isOk(result)) {
      return result;
    }
  }
  return results[results.length - 1] || err(undefined as E);
}

/**
 * Combine multiple Results using a combining function
 * Short-circuits on first Err
 *
 * @param results - Array of Results
 * @param fn - Function to combine Ok values
 * @returns Result with combined value or first error
 *
 * @example
 * ```typescript
 * combine([ok(1), ok(2), ok(3)], (values) => values.reduce((a, b) => a + b, 0)); // Ok(6)
 * ```
 */
export function combine<T, E, U>(
  results: readonly Result<T, E>[],
  fn: (values: readonly T[]) => U
): Result<U, E> {
  const seq = sequence(results);
  if (isOk(seq)) {
    return ok(fn((seq as Ok<readonly T[]>).value));
  }
  return seq as Result<U, E>;
}

/**
 * Apply a Result-returning function if condition is true
 *
 * @param condition - Boolean condition
 * @param fn - Function to execute if condition is true
 * @param defaultValue - Value to return if condition is false
 * @returns Result from function or Ok with default value
 *
 * @example
 * ```typescript
 * resultWhen(true, () => ok(42), 0); // Ok(42)
 * resultWhen(false, () => ok(42), 0); // Ok(0)
 * ```
 */
export function resultWhen<T, E>(
  condition: boolean,
  fn: () => Result<T, E>,
  defaultValue: T
): Result<T, E> {
  return condition ? fn() : ok(defaultValue);
}

/**
 * Convert a Result to nullable (Ok -> value, Err -> null)
 *
 * @param result - Result to convert
 * @returns Value if Ok, null if Err
 *
 * @example
 * ```typescript
 * toNullable(ok(42)); // 42
 * toNullable(err('error')); // null
 * ```
 */
export function toNullable<T, E>(result: Result<T, E>): T | null {
  return isOk(result) ? (result as Ok<T>).value : null;
}

/**
 * Convert a Result to undefined (Ok -> value, Err -> undefined)
 *
 * @param result - Result to convert
 * @returns Value if Ok, undefined if Err
 *
 * @example
 * ```typescript
 * toUndefined(ok(42)); // 42
 * toUndefined(err('error')); // undefined
 * ```
 */
export function toUndefined<T, E>(result: Result<T, E>): T | undefined {
  return isOk(result) ? (result as Ok<T>).value : undefined;
}
