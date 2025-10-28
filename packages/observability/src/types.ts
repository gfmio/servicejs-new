/**
 * Core observability event types and interfaces
 */

// ============================================================================
// Trace Context Types
// ============================================================================

/**
 * Trace context for distributed tracing
 * Compatible with W3C Trace Context specification
 */
export interface TraceContext {
  /** Trace ID - identifies the entire trace */
  traceId: string;

  /** Span ID - identifies this span */
  spanId: string;

  /** Parent span ID - for creating span hierarchy */
  parentSpanId?: string;

  /** Baggage - key-value context propagated across boundaries */
  baggage?: Record<string, string>;

  /** Trace flags (e.g., sampled=01) */
  flags?: number;
}

/**
 * Span context with metadata
 */
export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operation: string;
  startTime: number;
  attributes?: Record<string, unknown>;
}

// ============================================================================
// Resource Attributes
// ============================================================================

/**
 * Resource attributes identify the service/component
 * Based on OpenTelemetry semantic conventions
 */
export interface ResourceAttributes {
  /** Service name (e.g., "api-server") */
  'service.name': string;

  /** Service version (e.g., "1.2.3") */
  'service.version'?: string;

  /** Service instance ID */
  'service.instance.id'?: string;

  /** Host name */
  'host.name'?: string;

  /** Process ID */
  'process.pid'?: number;

  /** Telemetry SDK name */
  'telemetry.sdk.name'?: string;

  /** Telemetry SDK version */
  'telemetry.sdk.version'?: string;

  /** Additional custom attributes */
  [key: string]: string | number | boolean | undefined;
}

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  /** Resource attributes */
  resource: ResourceAttributes;

  /** Sampling configuration */
  sampling?: {
    /** Sampling probability (0.0 to 1.0, where 1.0 = sample all) */
    probability: number;
  };
}

// ============================================================================
// Observability Events
// ============================================================================

/**
 * Span start event - marks the beginning of a span
 */
export interface SpanStartEvent {
  type: 'span.start';

  /** Unique span ID */
  spanId: string;

  /** Parent span ID (for nesting) */
  parentSpanId?: string;

  /** Trace ID (groups related spans) */
  traceId: string;

  /** Operation name (e.g., "http.request", "db.query") */
  operation: string;

  /** Start timestamp (milliseconds since epoch) */
  timestamp: number;

  /** Span attributes */
  attributes?: Record<string, unknown>;

  /** Resource attributes */
  resource?: ResourceAttributes;
}

/**
 * Span end event - marks the end of a span
 */
export interface SpanEndEvent {
  type: 'span.end';

  /** Span ID */
  spanId: string;

  /** Duration in milliseconds */
  duration: number;

  /** Status */
  status: 'ok' | 'error';

  /** End timestamp */
  timestamp: number;

  /** Additional attributes collected during span */
  attributes?: Record<string, unknown>;

  /** Error details if status is 'error' */
  error?: {
    message: string;
    stack?: string;
    type?: string;
  };
}

/**
 * Metric event - represents a metric observation
 */
export interface MetricEvent {
  type: 'metric';

  /** Metric kind */
  kind: 'counter' | 'gauge' | 'histogram';

  /** Metric name (e.g., "http.requests", "memory.usage") */
  name: string;

  /** Metric value */
  value: number;

  /** Metric labels/tags */
  labels?: Record<string, string>;

  /** Timestamp */
  timestamp: number;

  /** Link to span (for exemplars - linking metrics to traces) */
  spanId?: string;

  /** Link to trace */
  traceId?: string;

  /** Resource attributes */
  resource?: ResourceAttributes;
}

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log event - structured log message
 */
export interface LogEvent {
  type: 'log';

  /** Log level */
  level: LogLevel;

  /** Log message */
  message: string;

  /** Structured context */
  context?: Record<string, unknown>;

  /** Timestamp */
  timestamp: number;

  /** Link to active span */
  spanId?: string;

  /** Link to active trace */
  traceId?: string;

  /** Resource attributes */
  resource?: ResourceAttributes;
}

/**
 * Custom event - application-specific events
 */
export interface CustomEvent {
  type: string; // Any string except reserved types

  /** Event data */
  data: unknown;

  /** Timestamp */
  timestamp: number;

  /** Link to active span */
  spanId?: string;

  /** Link to active trace */
  traceId?: string;

  /** Resource attributes */
  resource?: ResourceAttributes;
}

/**
 * Union of all observability events
 */
export type ObservabilityEvent =
  | SpanStartEvent
  | SpanEndEvent
  | MetricEvent
  | LogEvent
  | CustomEvent;

/**
 * Event type guard helpers
 */
export const isSpanStartEvent = (event: ObservabilityEvent): event is SpanStartEvent =>
  event.type === 'span.start';

export const isSpanEndEvent = (event: ObservabilityEvent): event is SpanEndEvent =>
  event.type === 'span.end';

export const isMetricEvent = (event: ObservabilityEvent): event is MetricEvent =>
  event.type === 'metric';

export const isLogEvent = (event: ObservabilityEvent): event is LogEvent =>
  event.type === 'log';

export const isCustomEvent = (event: ObservabilityEvent): event is CustomEvent =>
  !['span.start', 'span.end', 'metric', 'log'].includes(event.type);

// ============================================================================
// Span Status
// ============================================================================

/**
 * Span status
 */
export type SpanStatus = 'ok' | 'error';

// ============================================================================
// Event Filter
// ============================================================================

/**
 * Event filter for querying events
 */
export interface EventFilter {
  /** Filter by event type */
  type?: ObservabilityEvent['type'] | ObservabilityEvent['type'][];

  /** Filter by trace ID */
  traceId?: string;

  /** Filter by span ID */
  spanId?: string;

  /** Filter by time range */
  timeRange?: {
    start: number;
    end: number;
  };

  /** Filter by resource attributes */
  resource?: Partial<ResourceAttributes>;
}
