/**
 * Event storage, querying, and replay
 */

import type { ObservabilityEvent, EventFilter, MetricEvent } from './types.js';
import { isSpanStartEvent, isSpanEndEvent, isMetricEvent } from './types.js';

// ============================================================================
// Event Buffer (Ring Buffer)
// ============================================================================

export interface EventBufferOptions {
  /** Maximum number of events to store */
  maxSize?: number;
}

/**
 * Event buffer using ring buffer
 * Keeps most recent N events in memory
 */
export const createEventBuffer = (
  options: EventBufferOptions = {}
): {
  add(event: ObservabilityEvent): void;
  getEvents(filter?: EventFilter): ObservabilityEvent[];
  clear(): void;
  size(): number;
} => {
  const { maxSize = 10000 } = options;
  const events: ObservabilityEvent[] = [];
  let head = 0;

  const add = (event: ObservabilityEvent): void => {
    if (events.length < maxSize) {
      events.push(event);
    } else {
      // Ring buffer: overwrite oldest event
      events[head] = event;
      head = (head + 1) % maxSize;
    }
  };

  const getEvents = (filter?: EventFilter): ObservabilityEvent[] => {
    // Get events in logical ring buffer order (oldest to newest)
    let result: ObservabilityEvent[];
    if (events.length < maxSize) {
      // Buffer not full yet, events are in insertion order
      result = [...events];
    } else {
      // Buffer is full, need to reorder from head (oldest) to head-1 (newest)
      result = [...events.slice(head), ...events.slice(0, head)];
    }

    if (!filter) return result;

    // Filter by type
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      result = result.filter((e) => types.includes(e.type));
    }

    // Filter by trace ID
    if (filter.traceId) {
      result = result.filter((e) => {
        if ('traceId' in e) return e.traceId === filter.traceId;
        return false;
      });
    }

    // Filter by span ID
    if (filter.spanId) {
      result = result.filter((e) => {
        if ('spanId' in e) return e.spanId === filter.spanId;
        return false;
      });
    }

    // Filter by time range
    if (filter.timeRange) {
      const { start, end } = filter.timeRange;
      result = result.filter((e) => {
        if ('timestamp' in e) {
          return e.timestamp >= start && e.timestamp <= end;
        }
        return false;
      });
    }

    // Filter by resource attributes
    if (filter.resource) {
      result = result.filter((e) => {
        if (!('resource' in e) || !e.resource) return false;
        return Object.entries(filter.resource!).every(
          ([key, value]) => e.resource![key] === value
        );
      });
    }

    return result;
  };

  const clear = (): void => {
    events.length = 0;
    head = 0;
  };

  const size = (): number => events.length;

  return { add, getEvents, clear, size };
};

// ============================================================================
// Event Recorder (Persistent Storage)
// ============================================================================

export interface EventRecorderOptions {
  /** File path for NDJSON storage */
  path?: string;

  /** Custom write function */
  write?: (event: ObservabilityEvent) => Promise<void>;
}

/**
 * Event recorder for persistent storage
 * Writes events to NDJSON file or custom storage
 */
export const createEventRecorder = (
  options: EventRecorderOptions = {}
): {
  record(event: ObservabilityEvent): Promise<void>;
  replay(filter?: EventFilter): AsyncIterable<ObservabilityEvent>;
} => {
  const { path, write: customWrite } = options;

  const record = async (event: ObservabilityEvent): Promise<void> => {
    if (customWrite) {
      await customWrite(event);
    } else if (path) {
      // Append to NDJSON file
      // const line = JSON.stringify(event) + '\n';
      // Note: Actual file writing would need fs capability
      // This is a placeholder for the interface
      console.warn('File writing not implemented in browser context');
    }
  };

  const replay = async function* (
    _filter?: EventFilter
  ): AsyncIterable<ObservabilityEvent> {
    // Placeholder for replay functionality
    // Would read from file and yield filtered events
    if (path) {
      // Read NDJSON file line by line
      // Parse each line as ObservabilityEvent
      // Apply filter
      // Yield matching events
      console.warn('File reading not implemented in browser context');
    }
  };

  return { record, replay };
};

// ============================================================================
// Event Query Interface
// ============================================================================

/**
 * Reconstruct trace from events
 */
export interface Trace {
  traceId: string;
  spans: Span[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Span with start/end information
 */
export interface Span {
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'ok' | 'error';
  attributes?: Record<string, unknown>;
  children: Span[];
}

/**
 * Reconstruct trace tree from events
 */
export const reconstructTrace = (events: ObservabilityEvent[], traceId: string): Trace | null => {
  const spanStarts = events.filter(isSpanStartEvent).filter((e) => e.traceId === traceId);
  const spanEnds = events.filter(isSpanEndEvent);

  if (spanStarts.length === 0) return null;

  // Build map of all complete spans (those with both start and end events)
  const completeSpanIds = new Set<string>();
  spanStarts.forEach((start) => {
    const end = spanEnds.find((e) => e.spanId === start.spanId);
    if (end) {
      completeSpanIds.add(start.spanId);
    }
  });

  // Map span IDs to spans
  const spansMap = new Map<string, Span>();

  spanStarts.forEach((start) => {
    const end = spanEnds.find((e) => e.spanId === start.spanId);
    if (!end) return;

    const span: Span = {
      spanId: start.spanId,
      ...(start.parentSpanId ? { parentSpanId: start.parentSpanId } : {}),
      operation: start.operation,
      startTime: start.timestamp,
      endTime: end.timestamp,
      duration: end.duration,
      status: end.status,
      attributes: { ...start.attributes, ...end.attributes },
      children: [],
    };

    spansMap.set(start.spanId, span);
  });

  // Build tree structure - populate children arrays
  spansMap.forEach((span) => {
    if (span.parentSpanId) {
      const parent = spansMap.get(span.parentSpanId);
      if (parent) {
        parent.children.push(span);
      }
    }
  });

  // Calculate trace duration
  const allSpans = Array.from(spansMap.values());

  if (allSpans.length === 0) return null;

  const startTime = Math.min(...allSpans.map((s) => s.startTime));
  const endTime = Math.max(...allSpans.map((s) => s.endTime));

  return {
    traceId,
    spans: allSpans, // Return all spans in flat array
    startTime,
    endTime,
    duration: endTime - startTime,
  };
};

/**
 * Aggregate metrics from events
 */
export const aggregateMetrics = (
  events: ObservabilityEvent[],
  metricName: string
): {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
} => {
  const metricEvents = events.filter(
    (e): e is MetricEvent => isMetricEvent(e) && e.name === metricName
  );

  if (metricEvents.length === 0) {
    return { count: 0, sum: 0, min: 0, max: 0, avg: 0 };
  }

  const values = metricEvents.map((e) => (e as { value: number }).value);
  const sum = values.reduce((a, b) => a + b, 0);
  const count = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = sum / count;

  return { count, sum, min, max, avg };
};

/**
 * Query logs by level and time range
 */
export const queryLogs = (
  events: ObservabilityEvent[],
  level?: string,
  timeRange?: { start: number; end: number }
): Array<{ timestamp: number; level: string; message: string; context?: Record<string, unknown> }> => {
  let logs = events.filter((e): e is Extract<ObservabilityEvent, { type: 'log' }> => e.type === 'log');

  if (level) {
    logs = logs.filter((e) => e.level === level);
  }

  if (timeRange) {
    logs = logs.filter(
      (e) => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
    );
  }

  return logs.map((e) => ({
    timestamp: e.timestamp,
    level: e.level,
    message: e.message,
    ...(e.context ? { context: e.context } : {}),
  }));
};
