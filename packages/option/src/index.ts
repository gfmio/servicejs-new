/**
 * @servicejs/option
 *
 * Option type with HKT foundation for ServiceJS.
 *
 * This package provides null-safe programming without null/undefined:
 * - Option<T>: Either Some(value) or None
 * - HKT foundation for type-level operations
 * - Comprehensive runtime helpers
 *
 * @example
 * ```typescript
 * import { some, none, map, andThen, unwrapOr } from '@servicejs/option';
 *
 * // Create Options
 * const present = some(42);
 * const absent = none();
 *
 * // Transform values
 * const doubled = map(present, x => x * 2); // Some(84)
 *
 * // Chain operations
 * const result = andThen(present, x =>
 *   x > 0 ? some(x) : none()
 * );
 *
 * // Extract values safely
 * const value = unwrapOr(result, 0);
 * ```
 */

export type { Option, OptionHKTO, ValueType } from './types.js';

export {
  Some,
  None,
  some,
  none,
  fromNullable,
  isSome,
  isNone,
  map,
  andThen,
  or,
  orElse,
  filter,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  toNullable,
  toUndefined,
  match,
  all,
  any,
  zip,
  zipWith,
} from './option.js';

export {
  firstSome,
  filterMap,
  sequence,
  traverse,
  collectSome,
  findSome,
  liftPredicate,
  optionWhen,
  flatten,
  map2,
  map3,
} from './utilities.js';
