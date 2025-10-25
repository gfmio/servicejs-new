/**
 * Option Utility Functions
 *
 * Additional utility functions for working with Option types.
 */

import type { Option } from './types.js';
import { Some, some, none, isSome } from './option.js';

/**
 * Get first Some from array of Options
 *
 * @param options - Array of Options
 * @returns First Some or None if all are None
 *
 * @example
 * ```typescript
 * firstSome([none(), some(42), some(100)]); // Some(42)
 * firstSome([none(), none()]); // None
 * ```
 */
export function firstSome<T>(options: readonly Option<T>[]): Option<T> {
  for (const option of options) {
    if (isSome(option)) {
      return option;
    }
  }
  return none();
}

/**
 * Filter and map in one step (filterMap/compactMap)
 * Apply function that returns Option, collect all Some values
 *
 * @param arr - Array of values
 * @param fn - Function that returns Option
 * @returns Array of unwrapped Some values
 *
 * @example
 * ```typescript
 * const parse = (s: string) => {
 *   const n = parseInt(s);
 *   return isNaN(n) ? none() : some(n);
 * };
 * filterMap(['1', 'abc', '2'], parse); // [1, 2]
 * ```
 */
export function filterMap<T, U>(
  arr: readonly T[],
  fn: (value: T) => Option<U>
): readonly U[] {
  const results: U[] = [];
  for (const item of arr) {
    const option = fn(item);
    if (isSome(option)) {
      results.push((option as Some<U>).value);
    }
  }
  return results;
}

/**
 * Sequence an array of Options into Option of array
 * Returns None if any is None, otherwise Some with array of all values
 *
 * @param options - Array of Options
 * @returns Option containing array of values or None
 *
 * @example
 * ```typescript
 * sequence([some(1), some(2), some(3)]); // Some([1, 2, 3])
 * sequence([some(1), none(), some(3)]); // None
 * ```
 */
export function sequence<T>(options: readonly Option<T>[]): Option<readonly T[]> {
  const values: T[] = [];
  for (const option of options) {
    if (isSome(option)) {
      values.push((option as Some<T>).value);
    } else {
      return none();
    }
  }
  return some(values);
}

/**
 * Map and sequence in one operation (traverse)
 * Apply Option-returning function to each element and collect results
 *
 * @param arr - Array of values
 * @param fn - Function that returns Option
 * @returns Option containing array of values or None if any fails
 *
 * @example
 * ```typescript
 * const validate = (x: number) => x > 0 ? some(x) : none();
 * traverse([1, 2, 3], validate); // Some([1, 2, 3])
 * traverse([1, -2, 3], validate); // None
 * ```
 */
export function traverse<T, U>(
  arr: readonly T[],
  fn: (value: T) => Option<U>
): Option<readonly U[]> {
  return sequence(arr.map(fn));
}

/**
 * Collect all Some values from array of Options
 *
 * @param options - Array of Options
 * @returns Array of Some values
 *
 * @example
 * ```typescript
 * collectSome([some(1), none(), some(2)]); // [1, 2]
 * ```
 */
export function collectSome<T>(options: readonly Option<T>[]): readonly T[] {
  const values: T[] = [];
  for (const option of options) {
    if (isSome(option)) {
      values.push((option as Some<T>).value);
    }
  }
  return values;
}

/**
 * Find first Some that satisfies predicate
 *
 * @param options - Array of Options
 * @param predicate - Predicate function
 * @returns First Some that satisfies predicate or None
 *
 * @example
 * ```typescript
 * findSome([some(1), some(42), some(3)], x => x > 10); // Some(42)
 * ```
 */
export function findSome<T>(
  options: readonly Option<T>[],
  predicate: (value: T) => boolean
): Option<T> {
  for (const option of options) {
    if (isSome(option) && predicate((option as Some<T>).value)) {
      return option;
    }
  }
  return none();
}

/**
 * Lift a value to Option based on predicate
 *
 * @param value - Value to lift
 * @param predicate - Predicate to test value
 * @returns Some if predicate is true, None otherwise
 *
 * @example
 * ```typescript
 * liftPredicate(42, x => x > 0); // Some(42)
 * liftPredicate(-5, x => x > 0); // None
 * ```
 */
export function liftPredicate<T>(
  value: T,
  predicate: (value: T) => boolean
): Option<T> {
  return predicate(value) ? some(value) : none();
}

/**
 * Apply Option-returning function only if condition is true
 *
 * @param condition - Boolean condition
 * @param fn - Function to execute if condition is true
 * @returns Option from function or None
 *
 * @example
 * ```typescript
 * optionWhen(true, () => some(42)); // Some(42)
 * optionWhen(false, () => some(42)); // None
 * ```
 */
export function optionWhen<T>(
  condition: boolean,
  fn: () => Option<T>
): Option<T> {
  return condition ? fn() : none();
}

/**
 * Flatten nested Option (Option<Option<T>> -> Option<T>)
 *
 * @param option - Nested Option
 * @returns Flattened Option
 *
 * @example
 * ```typescript
 * flatten(some(some(42))); // Some(42)
 * flatten(some(none())); // None
 * flatten(none()); // None
 * ```
 */
export function flatten<T>(option: Option<Option<T>>): Option<T> {
  if (isSome(option)) {
    return (option as Some<Option<T>>).value;
  }
  return none();
}

/**
 * Apply a function to value if both Options are Some
 *
 * @param a - First Option
 * @param b - Second Option
 * @param fn - Function to apply
 * @returns Option with result or None if either is None
 *
 * @example
 * ```typescript
 * map2(some(2), some(3), (a, b) => a + b); // Some(5)
 * map2(some(2), none(), (a, b) => a + b); // None
 * ```
 */
export function map2<T, U, V>(
  a: Option<T>,
  b: Option<U>,
  fn: (a: T, b: U) => V
): Option<V> {
  if (isSome(a) && isSome(b)) {
    return some(fn((a as Some<T>).value, (b as Some<U>).value));
  }
  return none();
}

/**
 * Apply a function to value if all three Options are Some
 *
 * @param a - First Option
 * @param b - Second Option
 * @param c - Third Option
 * @param fn - Function to apply
 * @returns Option with result or None if any is None
 */
export function map3<T, U, V, W>(
  a: Option<T>,
  b: Option<U>,
  c: Option<V>,
  fn: (a: T, b: U, c: V) => W
): Option<W> {
  if (isSome(a) && isSome(b) && isSome(c)) {
    return some(fn(
      (a as Some<T>).value,
      (b as Some<U>).value,
      (c as Some<V>).value
    ));
  }
  return none();
}
