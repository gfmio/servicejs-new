/**
 * @servicejs/observability
 *
 * Events-based observability system for ServiceJS
 * Framework-agnostic tracing, metrics, and logging
 */

// Core types
export type {
  ObservabilityEvent,
  SpanStartEvent,
  SpanEndEvent,
  MetricEvent,
  LogEvent,
  CustomEvent,
  TraceContext,
  SpanContext,
  ResourceAttributes,
  TelemetryConfig,
  LogLevel,
  SpanStatus,
  EventFilter,
} from './types.js';

export {
  isSpanStartEvent,
  isSpanEndEvent,
  isMetricEvent,
  isLogEvent,
  isCustomEvent,
} from './types.js';

// ID generation
export {
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  formatTraceparent,
  parseTraceparent,
  formatTracestate,
  parseTracestate,
} from './ids.js';

// Observability capability
export type { ObservabilityCapability } from './capability.js';
export {
  createInMemoryObservability,
  createNoOpObservability,
  createCompositeObservability,
} from './capability.js';

// Context propagation
export {
  injectTraceContext,
  extractTraceContext,
  removeTraceContext,
  injectTraceHeaders,
  extractTraceHeaders,
  withTraceContext,
  getTraceContext,
  addBaggage,
  getBaggage,
  removeBaggage,
} from './context.js';

// Message interception
export type {
  Capability,
  MessageObservabilityOptions,
  Component,
  ComponentInstrumentationOptions,
} from './interception.js';
export {
  withMessageObservability,
  withComponentInstrumentation,
  traced,
  Traced,
} from './interception.js';

// Event storage and querying
export type { EventBufferOptions, EventRecorderOptions, Trace, Span } from './storage.js';
export {
  createEventBuffer,
  createEventRecorder,
  reconstructTrace,
  aggregateMetrics,
  queryLogs,
} from './storage.js';

// Adapters
export type { ConsoleAdapterOptions } from './adapters/console.js';
export { createConsoleAdapter } from './adapters/console.js';

export type {
  OTelSpan,
  OTelMetric,
  OTelLog,
  OTelExportResult,
  OpenTelemetryAdapterOptions,
} from './adapters/opentelemetry.js';
export { createOpenTelemetryAdapter } from './adapters/opentelemetry.js';

export type {
  PrometheusMetricType,
  PrometheusSample,
  PrometheusMetric,
  HistogramBucket,
  HistogramData,
  PrometheusAdapterOptions,
} from './adapters/prometheus.js';
export { createPrometheusAdapter } from './adapters/prometheus.js';

export type {
  StatsDProtocol,
  StatsDPacket,
  StatsDAdapterOptions,
} from './adapters/statsd.js';
export { createStatsDAdapter, createStatsDBuffer } from './adapters/statsd.js';

export type {
  LogLevel as StructuredLogLevel,
  StructuredLogEntry,
  LogFormat,
  StructuredLogAdapterOptions,
} from './adapters/structured-log.js';
export { createStructuredLogAdapter, createFileLogAdapter } from './adapters/structured-log.js';

export type {
  AxiomEvent,
  AxiomIngestResponse,
  AxiomAdapterOptions,
} from './adapters/axiom.js';
export { createAxiomAdapter, createAxiomAdapterWithQuery } from './adapters/axiom.js';
