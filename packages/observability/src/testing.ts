/**
 * Testing utilities for observability
 *
 * Provides assertion helpers for testing observability events.
 */

import type {
  ObservabilityEvent,
  SpanStartEvent,
  SpanEndEvent,
  MetricEvent,
  LogEvent,
} from './types.js';
import {
  isSpanStartEvent,
  isSpanEndEvent,
  isMetricEvent,
  isLogEvent,
} from './types.js';

// ============================================================================
// Test Assertions
// ============================================================================

/**
 * Assertion error thrown when a test assertion fails
 */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/**
 * Assert that an event matching the predicate was emitted
 */
export const assertEventEmitted = (
  events: ObservabilityEvent[],
  type: ObservabilityEvent['type'],
  predicate?: (event: ObservabilityEvent) => boolean
): ObservabilityEvent => {
  const matchingEvents = events.filter((e) => {
    if (e.type !== type) return false;
    if (predicate && !predicate(e)) return false;
    return true;
  });

  if (matchingEvents.length === 0) {
    throw new AssertionError(
      `Expected event of type "${type}" to be emitted${predicate ? ' matching predicate' : ''}, but none was found. Found ${events.length} events total.`
    );
  }

  return matchingEvents[0]!;
};

/**
 * Assert that a span with the given operation was created
 */
export const assertSpanCreated = (
  events: ObservabilityEvent[],
  operation: string,
  predicate?: (span: SpanStartEvent) => boolean
): SpanStartEvent => {
  const spans = events.filter(isSpanStartEvent);
  const matchingSpans = spans.filter((s) => {
    if (s.operation !== operation) return false;
    if (predicate && !predicate(s)) return false;
    return true;
  });

  if (matchingSpans.length === 0) {
    const spanOperations = spans.map((s) => s.operation).join(', ');
    throw new AssertionError(
      `Expected span with operation "${operation}" to be created${predicate ? ' matching predicate' : ''}, but none was found. Found spans: [${spanOperations}]`
    );
  }

  return matchingSpans[0]!;
};

/**
 * Assert that a span was completed (has both start and end events)
 */
export const assertSpanCompleted = (
  events: ObservabilityEvent[],
  operation: string,
  status?: 'ok' | 'error'
): { start: SpanStartEvent; end: SpanEndEvent } => {
  const start = assertSpanCreated(events, operation);

  const ends = events.filter(isSpanEndEvent);
  const end = ends.find((e) => e.spanId === start.spanId);

  if (!end) {
    throw new AssertionError(
      `Expected span "${operation}" (${start.spanId}) to be completed, but no end event was found`
    );
  }

  if (status && end.status !== status) {
    throw new AssertionError(
      `Expected span "${operation}" to complete with status "${status}", but got "${end.status}"`
    );
  }

  return { start, end };
};

/**
 * Assert that a metric with the given name was recorded
 */
export const assertMetricRecorded = (
  events: ObservabilityEvent[],
  name: string,
  value?: number,
  predicate?: (metric: MetricEvent) => boolean
): MetricEvent => {
  const metrics = events.filter(isMetricEvent);
  const matchingMetrics = metrics.filter((m) => {
    if (m.name !== name) return false;
    if (value !== undefined && m.value !== value) return false;
    if (predicate && !predicate(m)) return false;
    return true;
  });

  if (matchingMetrics.length === 0) {
    const metricNames = metrics.map((m) => m.name).join(', ');
    throw new AssertionError(
      `Expected metric "${name}"${value !== undefined ? ` with value ${value}` : ''} to be recorded${predicate ? ' matching predicate' : ''}, but none was found. Found metrics: [${metricNames}]`
    );
  }

  return matchingMetrics[0]!;
};

/**
 * Assert that a log with the given level and message was emitted
 */
export const assertLogEmitted = (
  events: ObservabilityEvent[],
  level: 'debug' | 'info' | 'warn' | 'error',
  messagePattern?: string | RegExp,
  predicate?: (log: LogEvent) => boolean
): LogEvent => {
  const logs = events.filter(isLogEvent);
  const matchingLogs = logs.filter((l) => {
    if (l.level !== level) return false;
    if (messagePattern) {
      if (typeof messagePattern === 'string') {
        if (!l.message.includes(messagePattern)) return false;
      } else {
        if (!messagePattern.test(l.message)) return false;
      }
    }
    if (predicate && !predicate(l)) return false;
    return true;
  });

  if (matchingLogs.length === 0) {
    const logMessages = logs.map((l) => `${l.level}: ${l.message}`).join(', ');
    throw new AssertionError(
      `Expected log at level "${level}"${messagePattern ? ` containing "${messagePattern}"` : ''} to be emitted${predicate ? ' matching predicate' : ''}, but none was found. Found logs: [${logMessages}]`
    );
  }

  return matchingLogs[0]!;
};

/**
 * Assert that no events matching the criteria were emitted
 */
export const assertNoEventEmitted = (
  events: ObservabilityEvent[],
  type: ObservabilityEvent['type'],
  predicate?: (event: ObservabilityEvent) => boolean
): void => {
  const matchingEvents = events.filter((e) => {
    if (e.type !== type) return false;
    if (predicate && !predicate(e)) return false;
    return true;
  });

  if (matchingEvents.length > 0) {
    throw new AssertionError(
      `Expected no events of type "${type}"${predicate ? ' matching predicate' : ''}, but found ${matchingEvents.length}`
    );
  }
};

/**
 * Assert that events are in chronological order
 */
export const assertChronologicalOrder = (
  events: ObservabilityEvent[]
): void => {
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const curr = events[i];

    if (!prev || !curr) continue;
    if (!('timestamp' in prev) || !('timestamp' in curr)) continue;

    if (prev.timestamp > curr.timestamp) {
      throw new AssertionError(
        `Events are not in chronological order: event ${i - 1} (${prev.type} at ${prev.timestamp}) comes after event ${i} (${curr.type} at ${curr.timestamp})`
      );
    }
  }
};

/**
 * Assert that a child span is nested under a parent span
 */
export const assertSpanNesting = (
  events: ObservabilityEvent[],
  parentOperation: string,
  childOperation: string
): { parent: SpanStartEvent; child: SpanStartEvent } => {
  const parent = assertSpanCreated(events, parentOperation);
  const child = assertSpanCreated(events, childOperation);

  if (child.parentSpanId !== parent.spanId) {
    throw new AssertionError(
      `Expected span "${childOperation}" to be nested under "${parentOperation}", but parent span IDs don't match. Expected: ${parent.spanId}, Got: ${child.parentSpanId}`
    );
  }

  if (child.traceId !== parent.traceId) {
    throw new AssertionError(
      `Expected span "${childOperation}" to share trace ID with "${parentOperation}", but trace IDs don't match. Expected: ${parent.traceId}, Got: ${child.traceId}`
    );
  }

  return { parent, child };
};

/**
 * Count events by type
 */
export const countEventsByType = (
  events: ObservabilityEvent[]
): Record<string, number> => {
  const counts: Record<string, number> = {};

  for (const event of events) {
    counts[event.type] = (counts[event.type] || 0) + 1;
  }

  return counts;
};

/**
 * Get all spans from events
 */
export const getSpans = (events: ObservabilityEvent[]): {
  starts: SpanStartEvent[];
  ends: SpanEndEvent[];
  incomplete: SpanStartEvent[];
  completed: Array<{ start: SpanStartEvent; end: SpanEndEvent }>;
} => {
  const starts = events.filter(isSpanStartEvent);
  const ends = events.filter(isSpanEndEvent);

  const completed: Array<{ start: SpanStartEvent; end: SpanEndEvent }> = [];
  const incomplete: SpanStartEvent[] = [];

  for (const start of starts) {
    const end = ends.find((e) => e.spanId === start.spanId);
    if (end) {
      completed.push({ start, end });
    } else {
      incomplete.push(start);
    }
  }

  return { starts, ends, incomplete, completed };
};

/**
 * Get metrics by name
 */
export const getMetricsByName = (
  events: ObservabilityEvent[],
  name: string
): MetricEvent[] => {
  return events.filter(isMetricEvent).filter((m) => m.name === name);
};

/**
 * Get logs by level
 */
export const getLogsByLevel = (
  events: ObservabilityEvent[],
  level: 'debug' | 'info' | 'warn' | 'error'
): LogEvent[] => {
  return events.filter(isLogEvent).filter((l) => l.level === level);
};
