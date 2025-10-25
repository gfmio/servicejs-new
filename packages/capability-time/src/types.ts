/**
 * @module @servicejs/capability-time
 *
 * Time and scheduling capability for ServiceJS.
 *
 * Provides platform-agnostic time operations and timer scheduling.
 * All operations return Result instead of throwing exceptions.
 */

import type { Result } from '@servicejs/result';

/**
 * Cancel function returned by timers
 */
export type CancelFn = () => void;

/**
 * Opaque timer identifier
 * Used for clearTimeout and clearInterval
 */
export type TimerId = number & { readonly __brand: 'TimerId' };

/**
 * Time operation errors
 */
export interface TimeError {
  readonly code: 'INVALID_DELAY' | 'CALLBACK_ERROR' | 'ALREADY_CANCELLED' | 'INVALID_TIMER_ID' | 'TIMER_FAILED';
  readonly message: string;
}

/**
 * Time capability interface
 *
 * Provides access to current time and timer scheduling.
 * Never throws exceptions - all errors returned as Result.
 *
 * @example
 * ```typescript
 * const time = createRealTime();
 *
 * // Get current time
 * const now = time.now(); // milliseconds since epoch
 *
 * // Schedule delayed execution
 * const timeoutResult = time.setTimeout(() => console.log('Hello'), 1000);
 * if (timeoutResult.ok) {
 *   const cancel = timeoutResult.value;
 *   // Later: cancel();
 * }
 *
 * // Schedule recurring execution
 * const intervalResult = time.setInterval(() => console.log('Tick'), 1000);
 * if (intervalResult.ok) {
 *   const cancel = intervalResult.value;
 *   // Later: cancel();
 * }
 * ```
 */
export interface TimeCapability {
  /**
   * Get current timestamp (milliseconds since Unix epoch)
   *
   * @returns Current timestamp in milliseconds
   *
   * @example
   * ```typescript
   * const start = time.now();
   * // ... do work ...
   * const elapsed = time.now() - start;
   * ```
   */
  now(): number;

  /**
   * Schedule a callback to run after a delay
   *
   * @param callback - Function to execute after delay
   * @param ms - Delay in milliseconds (must be >= 0)
   * @returns Ok(cancelFn) or Err(error)
   *
   * @example
   * ```typescript
   * const result = time.setTimeout(() => {
   *   console.log('Executed after 1 second');
   * }, 1000);
   *
   * if (result.ok) {
   *   // Cancel if needed
   *   result.value(); // Cancels the timeout
   * }
   * ```
   */
  setTimeout(callback: () => void, ms: number): Result<CancelFn, TimeError>;

  /**
   * Schedule a callback to run repeatedly at an interval
   *
   * @param callback - Function to execute at each interval
   * @param ms - Interval in milliseconds (must be >= 0)
   * @returns Ok(cancelFn) or Err(error)
   *
   * @example
   * ```typescript
   * const result = time.setInterval(() => {
   *   console.log('Tick');
   * }, 1000);
   *
   * if (result.ok) {
   *   // Stop the interval
   *   result.value(); // Cancels the interval
   * }
   * ```
   */
  setInterval(callback: () => void, ms: number): Result<CancelFn, TimeError>;

  /**
   * High-resolution time (nanoseconds since arbitrary epoch)
   *
   * For performance measurement. Not all platforms support this.
   * Use now() for wall-clock time.
   *
   * @returns High-resolution timestamp in nanoseconds, or undefined if not supported
   *
   * @example
   * ```typescript
   * const start = time.hrtime?.();
   * if (start) {
   *   // ... do work ...
   *   const elapsed = time.hrtime!() - start;
   *   console.log(`Took ${elapsed}ns`);
   * }
   * ```
   */
  hrtime?(): bigint;

  /**
   * High-resolution time (milliseconds with decimal precision)
   *
   * Alternative to hrtime() that returns milliseconds with sub-millisecond precision.
   * More portable than hrtime() - works in browsers and workers.
   *
   * @returns Option<number> containing milliseconds since time origin, or None if not supported
   *
   * @example
   * ```typescript
   * import { isSome } from '@servicejs/option';
   *
   * const start = time.highResolutionTime();
   * if (isSome(start)) {
   *   // ... do work ...
   *   const end = time.highResolutionTime();
   *   if (isSome(end)) {
   *     const elapsed = end.value - start.value;
   *     console.log(`Took ${elapsed}ms`);
   *   }
   * }
   * ```
   */
  highResolutionTime?(): import('@servicejs/option').Option<number>;

  /**
   * Clear a timeout created with setTimeout
   *
   * Alternative API for platforms that use timer IDs instead of cancel functions.
   *
   * @param id - Timer ID returned from setTimeout
   * @returns Ok(void) or Err(error)
   */
  clearTimeout?(id: TimerId): Result<void, TimeError>;

  /**
   * Clear an interval created with setInterval
   *
   * Alternative API for platforms that use timer IDs instead of cancel functions.
   *
   * @param id - Timer ID returned from setInterval
   * @returns Ok(void) or Err(error)
   */
  clearInterval?(id: TimerId): Result<void, TimeError>;
}

/**
 * Fake time capability (re-exported from fake.ts for convenience)
 */
export interface FakeTimeCapability extends TimeCapability {
  advance(ms: number): void;
  tick(): void;
  pendingTimers(): number;
  reset(): void;
}
