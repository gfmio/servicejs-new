import { AsyncResult } from './async-result';
import { err, ok } from './result';
import type { Result } from './types';

/**
 * Wrap a function that may return synchronously or asynchronously
 *
 * Use this for functions that may return either a value or a Promise<value>.
 * This handles both cases correctly:
 * - If the function returns a non-Promise value → Result<T, E>
 * - If the function returns a Promise → AsyncResult<T, E>
 *
 * This is useful when you want to preserve the sync/async nature of the
 * underlying function for performance (sync functions don't allocate Promises).
 *
 * @param fn - Function that may return T or Promise<T>
 * @param mapError - Function to convert caught errors to error type E
 * @returns Result<T, E> | AsyncResult<T, E> - Result type matches return type
 *
 * @example
 * ```typescript
 * // Function that may be sync or async based on cache
 * const getUserName = (id: number) => {
 *   const cached = cache.get(id);
 *   if (cached) return cached.name; // sync
 *   return fetch(`/api/users/${id}`)
 *     .then(r => r.json())
 *     .then(u => u.name); // async
 * };
 *
 * const result = tryMaybeAsync(
 *   () => getUserName(123),
 *   error => String(error)
 * );
 *
 * // Handle both cases
 * if (result instanceof AsyncResult) {
 *   const name = await result;
 *   console.log(name);
 * } else {
 *   // It's a Result<T, E>
 *   if (isOk(result)) {
 *     console.log(result.value);
 *   }
 * }
 * ```
 */

export function tryMaybeAsync<T, E = unknown>(
  fn: () => T | Promise<T>,
  mapError: (error: unknown) => E
): Result<T, E> | AsyncResult<T, E> {
  try {
    const result = fn();

    // Check if the result is a Promise
    if (result instanceof Promise) {
      return AsyncResult.from(result, mapError);
    }

    // Synchronous result
    return ok(result);
  } catch (error) {
    // Synchronous error
    return err(mapError(error));
  }
}
