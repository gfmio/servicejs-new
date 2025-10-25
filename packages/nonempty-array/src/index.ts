/**
 * @servicejs/nonempty-array
 *
 * Type-safe non-empty arrays for ServiceJS.
 *
 * This package provides NonEmptyArray - arrays guaranteed to have at least one element.
 * This eliminates a whole class of undefined errors when accessing array elements.
 *
 * @example
 * ```typescript
 * import { NonEmptyArray, nea } from '@servicejs/nonempty-array';
 *
 * // Create a non-empty array
 * const arr = nea(1, 2, 3);
 *
 * // Head and last are always safe!
 * arr.head(); // 1 (no undefined!)
 * arr.last(); // 3 (no undefined!)
 *
 * // Map, reduce, etc.
 * arr.map(x => x * 2); // NonEmptyArray(2, 4, 6)
 * arr.reduce1((a, b) => a + b); // 6 (no initial value needed!)
 * ```
 */

export { NonEmptyArray, nonEmptyArray, nea } from './nonempty-array.js';
