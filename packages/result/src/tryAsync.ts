import { AsyncResult } from './async-result';

/**
 * Wrap an async function to return AsyncResult instead of throwing
 *
 * Use this for functions that return Promises and may reject.
 * The function will be executed and any rejections will be caught
 * and converted to Err using the provided error mapper.
 *
 * This always returns AsyncResult, even if the underlying function
 * completes synchronously.
 *
 * @param fn - Async function to wrap
 * @param mapError - Function to convert caught errors to error type E
 * @returns AsyncResult<T, E> - Ok if successful, Err if promise rejects
 *
 * @example
 * ```typescript
 * // Wrap an async function
 * const result = tryAsync(
 *   async () => {
 *     const response = await fetch('/api/user');
 *     return response.json();
 *   },
 *   error => `Fetch failed: ${error}`
 * );
 *
 * // Chain operations
 * const user = await result
 *   .map(data => data.name)
 *   .mapErr(error => new Error(error));
 * ```
 */

export function tryAsync<T, E = unknown>(
  fn: () => Promise<T>,
  mapError: (error: unknown) => E
): AsyncResult<T, E> {
  return AsyncResult.from(fn(), mapError);
}
