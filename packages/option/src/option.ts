/**
 * Option Runtime Implementation
 *
 * Runtime functions for working with Option types.
 */

import type { Option } from './types.js';

// Re-export classes and constructors
export { Some, None, some, none } from './classes.js';
import { Some, None, some, none } from './classes.js';

/**
 * Create Option from nullable value
 */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value == null ? none() : some(value);
}

/**
 * Check if Option is Some
 */
export function isSome<T>(option: Option<T>): option is Some<T> {
  return option._tag === 'Some';
}

/**
 * Check if Option is None
 */
export function isNone<T>(option: Option<T>): option is None {
  return option._tag === 'None';
}

/**
 * Map the value if present
 */
export function map<T, U>(
  option: Option<T>,
  fn: (value: T) => U
): Option<U> {
  if (isSome(option)) {
    return some(fn((option as Some<T>).value));
  }
  return option as Option<U>;
}

/**
 * Chain Option-returning operations (flatMap)
 */
export function andThen<T, U>(
  option: Option<T>,
  fn: (value: T) => Option<U>
): Option<U> {
  if (isSome(option)) {
    return fn((option as Some<T>).value);
  }
  return option as Option<U>;
}

/**
 * Provide alternative Option if None
 */
export function or<T>(option: Option<T>, alternative: Option<T>): Option<T> {
  if (isSome(option)) {
    return option;
  }
  return alternative;
}

/**
 * Lazily provide alternative Option if None
 */
export function orElse<T>(
  option: Option<T>,
  fn: () => Option<T>
): Option<T> {
  if (isSome(option)) {
    return option;
  }
  return fn();
}

/**
 * Keep value only if predicate is true
 */
export function filter<T>(
  option: Option<T>,
  predicate: (value: T) => boolean
): Option<T> {
  if (isSome(option) && predicate((option as Some<T>).value)) {
    return option;
  }
  return none();
}

/**
 * Extract value or throw
 */
export function unwrap<T>(option: Option<T>): T {
  if (isSome(option)) {
    return (option as Some<T>).value;
  }
  throw new Error('Called unwrap on a None value');
}

/**
 * Extract value or return default
 */
export function unwrapOr<T>(option: Option<T>, defaultValue: T): T {
  if (isSome(option)) {
    return (option as Some<T>).value;
  }
  return defaultValue;
}

/**
 * Extract value or compute default lazily
 */
export function unwrapOrElse<T>(option: Option<T>, fn: () => T): T {
  if (isSome(option)) {
    return (option as Some<T>).value;
  }
  return fn();
}

/**
 * Convert Option to nullable value
 */
export function toNullable<T>(option: Option<T>): T | null {
  if (isSome(option)) {
    return (option as Some<T>).value;
  }
  return null;
}

/**
 * Convert Option to undefined
 */
export function toUndefined<T>(option: Option<T>): T | undefined {
  if (isSome(option)) {
    return (option as Some<T>).value;
  }
  return undefined;
}

/**
 * Pattern match on Option
 */
export function match<T, U>(
  option: Option<T>,
  handlers: {
    onSome: (value: T) => U;
    onNone: () => U;
  }
): U {
  if (isSome(option)) {
    return handlers.onSome((option as Some<T>).value);
  }
  return handlers.onNone();
}

/**
 * Combine multiple Options into a single Option
 * Returns Some with array of values if all are Some, otherwise None
 */
export function all<T>(options: readonly Option<T>[]): Option<readonly T[]> {
  const values: T[] = [];
  for (const option of options) {
    if (isNone(option)) {
      return none();
    }
    values.push((option as Some<T>).value);
  }
  return some(values);
}

/**
 * Return the first Some option, or None if all are None
 */
export function any<T>(options: readonly Option<T>[]): Option<T> {
  for (const option of options) {
    if (isSome(option)) {
      return option;
    }
  }
  return none();
}

/**
 * Zip two Options into a tuple
 */
export function zip<T, U>(
  a: Option<T>,
  b: Option<U>
): Option<readonly [T, U]> {
  if (isSome(a) && isSome(b)) {
    return some([a.value, b.value] as const);
  }
  return none();
}

/**
 * Zip two Options with a combining function
 */
export function zipWith<T, U, V>(
  a: Option<T>,
  b: Option<U>,
  fn: (x: T, y: U) => V
): Option<V> {
  if (isSome(a) && isSome(b)) {
    return some(fn(a.value, b.value));
  }
  return none();
}
