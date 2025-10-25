/**
 * Validation Runtime Implementation
 *
 * Runtime functions for working with Validation types.
 */

import type { Validation } from './types.js';

// Re-export classes and constructors
export { Success, Failure, success, failure, failures } from './classes.js';
import { Success, Failure, success, failure, failures } from './classes.js';

/**
 * Check if Validation is Success
 */
export function isSuccess<E, T>(validation: Validation<E, T>): validation is Success<T> {
  return validation._tag === 'Success';
}

/**
 * Check if Validation is Failure
 */
export function isFailure<E, T>(validation: Validation<E, T>): validation is Failure<E> {
  return validation._tag === 'Failure';
}

/**
 * Map the Success value
 */
export function map<E, T, U>(
  validation: Validation<E, T>,
  fn: (value: T) => U
): Validation<E, U> {
  if (isSuccess(validation)) {
    return success(fn((validation as Success<T>).value));
  }
  return validation as Validation<E, U>;
}

/**
 * Map the error values
 */
export function mapError<E, T, F>(
  validation: Validation<E, T>,
  fn: (error: E) => F
): Validation<F, T> {
  if (isFailure(validation)) {
    return failures((validation as Failure<E>).errors.map(fn));
  }
  return validation as Validation<F, T>;
}

/**
 * Chain Validation-returning operations
 */
export function andThen<E, T, U>(
  validation: Validation<E, T>,
  fn: (value: T) => Validation<E, U>
): Validation<E, U> {
  if (isSuccess(validation)) {
    return fn((validation as Success<T>).value);
  }
  return validation as Validation<E, U>;
}

/**
 * Recover from Failure
 */
export function orElse<E, T, F>(
  validation: Validation<E, T>,
  fn: (errors: readonly E[]) => Validation<F, T>
): Validation<F, T> {
  if (isFailure(validation)) {
    return fn((validation as Failure<E>).errors);
  }
  return validation as Validation<F, T>;
}

/**
 * Fold Validation into a single value
 */
export function fold<E, T, U>(
  validation: Validation<E, T>,
  onFailure: (errors: readonly E[]) => U,
  onSuccess: (value: T) => U
): U {
  if (isFailure(validation)) {
    return onFailure((validation as Failure<E>).errors);
  }
  return onSuccess((validation as Success<T>).value);
}

/**
 * Extract Success value or return default
 */
export function getOrElse<E, T>(validation: Validation<E, T>, defaultValue: T): T {
  if (isSuccess(validation)) {
    return (validation as Success<T>).value;
  }
  return defaultValue;
}

/**
 * Extract Success value or compute default
 */
export function getOrElseWith<E, T>(
  validation: Validation<E, T>,
  fn: (errors: readonly E[]) => T
): T {
  if (isSuccess(validation)) {
    return (validation as Success<T>).value;
  }
  return fn((validation as Failure<E>).errors);
}

/**
 * Combine multiple Validations, accumulating all errors
 * Returns Success with array of values if all are Success,
 * otherwise Failure with all accumulated errors
 */
export function all<E, T>(
  validations: readonly Validation<E, T>[]
): Validation<E, readonly T[]> {
  const values: T[] = [];
  const errors: E[] = [];

  for (const validation of validations) {
    if (isSuccess(validation)) {
      values.push((validation as Success<T>).value);
    } else {
      errors.push(...(validation as Failure<E>).errors);
    }
  }

  if (errors.length > 0) {
    return failures(errors);
  }
  return success(values);
}

/**
 * Validate a value with a predicate
 */
export function fromPredicate<E, T>(
  value: T,
  predicate: (value: T) => boolean,
  error: E
): Validation<E, T> {
  return predicate(value) ? success(value) : failure(error);
}

/**
 * Validate a value with multiple predicates, accumulating errors
 */
export function fromPredicates<E, T>(
  value: T,
  validators: readonly [(value: T) => boolean, E][]
): Validation<E, T> {
  const errors: E[] = [];

  for (const [predicate, error] of validators) {
    if (!predicate(value)) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    return failures(errors);
  }
  return success(value);
}

/**
 * Try to execute a function and catch errors
 */
export function tryCatch<E, T>(
  fn: () => T,
  onError: (error: unknown) => E
): Validation<E, T> {
  try {
    return success(fn());
  } catch (error) {
    return failure(onError(error));
  }
}

/**
 * Partition Validations into Successes and Failures
 */
export function partition<E, T>(
  validations: readonly Validation<E, T>[]
): readonly [readonly E[][], readonly T[]] {
  const errorArrays: E[][] = [];
  const values: T[] = [];

  for (const validation of validations) {
    if (isSuccess(validation)) {
      values.push((validation as Success<T>).value);
    } else {
      errorArrays.push([...(validation as Failure<E>).errors]);
    }
  }

  return [errorArrays, values] as const;
}

/**
 * Map and validate an array, accumulating all errors
 */
export function traverse<E, T, U>(
  arr: readonly T[],
  fn: (value: T) => Validation<E, U>
): Validation<E, readonly U[]> {
  return all(arr.map(fn));
}

/**
 * Sequence an array of Validations
 */
export function sequence<E, T>(
  validations: readonly Validation<E, T>[]
): Validation<E, readonly T[]> {
  return all(validations);
}
