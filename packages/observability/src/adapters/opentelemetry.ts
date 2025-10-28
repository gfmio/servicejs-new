/**
 * OpenTelemetry adapter - converts ObservabilityEvents to OTel format
 *
 * This adapter translates ServiceJS observability events to OpenTelemetry
 * format, enabling integration with OTel collectors and backends.
 */

import type {
  ObservabilityEvent,
  SpanStartEvent,
  SpanEndEvent,
  MetricEvent,
  LogEvent,
} from '../types.js';
import { isSpanStartEvent, isSpanEndEvent, isMetricEvent, isLogEvent } from '../types.js';

// ============================================================================
// OpenTelemetry Types (simplified - in real usage, import from @opentelemetry/api)
// ============================================================================

/**
 * Simplified OTel Span interface
 * In production, use @opentelemetry/api types
 */
export interface OTelSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
  events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, string | number | boolean>;
  }>;
}

/**
 * Simplified OTel Metric interface
 */
export interface OTelMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  timestamp: number;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Simplified OTel Log interface
 */
export interface OTelLog {
  timestamp: number;
  severityText: string;
  severityNumber: number;
  body: string;
  attributes?: Record<string, string | number | boolean>;
  traceId?: string;
  spanId?: string;
}

/**
 * OTel export result
 */
export interface OTelExportResult {
  spans: OTelSpan[];
  metrics: OTelMetric[];
  logs: OTelLog[];
}

// ============================================================================
// OpenTelemetry Adapter
// ============================================================================

export interface OpenTelemetryAdapterOptions {
  /** Endpoint URL for OTLP export (e.g., "http://localhost:4318/v1/traces") */
  endpoint?: string;

  /** Custom exporter function */
  export?: (result: OTelExportResult) => Promise<void> | void;

  /** Batch size for exporting */
  batchSize?: number;

  /** Flush interval in milliseconds */
  flushInterval?: number;

  /** Resource attributes to add to all signals */
  resource?: Record<string, string | number | boolean>;
}

/**
 * Create OpenTelemetry adapter
 *
 * Converts ObservabilityEvents to OpenTelemetry format and exports them.
 *
 * @example
 * ```typescript
 * const adapter = createOpenTelemetryAdapter({
 *   endpoint: 'http://localhost:4318/v1/traces',
 *   batchSize: 100,
 *   flushInterval: 5000,
 * });
 *
 * observability.emit = (event) => {
 *   adapter.process(event);
 * };
 *
 * // Flush remaining events before shutdown
 * await adapter.flush();
 * await adapter.shutdown();
 * ```
 */
export const createOpenTelemetryAdapter = (
  options: OpenTelemetryAdapterOptions = {}
): {
  process: (event: ObservabilityEvent) => void;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
} => {
  const {
    endpoint,
    export: customExport,
    batchSize = 100,
    flushInterval = 5000,
    resource = {},
  } = options;

  // Span tracking
  const activeSpans = new Map<string, Partial<OTelSpan>>();
  const completedSpans: OTelSpan[] = [];

  // Metrics buffer
  const metrics: OTelMetric[] = [];

  // Logs buffer
  const logs: OTelLog[] = [];

  let flushTimer: Timer | null = null;

  /**
   * Filter out undefined values from attributes
   */
  const filterUndefined = (
    attrs: Record<string, unknown>
  ): Record<string, string | number | boolean> => {
    const filtered: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  /**
   * Convert log level to OTel severity
   */
  const severityMap: Record<string, number> = {
    debug: 5,
    info: 9,
    warn: 13,
    error: 17,
  };

  /**
   * Process a single event
   */
  const process = (event: ObservabilityEvent): void => {
    if (isSpanStartEvent(event)) {
      processSpanStart(event);
    } else if (isSpanEndEvent(event)) {
      processSpanEnd(event);
    } else if (isMetricEvent(event)) {
      processMetric(event);
    } else if (isLogEvent(event)) {
      processLog(event);
    }

    // Auto-flush if batch size reached
    if (
      completedSpans.length >= batchSize ||
      metrics.length >= batchSize ||
      logs.length >= batchSize
    ) {
      void flush();
    }
  };

  /**
   * Process span start event
   */
  const processSpanStart = (event: SpanStartEvent): void => {
    const span: Partial<OTelSpan> = {
      spanId: event.spanId,
      traceId: event.traceId,
      ...(event.parentSpanId ? { parentSpanId: event.parentSpanId } : {}),
      name: event.operation,
      startTime: event.timestamp,
      attributes: filterUndefined({
        ...resource,
        ...(event.attributes || {}),
        ...(event.resource || {}),
      }),
      events: [],
    };

    activeSpans.set(event.spanId, span);
  };

  /**
   * Process span end event
   */
  const processSpanEnd = (event: SpanEndEvent): void => {
    const span = activeSpans.get(event.spanId);
    if (!span) return;

    const completedSpan: OTelSpan = {
      ...span,
      spanId: span.spanId!,
      traceId: span.traceId!,
      name: span.name!,
      startTime: span.startTime!,
      endTime: event.timestamp,
      status: event.status,
      attributes: span.attributes || {},
      events: span.events || [],
    };

    // Add error event if span failed
    if (event.error) {
      completedSpan.events.push({
        name: 'exception',
        timestamp: event.timestamp,
        attributes: {
          'exception.type': event.error.type || 'Error',
          'exception.message': event.error.message,
          ...(event.error.stack ? { 'exception.stacktrace': event.error.stack } : {}),
        },
      });
    }

    completedSpans.push(completedSpan);
    activeSpans.delete(event.spanId);
  };

  /**
   * Process metric event
   */
  const processMetric = (event: MetricEvent): void => {
    const metric: OTelMetric = {
      name: event.name,
      type: event.kind,
      value: event.value,
      timestamp: event.timestamp,
      attributes: filterUndefined({
        ...resource,
        ...(event.labels || {}),
        ...(event.resource || {}),
      }),
    };

    metrics.push(metric);
  };

  /**
   * Process log event
   */
  const processLog = (event: LogEvent): void => {
    const log: OTelLog = {
      timestamp: event.timestamp,
      severityText: event.level,
      severityNumber: severityMap[event.level] || 0,
      body: event.message,
      attributes: filterUndefined({
        ...resource,
        ...(event.context || {}),
        ...(event.resource || {}),
      }),
      ...(event.traceId ? { traceId: event.traceId } : {}),
      ...(event.spanId ? { spanId: event.spanId } : {}),
    };

    logs.push(log);
  };

  /**
   * Flush all buffered data
   */
  const flush = async (): Promise<void> => {
    if (completedSpans.length === 0 && metrics.length === 0 && logs.length === 0) {
      return;
    }

    const result: OTelExportResult = {
      spans: [...completedSpans],
      metrics: [...metrics],
      logs: [...logs],
    };

    // Clear buffers
    completedSpans.length = 0;
    metrics.length = 0;
    logs.length = 0;

    // Export
    if (customExport) {
      await customExport(result);
    } else if (endpoint) {
      await exportToOTLP(endpoint, result);
    }
  };

  /**
   * Export to OTLP endpoint
   */
  const exportToOTLP = async (url: string, result: OTelExportResult): Promise<void> => {
    try {
      // In a real implementation, this would send proper OTLP protobuf data
      // For now, we just send JSON
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(result),
      });

      if (!response.ok) {
        console.error('Failed to export to OTLP:', response.statusText);
      }
    } catch (error) {
      console.error('Error exporting to OTLP:', error);
    }
  };

  /**
   * Start periodic flushing
   */
  const startFlushing = (): void => {
    if (flushTimer) return;

    flushTimer = setInterval(() => {
      void flush();
    }, flushInterval);
  };

  /**
   * Shutdown the adapter
   */
  const shutdown = async (): Promise<void> => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }

    await flush();
  };

  // Start periodic flushing
  startFlushing();

  return {
    process,
    flush,
    shutdown,
  };
};
