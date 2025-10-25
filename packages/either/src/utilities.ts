/**
 * Either Utility Functions
 *
 * Additional utility functions for working with Either types.
 */

import type { Either } from './types.js';
import { Left, Right, left, right, isRight } from './either.js';

/**
 * Collect all Right values, ignoring Lefts
 *
 * @param eithers - Array of Eithers
 * @returns Array of Right values
 *
 * @example
 * ```typescript
 * rights([right(1), left('error'), right(2)]); // [1, 2]
 * ```
 */
export function rights<L, R>(eithers: readonly Either<L, R>[]): readonly R[] {
  const values: R[] = [];
  for (const either of eithers) {
    if (isRight(either)) {
      values.push((either as Right<R>).right);
    }
  }
  return values;
}

/**
 * Collect all Left values, ignoring Rights
 *
 * @param eithers - Array of Eithers
 * @returns Array of Left values
 *
 * @example
 * ```typescript
 * lefts([right(1), left('error1'), left('error2')]); // ['error1', 'error2']
 * ```
 */
export function lefts<L, R>(eithers: readonly Either<L, R>[]): readonly L[] {
  const errors: L[] = [];
  for (const either of eithers) {
    if (!isRight(either)) {
      errors.push((either as Left<L>).left);
    }
  }
  return errors;
}

/**
 * Partition array using Either-returning function
 *
 * @param arr - Array of values
 * @param fn - Function that returns Either
 * @returns Tuple of [lefts, rights]
 *
 * @example
 * ```typescript
 * const validate = (x: number) => x > 0 ? right(x) : left('negative');
 * partitionMap([1, -2, 3, -4], validate); // [['negative', 'negative'], [1, 3]]
 * ```
 */
export function partitionMap<T, L, R>(
  arr: readonly T[],
  fn: (value: T) => Either<L, R>
): readonly [readonly L[], readonly R[]] {
  const eithers = arr.map(fn);
  return [lefts(eithers), rights(eithers)];
}

/**
 * Sequence an array of Eithers
 * Returns Left with first error, or Right with array of all Rights
 *
 * @param eithers - Array of Eithers
 * @returns Either containing array of Rights or first Left
 *
 * @example
 * ```typescript
 * sequence([right(1), right(2), right(3)]); // Right([1, 2, 3])
 * sequence([right(1), left('error'), right(3)]); // Left('error')
 * ```
 */
export function sequence<L, R>(
  eithers: readonly Either<L, R>[]
): Either<L, readonly R[]> {
  const values: R[] = [];
  for (const either of eithers) {
    if (isRight(either)) {
      values.push((either as Right<R>).right);
    } else {
      return either as Either<L, readonly R[]>;
    }
  }
  return right(values);
}

/**
 * Map and sequence in one operation (traverse)
 *
 * @param arr - Array of values
 * @param fn - Function that returns Either
 * @returns Either containing array of Rights or first Left
 *
 * @example
 * ```typescript
 * const validate = (x: number) => x > 0 ? right(x) : left('negative');
 * traverse([1, 2, 3], validate); // Right([1, 2, 3])
 * traverse([1, -2, 3], validate); // Left('negative')
 * ```
 */
export function traverse<T, L, R>(
  arr: readonly T[],
  fn: (value: T) => Either<L, R>
): Either<L, readonly R[]> {
  return sequence(arr.map(fn));
}

/**
 * Find first Right in array of Eithers
 *
 * @param eithers - Array of Eithers
 * @returns First Right or last Left if all are Left
 *
 * @example
 * ```typescript
 * firstRight([left('e1'), right(42), right(100)]); // Right(42)
 * firstRight([left('e1'), left('e2')]); // Left('e2')
 * ```
 */
export function firstRight<L, R>(eithers: readonly Either<L, R>[]): Either<L, R> {
  for (const either of eithers) {
    if (isRight(either)) {
      return either;
    }
  }
  return eithers[eithers.length - 1] || left(undefined as L);
}

/**
 * Apply Either-returning function if condition is true
 *
 * @param condition - Boolean condition
 * @param fn - Function to execute if condition is true
 * @param leftValue - Left value to return if condition is false
 * @returns Either from function or Left with leftValue
 *
 * @example
 * ```typescript
 * eitherWhen(true, () => right(42), 'disabled'); // Right(42)
 * eitherWhen(false, () => right(42), 'disabled'); // Left('disabled')
 * ```
 */
export function eitherWhen<L, R>(
  condition: boolean,
  fn: () => Either<L, R>,
  leftValue: L
): Either<L, R> {
  return condition ? fn() : left(leftValue);
}

/**
 * Combine two Eithers with a function
 *
 * @param a - First Either
 * @param b - Second Either
 * @param fn - Function to combine Right values
 * @returns Either with combined value or first Left
 *
 * @example
 * ```typescript
 * map2(right(2), right(3), (a, b) => a + b); // Right(5)
 * map2(left('error'), right(3), (a, b) => a + b); // Left('error')
 * ```
 */
export function map2<L, R1, R2, R3>(
  a: Either<L, R1>,
  b: Either<L, R2>,
  fn: (a: R1, b: R2) => R3
): Either<L, R3> {
  if (isRight(a) && isRight(b)) {
    return right(fn((a as Right<R1>).right, (b as Right<R2>).right));
  }
  return (isRight(a) ? b : a) as Either<L, R3>;
}
