/**
 * Fake time implementation for deterministic testing
 *
 * Provides controllable time that can be advanced manually.
 * Perfect for testing time-dependent code without waiting.
 */

import { ok, err, type Result } from '@servicejs/result';
import type { TimeCapability, TimeError, CancelFn } from './types.js';

/**
 * Timer entry in the queue
 */
interface TimerEntry {
  readonly id: number;
  readonly time: number;
  readonly callback: () => void;
  readonly interval?: number; // If set, this is a recurring timer
  cancelled: boolean;
}

/**
 * Fake time capability with controllable advancement
 */
export interface FakeTimeCapability extends TimeCapability {
  /**
   * Advance time by the specified milliseconds
   *
   * Fires all timers that should execute in the advanced period.
   * Timers are fired in chronological order.
   *
   * @param ms - Milliseconds to advance
   *
   * @example
   * ```typescript
   * const time = createFakeTime();
   * time.setTimeout(() => console.log('A'), 100);
   * time.setTimeout(() => console.log('B'), 200);
   *
   * time.advance(150); // Logs 'A'
   * time.advance(100); // Logs 'B'
   * ```
   */
  advance(ms: number): void;

  /**
   * Fire all pending timers regardless of time
   *
   * Advances time to the last pending timer and fires all timers.
   * Useful for "fast-forwarding" to completion.
   *
   * @example
   * ```typescript
   * const time = createFakeTime();
   * time.setTimeout(() => console.log('Done'), 10000);
   *
   * time.tick(); // Immediately logs 'Done', time is now 10000
   * ```
   */
  tick(): void;

  /**
   * Get number of pending timers
   *
   * @returns Count of active (non-cancelled) timers
   */
  pendingTimers(): number;

  /**
   * Reset to initial state
   *
   * Clears all timers and resets time to startTime.
   */
  reset(): void;
}

/**
 * Create a fake time capability
 *
 * Creates a controllable time source for deterministic testing.
 * Time only advances when you call advance() or tick().
 *
 * @param startTime - Initial timestamp (defaults to 0)
 * @returns Fake time capability
 *
 * @example
 * ```typescript
 * const time = createFakeTime(1000000);
 *
 * console.log(time.now()); // 1000000
 *
 * const result = time.setTimeout(() => {
 *   console.log('Fired!');
 * }, 1000);
 *
 * console.log(time.now()); // Still 1000000 (time doesn't auto-advance)
 *
 * time.advance(500);
 * console.log(time.now()); // 1000500 (no callback yet)
 *
 * time.advance(500);
 * // Logs 'Fired!'
 * console.log(time.now()); // 1001000
 * ```
 */
export function createFakeTime(startTime: number = 0): FakeTimeCapability {
  let currentTime = startTime;
  let nextId = 1;
  const timers: TimerEntry[] = [];

  const fireTimers = (upToTime: number): void => {
    // Sort timers by time
    timers.sort((a, b) => a.time - b.time);

    while (timers.length > 0) {
      const next = timers[0];
      if (!next) {
        break;
      }

      if (next.cancelled) {
        timers.shift();
        continue;
      }

      if (next.time > upToTime) {
        break;
      }

      timers.shift();
      currentTime = next.time;

      try {
        next.callback();
      } catch (err) {
        console.error('Error in timer callback:', err);
      }

      // Re-schedule if interval (check if still not cancelled after execution)
      if (next.interval !== undefined && !next.cancelled) {
        const newTimer: TimerEntry = {
          id: next.id,
          time: next.time + next.interval,
          callback: next.callback,
          interval: next.interval,
          cancelled: next.cancelled,
        };
        timers.push(newTimer);
      }
    }

    currentTime = upToTime;
  };

  return {
    now(): number {
      return currentTime;
    },

    setTimeout(callback: () => void, ms: number): Result<CancelFn, TimeError> {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Delay must be non-negative, got ${ms}`,
        });
      }

      const id = nextId++;
      const timer: TimerEntry = {
        id,
        time: currentTime + ms,
        callback,
        cancelled: false,
      };

      timers.push(timer);

      const cancel = () => {
        timer.cancelled = true;
      };

      return ok(cancel);
    },

    setInterval(callback: () => void, ms: number): Result<CancelFn, TimeError> {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Interval must be non-negative, got ${ms}`,
        });
      }

      const id = nextId++;
      const timer: TimerEntry = {
        id,
        time: currentTime + ms,
        callback,
        interval: ms,
        cancelled: false,
      };

      timers.push(timer);

      // Cancel function marks ALL instances of this timer (current and future)
      const cancel = () => {
        // Mark all instances with this ID as cancelled
        for (const t of timers) {
          if (t.id === id) {
            t.cancelled = true;
          }
        }
      };

      return ok(cancel);
    },

    advance(ms: number): void {
      const targetTime = currentTime + ms;
      fireTimers(targetTime);
    },

    tick(): void {
      // Find the latest timer
      let maxTime = currentTime;
      for (const timer of timers) {
        if (!timer.cancelled && timer.time > maxTime) {
          maxTime = timer.time;
        }
      }

      if (maxTime > currentTime) {
        fireTimers(maxTime);
      }
    },

    pendingTimers(): number {
      return timers.filter(t => !t.cancelled).length;
    },

    reset(): void {
      currentTime = startTime;
      timers.length = 0;
      nextId = 1;
    },
  };
}

/**
 * Create a no-op time capability
 *
 * Time advances but timers never fire.
 * Useful for tests that shouldn't execute timer callbacks.
 *
 * @param startTime - Initial timestamp (defaults to 0)
 * @returns No-op time capability
 *
 * @example
 * ```typescript
 * const time = createNoOpTime();
 *
 * time.setTimeout(() => {
 *   console.log('This will never run');
 * }, 1000);
 *
 * // Time advances, but timers are ignored
 * console.log(time.now()); // Actual system time
 * ```
 */
export function createNoOpTime(startTime: number = Date.now()): TimeCapability {
  let currentTime = startTime;

  return {
    now(): number {
      // Simulate time passing
      currentTime += 1;
      return currentTime;
    },

    setTimeout(_callback: () => void, ms: number): Result<CancelFn, TimeError> {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Delay must be non-negative, got ${ms}`,
        });
      }

      // Return a no-op cancel function
      return ok(() => {});
    },

    setInterval(_callback: () => void, ms: number): Result<CancelFn, TimeError> {
      if (ms < 0) {
        return err({
          code: 'INVALID_DELAY',
          message: `Interval must be non-negative, got ${ms}`,
        });
      }

      // Return a no-op cancel function
      return ok(() => {});
    },
  };
}
