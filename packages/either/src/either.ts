/**
 * Either Runtime Implementation
 *
 * Runtime functions for working with Either types.
 */

import type { Either } from './types.js';

// Re-export classes and constructors
export { Left, Right, left, right } from './classes.js';
import { Left, Right, left, right } from './classes.js';

/**
 * Check if Either is Left
 */
export function isLeft<L, R>(either: Either<L, R>): either is Left<L> {
  return either._tag === 'Left';
}

/**
 * Check if Either is Right
 */
export function isRight<L, R>(either: Either<L, R>): either is Right<R> {
  return either._tag === 'Right';
}

/**
 * Map the Right value
 */
export function map<L, R, U>(
  either: Either<L, R>,
  fn: (value: R) => U
): Either<L, U> {
  if (isRight(either)) {
    return right(fn((either as Right<R>).right));
  }
  return either as Either<L, U>;
}

/**
 * Map the Left value
 */
export function mapLeft<L, R, M>(
  either: Either<L, R>,
  fn: (value: L) => M
): Either<M, R> {
  if (isLeft(either)) {
    return left(fn((either as Left<L>).left));
  }
  return either as Either<M, R>;
}

/**
 * Map both Left and Right values
 */
export function biMap<L, R, M, U>(
  either: Either<L, R>,
  leftFn: (value: L) => M,
  rightFn: (value: R) => U
): Either<M, U> {
  if (isLeft(either)) {
    return left(leftFn((either as Left<L>).left));
  }
  return right(rightFn((either as Right<R>).right));
}

/**
 * Chain Either-returning operations on Right (flatMap)
 */
export function andThen<L, R, U>(
  either: Either<L, R>,
  fn: (value: R) => Either<L, U>
): Either<L, U> {
  if (isRight(either)) {
    return fn((either as Right<R>).right);
  }
  return either as Either<L, U>;
}

/**
 * Chain Either-returning operations on Left
 */
export function orElse<L, R, M>(
  either: Either<L, R>,
  fn: (value: L) => Either<M, R>
): Either<M, R> {
  if (isLeft(either)) {
    return fn((either as Left<L>).left);
  }
  return either as Either<M, R>;
}

/**
 * Swap Left and Right
 */
export function swap<L, R>(either: Either<L, R>): Either<R, L> {
  if (isLeft(either)) {
    return right((either as Left<L>).left);
  }
  return left((either as Right<R>).right);
}

/**
 * Extract Right value or throw
 */
export function unwrapRight<L, R>(either: Either<L, R>): R {
  if (isRight(either)) {
    return (either as Right<R>).right;
  }
  throw new Error(`Called unwrapRight on a Left value: ${JSON.stringify((either as Left<L>).left)}`);
}

/**
 * Extract Left value or throw
 */
export function unwrapLeft<L, R>(either: Either<L, R>): L {
  if (isLeft(either)) {
    return (either as Left<L>).left;
  }
  throw new Error(`Called unwrapLeft on a Right value: ${JSON.stringify((either as Right<R>).right)}`);
}

/**
 * Extract Right value or return default
 */
export function getOrElse<L, R>(either: Either<L, R>, defaultValue: R): R {
  if (isRight(either)) {
    return (either as Right<R>).right;
  }
  return defaultValue;
}

/**
 * Extract Right value or compute default lazily
 */
export function getOrElseWith<L, R>(
  either: Either<L, R>,
  fn: (left: L) => R
): R {
  if (isRight(either)) {
    return (either as Right<R>).right;
  }
  return fn((either as Left<L>).left);
}

/**
 * Pattern match on Either
 */
export function match<L, R, U>(
  either: Either<L, R>,
  handlers: {
    onLeft: (value: L) => U;
    onRight: (value: R) => U;
  }
): U {
  if (isLeft(either)) {
    return handlers.onLeft((either as Left<L>).left);
  }
  return handlers.onRight((either as Right<R>).right);
}

/**
 * Convert Either to tuple
 */
export function toTuple<L, R>(
  either: Either<L, R>
): readonly [L | null, R | null] {
  if (isLeft(either)) {
    return [(either as Left<L>).left, null];
  }
  return [null, (either as Right<R>).right];
}

/**
 * Create Either from nullable value
 */
export function fromNullable<L, R>(
  value: R | null | undefined,
  leftValue: L
): Either<L, R> {
  return value == null ? left(leftValue) : right(value);
}

/**
 * Create Either from predicate
 */
export function fromPredicate<L, R>(
  value: R,
  predicate: (value: R) => boolean,
  leftValue: L
): Either<L, R> {
  return predicate(value) ? right(value) : left(leftValue);
}

/**
 * Try to execute a function and catch errors
 */
export function tryCatch<L, R>(
  fn: () => R,
  onError: (error: unknown) => L
): Either<L, R> {
  try {
    return right(fn());
  } catch (error) {
    return left(onError(error));
  }
}

/**
 * Try to execute an async function and catch errors
 */
export async function tryCatchAsync<L, R>(
  fn: () => Promise<R>,
  onError: (error: unknown) => L
): Promise<Either<L, R>> {
  try {
    return right(await fn());
  } catch (error) {
    return left(onError(error));
  }
}

/**
 * Combine multiple Eithers into a single Either
 * Returns Left with first error, or Right with array of all Right values
 */
export function all<L, R>(
  eithers: readonly Either<L, R>[]
): Either<L, readonly R[]> {
  const rights: R[] = [];
  for (const either of eithers) {
    if (isLeft(either)) {
      return either;
    }
    rights.push((either as Right<R>).right);
  }
  return right(rights);
}

/**
 * Partition an array of Eithers into Lefts and Rights
 */
export function partition<L, R>(
  eithers: readonly Either<L, R>[]
): readonly [readonly L[], readonly R[]] {
  const lefts: L[] = [];
  const rights: R[] = [];
  for (const either of eithers) {
    if (isLeft(either)) {
      lefts.push((either as Left<L>).left);
    } else {
      rights.push((either as Right<R>).right);
    }
  }
  return [lefts, rights] as const;
}
