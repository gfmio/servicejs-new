/**
 * Prometheus adapter - aggregates metrics for Prometheus scraping
 *
 * This adapter aggregates MetricEvents into Prometheus-compatible metrics
 * and provides a /metrics endpoint format.
 */

import type { ObservabilityEvent } from '../types.js';
import { isMetricEvent } from '../types.js';

// ============================================================================
// Prometheus Types
// ============================================================================

/**
 * Prometheus metric type
 */
export type PrometheusMetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Prometheus metric sample
 */
export interface PrometheusSample {
  labels: Record<string, string>;
  value: number;
  timestamp?: number;
}

/**
 * Prometheus metric
 */
export interface PrometheusMetric {
  name: string;
  type: PrometheusMetricType;
  help: string;
  samples: PrometheusSample[];
}

/**
 * Histogram bucket
 */
export interface HistogramBucket {
  le: number; // Upper bound
  count: number;
}

/**
 * Histogram data
 */
export interface HistogramData {
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

// ============================================================================
// Prometheus Adapter
// ============================================================================

export interface PrometheusAdapterOptions {
  /** Default buckets for histograms */
  histogramBuckets?: number[];

  /** Default quantiles for summaries */
  summaryQuantiles?: number[];

  /** Maximum age for summary observations (ms) */
  summaryMaxAge?: number;

  /** Resource attributes to add as labels */
  resource?: Record<string, string>;

  /** Prefix for all metric names */
  prefix?: string;
}

/**
 * Create Prometheus adapter
 *
 * Aggregates metrics from ObservabilityEvents and provides Prometheus format.
 *
 * @example
 * ```typescript
 * const adapter = createPrometheusAdapter({
 *   histogramBuckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
 *   prefix: 'myapp_',
 * });
 *
 * observability.emit = (event) => {
 *   adapter.process(event);
 * };
 *
 * // Get metrics in Prometheus format
 * const metrics = adapter.getMetrics();
 *
 * // Serve metrics endpoint
 * server.get('/metrics', (req, res) => {
 *   res.set('Content-Type', 'text/plain; version=0.0.4');
 *   res.send(adapter.format());
 * });
 * ```
 */
export const createPrometheusAdapter = (
  options: PrometheusAdapterOptions = {}
): {
  process: (event: ObservabilityEvent) => void;
  getMetrics: () => PrometheusMetric[];
  format: () => string;
  reset: () => void;
} => {
  const {
    histogramBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    resource = {},
    prefix = '',
  } = options;

  // Metric storage
  const counters = new Map<string, Map<string, number>>();
  const gauges = new Map<string, Map<string, number>>();
  const histograms = new Map<string, Map<string, HistogramData>>();
  const summaries = new Map<string, Map<string, number[]>>();

  /**
   * Generate label string for grouping
   */
  const labelKey = (labels: Record<string, string>): string => {
    const entries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  };

  /**
   * Merge labels with resource attributes
   */
  const mergeLabels = (labels?: Record<string, string>): Record<string, string> => {
    return { ...resource, ...(labels || {}) };
  };

  /**
   * Process a single event
   */
  const process = (event: ObservabilityEvent): void => {
    if (!isMetricEvent(event)) return;

    const metricName = prefix + event.name.replace(/\./g, '_');
    const labels = mergeLabels(event.labels);
    const key = labelKey(labels);

    switch (event.kind) {
      case 'counter':
        processCounter(metricName, key, labels, event.value);
        break;
      case 'gauge':
        processGauge(metricName, key, labels, event.value);
        break;
      case 'histogram':
        processHistogram(metricName, key, labels, event.value);
        break;
    }
  };

  /**
   * Process counter metric
   */
  const processCounter = (
    name: string,
    key: string,
    _labels: Record<string, string>,
    value: number
  ): void => {
    if (!counters.has(name)) {
      counters.set(name, new Map());
    }

    const counterMap = counters.get(name)!;
    const current = counterMap.get(key) || 0;
    counterMap.set(key, current + value);
  };

  /**
   * Process gauge metric
   */
  const processGauge = (
    name: string,
    key: string,
    _labels: Record<string, string>,
    value: number
  ): void => {
    if (!gauges.has(name)) {
      gauges.set(name, new Map());
    }

    const gaugeMap = gauges.get(name)!;
    gaugeMap.set(key, value);
  };

  /**
   * Process histogram metric
   */
  const processHistogram = (
    name: string,
    key: string,
    _labels: Record<string, string>,
    value: number
  ): void => {
    if (!histograms.has(name)) {
      histograms.set(name, new Map());
    }

    const histogramMap = histograms.get(name)!;
    let histogram = histogramMap.get(key);

    if (!histogram) {
      histogram = {
        buckets: histogramBuckets.map((le) => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      };
      histogramMap.set(key, histogram);
    }

    // Update buckets
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }

    histogram.sum += value;
    histogram.count++;
  };

  /**
   * Get all metrics
   */
  const getMetrics = (): PrometheusMetric[] => {
    const metrics: PrometheusMetric[] = [];

    // Counters
    for (const [name, counterMap] of counters) {
      const samples: PrometheusSample[] = [];
      for (const [key, value] of counterMap) {
        const labels = JSON.parse(key) as [string, string][];
        samples.push({
          labels: Object.fromEntries(labels),
          value,
        });
      }

      metrics.push({
        name,
        type: 'counter',
        help: `Counter metric ${name}`,
        samples,
      });
    }

    // Gauges
    for (const [name, gaugeMap] of gauges) {
      const samples: PrometheusSample[] = [];
      for (const [key, value] of gaugeMap) {
        const labels = JSON.parse(key) as [string, string][];
        samples.push({
          labels: Object.fromEntries(labels),
          value,
        });
      }

      metrics.push({
        name,
        type: 'gauge',
        help: `Gauge metric ${name}`,
        samples,
      });
    }

    // Histograms
    for (const [name, histogramMap] of histograms) {
      for (const [key, histogram] of histogramMap) {
        const baseLabels = JSON.parse(key) as [string, string][];
        const labels = Object.fromEntries(baseLabels);

        // Bucket samples
        const samples: PrometheusSample[] = [];
        for (const bucket of histogram.buckets) {
          samples.push({
            labels: { ...labels, le: String(bucket.le) },
            value: bucket.count,
          });
        }

        // +Inf bucket
        samples.push({
          labels: { ...labels, le: '+Inf' },
          value: histogram.count,
        });

        metrics.push({
          name: `${name}_bucket`,
          type: 'histogram',
          help: `Histogram metric ${name}`,
          samples,
        });

        // Sum
        metrics.push({
          name: `${name}_sum`,
          type: 'histogram',
          help: `Histogram sum ${name}`,
          samples: [{ labels, value: histogram.sum }],
        });

        // Count
        metrics.push({
          name: `${name}_count`,
          type: 'histogram',
          help: `Histogram count ${name}`,
          samples: [{ labels, value: histogram.count }],
        });
      }
    }

    return metrics;
  };

  /**
   * Format metrics in Prometheus text format
   */
  const format = (): string => {
    const lines: string[] = [];
    const metrics = getMetrics();

    // Group metrics by base name
    const metricGroups = new Map<string, PrometheusMetric[]>();
    for (const metric of metrics) {
      const baseName = metric.name.replace(/_(bucket|sum|count)$/, '');
      if (!metricGroups.has(baseName)) {
        metricGroups.set(baseName, []);
      }
      metricGroups.get(baseName)!.push(metric);
    }

    for (const [baseName, groupMetrics] of metricGroups) {
      const firstMetric = groupMetrics[0];
      if (!firstMetric) continue;

      // Add HELP and TYPE
      lines.push(`# HELP ${baseName} ${firstMetric.help}`);
      lines.push(`# TYPE ${baseName} ${firstMetric.type}`);

      // Add samples
      for (const metric of groupMetrics) {
        for (const sample of metric.samples) {
          const labelStr = Object.entries(sample.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');

          const name = metric.name;
          const value = sample.value;
          const timestamp = sample.timestamp ? ` ${sample.timestamp}` : '';

          if (labelStr) {
            lines.push(`${name}{${labelStr}} ${value}${timestamp}`);
          } else {
            lines.push(`${name} ${value}${timestamp}`);
          }
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  };

  /**
   * Reset all metrics
   */
  const reset = (): void => {
    counters.clear();
    gauges.clear();
    histograms.clear();
    summaries.clear();
  };

  return {
    process,
    getMetrics,
    format,
    reset,
  };
};
