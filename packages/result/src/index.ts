/**
 * @servicejs/result
 *
 * Rust-style Result type with HKT foundation for ServiceJS.
 *
 * This package provides type-safe error handling without exceptions:
 * - Result<T, E>: Either Ok(value) or Err(error)
 * - HKT foundation for type-level operations
 * - Comprehensive runtime helpers
 *
 * @example
 * ```typescript
 * import { ok, err, map, andThen, unwrapOr } from '@servicejs/result';
 *
 * // Create Results
 * const success = ok(42);
 * const failure = err('something went wrong');
 *
 * // Transform values
 * const doubled = map(success, x => x * 2); // Ok(84)
 *
 * // Chain operations
 * const result = andThen(success, x =>
 *   x > 0 ? ok(x) : err('negative')
 * );
 *
 * // Extract values safely
 * const value = unwrapOr(result, 0);
 * ```
 */

export type { Result, ResultHKTO, OkType, ErrType } from './types.js';

export {
  Ok,
  Err,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  orElse,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  unwrapErr,
  match,
  toOption,
  all,
  tryCatch,
  tryCatchAsync,
} from './result.js';

export {
  fromThrowable,
  sequence,
  traverse,
  collectOk,
  collectErr,
  firstOk,
  combine,
  resultWhen,
  toNullable,
  toUndefined,
} from './utilities.js';

export { AsyncResult, trySafe, tryAsync, tryMaybeAsync } from './async-result.js';
