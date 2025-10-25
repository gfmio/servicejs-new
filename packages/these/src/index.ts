/**
 * @servicejs/these
 *
 * These type for ServiceJS - Inclusive OR (can be left, right, or both).
 *
 * This package provides the These type, useful for operations that can
 * succeed with warnings or partial results.
 *
 * @example
 * ```typescript
 * import { both, that, makeThis, match } from '@servicejs/these';
 *
 * // Success with warnings
 * const result = both(['Warning: deprecated API'], { data: 42 });
 *
 * // Pattern match
 * const message = match(result, {
 *   onThis: warnings => `Failed: ${warnings.join(', ')}`,
 *   onThat: data => `Success: ${data}`,
 *   onBoth: (warnings, data) => `Success with warnings: ${data}, ${warnings.join(', ')}`,
 * });
 * ```
 */

export type { These } from './these.js';

export {
  This,
  That,
  Both,
  makeThis,
  that,
  both,
  isThis,
  isThat,
  isBoth,
  hasLeft,
  hasRight,
  map,
  mapLeft,
  biMap,
  match,
  getOrElse,
  getLeftOrElse,
  mergeLeft,
} from './these.js';
