/**
 * Structured logging adapter - converts events to structured log format
 *
 * This adapter converts all ObservabilityEvents to structured logs compatible
 * with common logging frameworks (Bunyan, Pino, Winston, etc.)
 */

import type { ObservabilityEvent } from '../types.js';
import {
  isSpanStartEvent,
  isSpanEndEvent,
  isMetricEvent,
  isLogEvent,
  isCustomEvent,
} from '../types.js';

// ============================================================================
// Structured Log Types
// ============================================================================

/**
 * Log level mapping
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Structured log entry
 */
export interface StructuredLogEntry {
  /** Timestamp (ISO 8601 or epoch milliseconds) */
  time: string | number;

  /** Log level */
  level: LogLevel;

  /** Log message */
  msg: string;

  /** Event type */
  event_type: string;

  /** Trace ID for distributed tracing */
  trace_id?: string;

  /** Span ID */
  span_id?: string;

  /** Parent span ID */
  parent_span_id?: string;

  /** Resource attributes */
  resource?: Record<string, unknown>;

  /** Additional fields */
  [key: string]: unknown;
}

/**
 * Log format
 */
export type LogFormat = 'bunyan' | 'pino' | 'winston' | 'generic';

// ============================================================================
// Structured Logging Adapter
// ============================================================================

export interface StructuredLogAdapterOptions {
  /** Log format to use */
  format?: LogFormat;

  /** Output function (default: console.log) */
  output?: (log: string) => void;

  /** Include timestamp in log */
  includeTimestamp?: boolean;

  /** Timestamp format ('iso' or 'epoch') */
  timestampFormat?: 'iso' | 'epoch';

  /** Minimum log level */
  minLevel?: LogLevel;

  /** Pretty print (formatted JSON) */
  pretty?: boolean;

  /** Resource attributes to include in every log */
  resource?: Record<string, unknown>;

  /** Custom field mappings */
  fieldMappings?: Record<string, string>;
}

/**
 * Log level hierarchy
 */
const levelPriority: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/**
 * Create structured logging adapter
 *
 * Converts all observability events to structured logs.
 *
 * @example
 * ```typescript
 * const adapter = createStructuredLogAdapter({
 *   format: 'pino',
 *   pretty: true,
 *   minLevel: 'info',
 * });
 *
 * observability.emit = (event) => {
 *   adapter.process(event);
 * };
 * ```
 */
export const createStructuredLogAdapter = (
  options: StructuredLogAdapterOptions = {}
): {
  process: (event: ObservabilityEvent) => void;
} => {
  const {
    format = 'generic',
    output = console.log,
    timestampFormat = 'iso',
    minLevel = 'trace',
    pretty = false,
    resource = {},
    fieldMappings = {},
  } = options;

  const minLevelPriority = levelPriority[minLevel];

  /**
   * Convert observability log level to structured log level
   */
  const mapLogLevel = (level: string): LogLevel => {
    switch (level) {
      case 'debug':
        return 'debug';
      case 'info':
        return 'info';
      case 'warn':
        return 'warn';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  /**
   * Format timestamp
   */
  const formatTimestamp = (timestamp: number): string | number => {
    return timestampFormat === 'iso'
      ? new Date(timestamp).toISOString()
      : timestamp;
  };

  /**
   * Apply field mappings
   */
  const applyFieldMappings = (entry: Record<string, unknown>): Record<string, unknown> => {
    if (Object.keys(fieldMappings).length === 0) return entry;

    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(entry)) {
      const mappedKey = fieldMappings[key] || key;
      mapped[mappedKey] = value;
    }
    return mapped;
  };

  /**
   * Format log entry based on format
   */
  const formatEntry = (entry: StructuredLogEntry): Record<string, unknown> => {
    const base = applyFieldMappings(entry);

    switch (format) {
      case 'bunyan':
        // Bunyan uses numeric levels
        return {
          ...base,
          v: 0, // Bunyan version
          level: levelPriority[entry.level],
        };

      case 'pino':
        // Pino uses numeric levels
        return {
          ...base,
          level: levelPriority[entry.level],
        };

      case 'winston':
        // Winston uses string levels
        return {
          ...base,
          level: entry.level,
          message: entry.msg,
        };

      case 'generic':
      default:
        return base;
    }
  };

  /**
   * Write log entry
   */
  const writeLog = (entry: StructuredLogEntry): void => {
    const priority = levelPriority[entry.level];
    if (priority < minLevelPriority) return;

    const formatted = formatEntry(entry);
    const json = pretty
      ? JSON.stringify(formatted, null, 2)
      : JSON.stringify(formatted);

    output(json);
  };

  /**
   * Process span start event
   */
  const processSpanStart = (event: ObservabilityEvent): void => {
    if (!isSpanStartEvent(event)) return;

    const entry: StructuredLogEntry = {
      time: formatTimestamp(event.timestamp),
      level: 'debug',
      msg: `Span started: ${event.operation}`,
      event_type: 'span.start',
      trace_id: event.traceId,
      span_id: event.spanId,
      ...(event.parentSpanId ? { parent_span_id: event.parentSpanId } : {}),
      operation: event.operation,
      ...(event.attributes || {}),
      ...(event.resource || resource),
    };

    writeLog(entry);
  };

  /**
   * Process span end event
   */
  const processSpanEnd = (event: ObservabilityEvent): void => {
    if (!isSpanEndEvent(event)) return;

    const level: LogLevel = event.status === 'error' ? 'error' : 'debug';

    const entry: StructuredLogEntry = {
      time: formatTimestamp(event.timestamp),
      level,
      msg: event.status === 'error'
        ? `Span failed: ${event.spanId}`
        : `Span completed: ${event.spanId}`,
      event_type: 'span.end',
      span_id: event.spanId,
      duration_ms: event.duration,
      status: event.status,
      ...(event.error ? {
        error_type: event.error.type,
        error_message: event.error.message,
        error_stack: event.error.stack,
      } : {}),
    };

    writeLog(entry);
  };

  /**
   * Process metric event
   */
  const processMetric = (event: ObservabilityEvent): void => {
    if (!isMetricEvent(event)) return;

    const entry: StructuredLogEntry = {
      time: formatTimestamp(event.timestamp),
      level: 'info',
      msg: `Metric: ${event.name}`,
      event_type: 'metric',
      metric_name: event.name,
      metric_kind: event.kind,
      metric_value: event.value,
      ...(event.labels || {}),
      ...(event.traceId ? { trace_id: event.traceId } : {}),
      ...(event.spanId ? { span_id: event.spanId } : {}),
      ...(event.resource || resource),
    };

    writeLog(entry);
  };

  /**
   * Process log event
   */
  const processLog = (event: ObservabilityEvent): void => {
    if (!isLogEvent(event)) return;

    const level = mapLogLevel(event.level);

    const entry: StructuredLogEntry = {
      time: formatTimestamp(event.timestamp),
      level,
      msg: event.message,
      event_type: 'log',
      ...(event.context || {}),
      ...(event.traceId ? { trace_id: event.traceId } : {}),
      ...(event.spanId ? { span_id: event.spanId } : {}),
      ...(event.resource || resource),
    };

    writeLog(entry);
  };

  /**
   * Process custom event
   */
  const processCustom = (event: ObservabilityEvent): void => {
    if (!isCustomEvent(event)) return;

    const entry: StructuredLogEntry = {
      time: formatTimestamp(event.timestamp),
      level: 'info',
      msg: `Custom event: ${event.type}`,
      event_type: 'custom',
      custom_event_type: event.type,
      data: event.data,
      ...(event.traceId ? { trace_id: event.traceId } : {}),
      ...(event.spanId ? { span_id: event.spanId } : {}),
    };

    writeLog(entry);
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
    } else if (isCustomEvent(event)) {
      processCustom(event);
    }
  };

  return {
    process,
  };
};

/**
 * Create adapter with file output
 *
 * Writes structured logs to a file (NDJSON format).
 */
export const createFileLogAdapter = (options: {
  filePath: string;
  adapterOptions?: StructuredLogAdapterOptions;
}): {
  process: (event: ObservabilityEvent) => void;
  close: () => void;
} => {
  const { filePath, adapterOptions = {} } = options;

  // In a real implementation, this would use fs to write to file
  // For now, we just log
  const output = (log: string): void => {
    console.log(`[File: ${filePath}] ${log}`);
  };

  const adapter = createStructuredLogAdapter({
    ...adapterOptions,
    output,
    pretty: false, // NDJSON should not be pretty
  });

  const close = (): void => {
    console.log(`[File: ${filePath}] Closed`);
  };

  return {
    process: adapter.process,
    close,
  };
};
