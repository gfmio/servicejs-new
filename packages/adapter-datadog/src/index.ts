/**
 * @packageDocumentation
 * Datadog adapter for metrics collection, logging, and APM tracing
 *
 * Features:
 * - Custom metrics (gauge, counter, histogram, distribution)
 * - Log aggregation with structured logging
 * - APM (Application Performance Monitoring) tracing
 * - Custom tags and dimensions
 * - Dashboard integration
 *
 * @example
 * ```typescript
 * import { createDatadogAdapter } from '@servicejs/adapter-datadog';
 *
 * const adapter = createDatadogAdapter();
 * await adapter.init({
 *   apiKey: 'your-api-key',
 *   appKey: 'your-app-key',
 *   site: 'datadoghq.com'
 * });
 *
 * // Send a metric
 * await adapter.sendMetric('api.response_time', 125, 'gauge', { endpoint: '/api/users' });
 *
 * // Log a message
 * await adapter.log('info', 'User logged in', { userId: '123' });
 * ```
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Datadog configuration
 */
export interface DatadogConfig {
  /** Datadog API key */
  apiKey: string;
  /** Datadog application key (optional for some operations) */
  appKey?: string;
  /** Datadog site (e.g., 'datadoghq.com', 'datadoghq.eu') */
  site?: string;
  /** Service name */
  service?: string;
  /** Environment (e.g., 'production', 'staging') */
  env?: string;
  /** Version/release */
  version?: string;
  /** Default tags to apply to all metrics/logs */
  tags?: string[];
}

/**
 * Metric types supported by Datadog
 */
export type DatadogMetricType = 'gauge' | 'count' | 'rate' | 'histogram' | 'distribution';

/**
 * Log severity levels
 */
export type DatadogLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Metric data point
 */
export interface DatadogMetric {
  metric: string;
  points: Array<[number, number]>; // [timestamp, value] pairs
  type?: DatadogMetricType;
  tags?: string[];
  host?: string;
}

/**
 * Log entry
 */
export interface DatadogLog {
  message: string;
  level: DatadogLogLevel;
  timestamp: number;
  service?: string;
  tags?: string[];
  attributes?: Record<string, any>;
}

/**
 * APM trace span
 */
export interface DatadogSpan {
  traceId: string;
  spanId: string;
  parentId?: string;
  name: string;
  service: string;
  resource: string;
  start: number;
  duration?: number;
  tags?: Record<string, string>;
  meta?: Record<string, string>;
}

/**
 * Datadog adapter interface
 */
export interface DatadogAdapter {
  // Lifecycle methods
  init(config: DatadogConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  // Metrics
  sendMetric(
    name: string,
    value: number,
    type?: DatadogMetricType,
    tags?: Record<string, string>
  ): Promise<Result<void, Error>>;
  increment(name: string, value?: number, tags?: Record<string, string>): Promise<Result<void, Error>>;
  gauge(name: string, value: number, tags?: Record<string, string>): Promise<Result<void, Error>>;
  histogram(name: string, value: number, tags?: Record<string, string>): Promise<Result<void, Error>>;
  distribution(name: string, value: number, tags?: Record<string, string>): Promise<Result<void, Error>>;

  // Logging
  log(level: DatadogLogLevel, message: string, attributes?: Record<string, any>): Promise<Result<void, Error>>;
  debug(message: string, attributes?: Record<string, any>): Promise<Result<void, Error>>;
  info(message: string, attributes?: Record<string, any>): Promise<Result<void, Error>>;
  warn(message: string, attributes?: Record<string, any>): Promise<Result<void, Error>>;
  error(message: string, attributes?: Record<string, any>): Promise<Result<void, Error>>;

  // APM Tracing
  startSpan(name: string, service: string, resource: string, tags?: Record<string, string>): Promise<Result<DatadogSpan, Error>>;
  finishSpan(spanId: string): Promise<Result<void, Error>>;
  getSpans(limit?: number): Promise<Result<DatadogSpan[], Error>>;

  // Query
  getMetrics(limit?: number): Promise<Result<DatadogMetric[], Error>>;
  getLogs(limit?: number): Promise<Result<DatadogLog[], Error>>;
}

/**
 * Create a Datadog adapter instance
 */
export const createDatadogAdapter = (): DatadogAdapter => {
  let config: DatadogConfig | null = null;
  let metrics: DatadogMetric[] = [];
  let logs: DatadogLog[] = [];
  let spans: Map<string, DatadogSpan> = new Map();
  let completedSpans: DatadogSpan[] = [];

  const tagsToArray = (tags?: Record<string, string>): string[] => {
    if (!tags) return [];
    return Object.entries(tags).map(([k, v]) => `${k}:${v}`);
  };

  const adapter: DatadogAdapter = {
    init: async (cfg) => {
      config = cfg;
      metrics = [];
      logs = [];
      spans.clear();
      completedSpans = [];

      // In production, initialize dd-trace or datadog-metrics here
      console.log(`Datadog initialized for site: ${cfg.site || 'datadoghq.com'}`);
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),

    destroy: async () => {
      config = null;
      metrics = [];
      logs = [];
      spans.clear();
      completedSpans = [];
      return ok(undefined);
    },

    health: async () => {
      if (!config) {
        return ok({ status: 'unhealthy' as const });
      }
      return ok({ status: 'healthy' as const });
    },

    sendMetric: async (name, value, type = 'gauge', tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      const metric: DatadogMetric = {
        metric: name,
        points: [[Date.now(), value]],
        type,
        tags: [...(config.tags || []), ...tagsToArray(tags)],
        host: 'localhost'
      };

      metrics.push(metric);
      console.log(`[Datadog] Metric: ${name} = ${value} [${type}]`);

      return ok(undefined);
    },

    increment: async (name, value = 1, tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      const metric: DatadogMetric = {
        metric: name,
        points: [[Date.now(), value]],
        type: 'count',
        tags: [...(config.tags || []), ...tagsToArray(tags)]
      };

      metrics.push(metric);
      console.log(`[Datadog] Counter: ${name} +${value}`);

      return ok(undefined);
    },

    gauge: async (name, value, tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      return adapter.sendMetric(name, value, 'gauge', tags);
    },

    histogram: async (name, value, tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      return adapter.sendMetric(name, value, 'histogram', tags);
    },

    distribution: async (name, value, tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      return adapter.sendMetric(name, value, 'distribution', tags);
    },

    log: async (level, message, attributes) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      const log: DatadogLog = {
        message,
        level,
        timestamp: Date.now(),
        service: config.service,
        tags: config.tags,
        attributes
      };

      logs.push(log);
      console.log(`[Datadog] Log [${level}]: ${message}`);

      return ok(undefined);
    },

    debug: async (message, attributes) => {
      return adapter.log('debug', message, attributes);
    },

    info: async (message, attributes) => {
      return adapter.log('info', message, attributes);
    },

    warn: async (message, attributes) => {
      return adapter.log('warn', message, attributes);
    },

    error: async (message, attributes) => {
      return adapter.log('error', message, attributes);
    },

    startSpan: async (name, service, resource, tags) => {
      if (!config) {
        return err(new Error('Datadog not initialized'));
      }

      const span: DatadogSpan = {
        traceId: crypto.randomUUID(),
        spanId: crypto.randomUUID(),
        name,
        service,
        resource,
        start: Date.now(),
        tags,
        meta: {}
      };

      spans.set(span.spanId, span);
      console.log(`[Datadog] Span started: ${name} (${span.spanId})`);

      return ok(span);
    },

    finishSpan: async (spanId) => {
      const span = spans.get(spanId);
      if (!span) {
        return err(new Error(`Span not found: ${spanId}`));
      }

      span.duration = Date.now() - span.start;
      completedSpans.push(span);
      spans.delete(spanId);

      console.log(`[Datadog] Span finished: ${span.name} (${span.duration}ms)`);

      return ok(undefined);
    },

    getSpans: async (limit = 100) => {
      const result = completedSpans.slice(-limit);
      return ok(result);
    },

    getMetrics: async (limit = 100) => {
      const result = metrics.slice(-limit);
      return ok(result);
    },

    getLogs: async (limit = 100) => {
      const result = logs.slice(-limit);
      return ok(result);
    }
  };

  return adapter;
};
