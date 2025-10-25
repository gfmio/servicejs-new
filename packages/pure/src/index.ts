/**
 * @servicejs/pure
 *
 * Pure function utilities with HKT foundation for ServiceJS.
 *
 * This package provides functional programming utilities:
 * - Identity monad for pure functional transformations
 * - Function composition (pipe, compose)
 * - Classic combinators (identity, constant, curry, etc.)
 * - Predicate utilities
 * - HKT foundation for type-level operations
 *
 * @example
 * ```typescript
 * import { pipe, Identity } from '@servicejs/pure';
 *
 * // Identity monad for chaining
 * const result = Identity.of(42)
 *   .map(x => x * 2)
 *   .map(x => x + 10)
 *   .unwrap(); // 94
 *
 * // Function composition
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const fn = pipe(addOne, double);
 * fn(5); // 12
 * ```
 */

export type {
  PureFunction,
  UnaryFn,
  BinaryFn,
  TernaryFn,
  Predicate,
  Comparator,
  Mapper,
  PipeHKTF,
  ComposeHKTF,
} from './types.js';

export { pipe, compose } from './compose.js';

export { Identity, Id, of, pure } from './identity.js';

export {
  identity,
  constant,
  noop,
  flip,
  curry,
  uncurry,
  partial,
  partialRight,
  not,
  and,
  or,
  once,
  memoize,
  tap,
  apply,
  applyTo,
} from './combinators.js';

export {
  alwaysTrue,
  alwaysFalse,
  isNullish,
  isNotNullish,
  isDefined,
  isUndefined,
  equals,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  between,
  isEmpty,
  isNotEmpty,
  matches,
  startsWith,
  endsWith,
  contains,
  isEmptyArray,
  isNotEmptyArray,
  includes,
  isInstanceOf,
  hasProperty,
} from './predicates.js';
