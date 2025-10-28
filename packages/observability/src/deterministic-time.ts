/**
 * Deterministic time for testing
 *
 * Provides controllable time for deterministic testing of observability.
 * This allows tests to control timestamps and durations without relying on
 * wall clock time.
 */

import type { ObservabilityCapability } from './capability.js';
import { createInMemoryObservability } from './capability.js';

// ============================================================================
// Time Control
// ============================================================================

/**
 * Time provider interface
 */
export interface TimeProvider {
  /** Get current time in milliseconds */
  now(): number;
}

/**
 * Controllable time for testing
 */
export interface ControllableTime extends TimeProvider {
  /** Set the current time */
  setTime(timestamp: number): void;

  /** Advance time by milliseconds */
  advance(ms: number): void;

  /** Reset time to initial value */
  reset(): void;

  /** Get the initial time */
  getInitialTime(): number;
}

/**
 * Create a controllable time provider for testing
 *
 * @example
 * ```typescript
 * const time = createControllableTime(1000);
 *
 * console.log(time.now()); // 1000
 *
 * time.advance(500);
 * console.log(time.now()); // 1500
 *
 * time.setTime(2000);
 * console.log(time.now()); // 2000
 *
 * time.reset();
 * console.log(time.now()); // 1000
 * ```
 */
export const createControllableTime = (
  initialTime: number = 0
): ControllableTime => {
  let currentTime = initialTime;
  const startTime = initialTime;

  return {
    now: () => currentTime,
    setTime: (timestamp: number) => {
      currentTime = timestamp;
    },
    advance: (ms: number) => {
      currentTime += ms;
    },
    reset: () => {
      currentTime = startTime;
    },
    getInitialTime: () => startTime,
  };
};

/**
 * Real time provider (uses Date.now())
 */
export const createRealTime = (): TimeProvider => ({
  now: () => Date.now(),
});

// ============================================================================
// Observability with Controllable Time
// ============================================================================

/**
 * Create an observability capability with controllable time
 *
 * This is useful for testing where you want to control the timestamps
 * in events without relying on wall clock time.
 *
 * Note: This implementation wraps the emit method to replace timestamps.
 * Since the base observability uses Date.now() internally, we need to
 * monkey-patch Date.now temporarily during method calls.
 *
 * @example
 * ```typescript
 * const time = createControllableTime(1000);
 * const obs = createObservabilityWithTime(time);
 *
 * // All events will use time.now() for timestamps
 * obs.withSpan('test', () => {
 *   time.advance(100);
 * });
 *
 * const events = obs.getEvents();
 * const spanStart = events[0]; // timestamp: 1000
 * const spanEnd = events[1];   // timestamp: 1100, duration: 100
 * ```
 */
export const createObservabilityWithTime = (
  timeProvider: TimeProvider
): ObservabilityCapability & {
  getEvents(): ReturnType<ReturnType<typeof createInMemoryObservability>['getEvents']>;
  clear(): void;
} => {
  const baseObs = createInMemoryObservability();

  // Store original Date.now
  const originalDateNow = Date.now;

  // Keep Date.now mocked at all times for this observability instance
  let mockingDepth = 0;

  const startMocking = () => {
    if (mockingDepth === 0) {
      Date.now = () => timeProvider.now();
    }
    mockingDepth++;
  };

  const stopMocking = () => {
    mockingDepth--;
    if (mockingDepth === 0) {
      Date.now = originalDateNow;
    }
  };

  // Helper to run with mocked time
  const withMockedTime = <T>(fn: () => T): T => {
    startMocking();
    try {
      return fn();
    } finally {
      stopMocking();
    }
  };

  // Wrap all methods that generate timestamps
  const wrappedObs: typeof baseObs = {
    ...baseObs,
    emit: (event) => withMockedTime(() => baseObs.emit(event)),
    withSpan: (operation, fn, attributes) =>
      withMockedTime(() => baseObs.withSpan(operation, fn, attributes)),
    counter: (name, value, labels) =>
      withMockedTime(() => baseObs.counter(name, value, labels)),
    gauge: (name, value, labels) =>
      withMockedTime(() => baseObs.gauge(name, value, labels)),
    histogram: (name, value, labels) =>
      withMockedTime(() => baseObs.histogram(name, value, labels)),
    log: (level, message, context) =>
      withMockedTime(() => baseObs.log(level, message, context)),
    debug: (message, context) =>
      withMockedTime(() => baseObs.debug(message, context)),
    info: (message, context) =>
      withMockedTime(() => baseObs.info(message, context)),
    warn: (message, context) =>
      withMockedTime(() => baseObs.warn(message, context)),
    error: (message, context) =>
      withMockedTime(() => baseObs.error(message, context)),
    getCurrentContext: () => baseObs.getCurrentContext(),
    setCurrentContext: (ctx) => baseObs.setCurrentContext(ctx),
    getEvents: () => baseObs.getEvents(),
    clear: () => baseObs.clear(),
  };

  return wrappedObs;
};

/**
 * Create a test scenario with controllable time
 *
 * Provides both time control and observability in one convenient package.
 *
 * @example
 * ```typescript
 * const scenario = createTestScenario(1000);
 *
 * scenario.obs.withSpan('operation', () => {
 *   scenario.time.advance(50);
 *   scenario.obs.counter('requests', 1);
 * });
 *
 * scenario.time.advance(100);
 *
 * const events = scenario.obs.getEvents();
 * // All events have controlled timestamps
 * ```
 */
export const createTestScenario = (initialTime: number = 0) => {
  const time = createControllableTime(initialTime);
  const obs = createObservabilityWithTime(time);

  return {
    time,
    obs,
    /** Advance time and return new time */
    tick: (ms: number) => {
      time.advance(ms);
      return time.now();
    },
    /** Reset both time and observability */
    reset: () => {
      time.reset();
      obs.clear();
    },
  };
};

/**
 * Wait for a specific amount of time to pass (in controlled time)
 *
 * This is useful for testing time-dependent behavior without actually waiting.
 *
 * @example
 * ```typescript
 * const scenario = createTestScenario(1000);
 *
 * scenario.obs.withSpan('parent', async () => {
 *   await waitControlled(scenario.time, 100);
 *   scenario.obs.log('info', 'After 100ms');
 * });
 *
 * // Time advances immediately, no actual waiting
 * ```
 */
export const waitControlled = async (
  time: ControllableTime,
  ms: number
): Promise<void> => {
  time.advance(ms);
  // Yield to event loop to allow async operations to process
  await Promise.resolve();
};

/**
 * Execute a function and measure duration using controllable time
 *
 * @example
 * ```typescript
 * const scenario = createTestScenario(1000);
 *
 * const { result, duration } = await measureWithTime(scenario.time, async () => {
 *   scenario.time.advance(50);
 *   return 42;
 * });
 *
 * console.log(result);   // 42
 * console.log(duration); // 50
 * ```
 */
export const measureWithTime = async <T>(
  time: ControllableTime,
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = time.now();
  const result = await fn();
  const end = time.now();
  return { result, duration: end - start };
};
