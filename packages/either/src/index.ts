/**
 * @servicejs/either
 *
 * Either type with HKT foundation for ServiceJS.
 *
 * This package provides a general-purpose sum type for two mutually exclusive values:
 * - Either<L, R>: Left(value) or Right(value)
 * - By convention, Right is the "success" path and Left is the "error" path
 * - HKT foundation for type-level operations
 * - Comprehensive runtime helpers
 *
 * @example
 * ```typescript
 * import { left, right, map, andThen, match } from '@servicejs/either';
 *
 * // Create Eithers
 * const success = right(42);
 * const failure = left('error');
 *
 * // Transform Right values
 * const doubled = map(success, x => x * 2); // Right(84)
 *
 * // Chain operations
 * const result = andThen(success, x =>
 *   x > 0 ? right(x) : left('negative')
 * );
 *
 * // Pattern match
 * const message = match(result, {
 *   onLeft: error => `Error: ${error}`,
 *   onRight: value => `Value: ${value}`,
 * });
 * ```
 */

export type { Either, EitherHKTO, LeftType, RightType } from './types.js';

export {
  Left,
  Right,
  left,
  right,
  isLeft,
  isRight,
  map,
  mapLeft,
  biMap,
  andThen,
  orElse,
  swap,
  unwrapRight,
  unwrapLeft,
  getOrElse,
  getOrElseWith,
  match,
  toTuple,
  fromNullable,
  fromPredicate,
  tryCatch,
  tryCatchAsync,
  all,
  partition,
} from './either.js';

export {
  rights,
  lefts,
  partitionMap,
  sequence,
  traverse,
  firstRight,
  eitherWhen,
  map2,
} from './utilities.js';
