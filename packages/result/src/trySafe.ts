import { err, ok } from './result';
import type { Result } from './types';

// ============================================================================
// Helper Functions for Wrapping Functions
// ============================================================================
/**
 * Wrap a synchronous function to return Result instead of throwing
 *
 * Use this for functions that execute synchronously and may throw errors.
 * The function will be executed immediately and any thrown errors will be
 * caught and converted to Err using the provided error mapper.
 *
 * @param fn - Synchronous function to wrap
 * @param mapError - Function to convert caught errors to error type E
 * @returns Result<T, E> - Ok if successful, Err if function throws
 *
 * @example
 * ```typescript
 * // Wrap a function that might throw
 * const parseNumber = (str: string) => {
 *   const num = parseInt(str, 10);
 *   if (isNaN(num)) throw new Error('Not a number');
 *   return num;
 * };
 *
 * const result = trySafe(
 *   () => parseNumber('123'),
 *   error => String(error)
 * );
 * // Result: Ok(123)
 *
 * const result2 = trySafe(
 *   () => parseNumber('abc'),
 *   error => String(error)
 * );
 * // Result: Err('Error: Not a number')
 * ```
 */

export function trySafe<T, E = unknown>(
  fn: () => T,
  mapError: (error: unknown) => E
): Result<T, E> {
  try {
    return ok(fn());
  } catch (error) {
    return err(mapError(error));
  }
}
