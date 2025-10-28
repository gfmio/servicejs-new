/**
 * Axiom adapter - sends events to Axiom (axiom.co)
 *
 * Axiom is a serverless log analytics platform. This adapter sends
 * all observability events to an Axiom dataset.
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
// Axiom Types
// ============================================================================

/**
 * Axiom event (any JSON object)
 */
export interface AxiomEvent {
  /** Timestamp (ISO 8601) */
  _time: string;

  /** Event fields */
  [key: string]: unknown;
}

/**
 * Axiom ingest response
 */
export interface AxiomIngestResponse {
  ingested: number;
  failed: number;
  failures?: Array<{
    timestamp: string;
    error: string;
  }>;
  processedBytes: number;
  blocksCreated: number;
  walLength: number;
}

// ============================================================================
// Axiom Adapter
// ============================================================================

export interface AxiomAdapterOptions {
  /** Axiom API token */
  token: string;

  /** Axiom dataset name */
  dataset: string;

  /** Axiom API URL (default: https://api.axiom.co) */
  url?: string;

  /** Batch size for ingestion */
  batchSize?: number;

  /** Flush interval in milliseconds */
  flushInterval?: number;

  /** Resource attributes to add to all events */
  resource?: Record<string, unknown>;

  /** Custom transform function */
  transform?: (event: ObservabilityEvent) => AxiomEvent | AxiomEvent[] | null;
}

/**
 * Create Axiom adapter
 *
 * Sends all observability events to Axiom for analysis and querying.
 *
 * @example
 * ```typescript
 * const adapter = createAxiomAdapter({
 *   token: process.env.AXIOM_TOKEN,
 *   dataset: 'my-service-telemetry',
 *   batchSize: 1000,
 *   flushInterval: 10000,
 *   resource: {
 *     service: 'my-service',
 *     environment: 'production',
 *   },
 * });
 *
 * observability.emit = (event) => {
 *   adapter.process(event);
 * };
 *
 * // Flush on shutdown
 * process.on('SIGTERM', async () => {
 *   await adapter.flush();
 *   await adapter.shutdown();
 * });
 * ```
 */
export const createAxiomAdapter = (
  options: AxiomAdapterOptions
): {
  process: (event: ObservabilityEvent) => void;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
} => {
  const {
    token,
    dataset,
    url = 'https://api.axiom.co',
    batchSize = 1000,
    flushInterval = 10000,
    resource = {},
    transform,
  } = options;

  if (!token) {
    throw new Error('Axiom token is required');
  }

  if (!dataset) {
    throw new Error('Axiom dataset is required');
  }

  const buffer: AxiomEvent[] = [];
  let flushTimer: Timer | null = null;
  let isFlushing = false;

  /**
   * Convert ObservabilityEvent to Axiom event
   */
  const convertToAxiomEvent = (event: ObservabilityEvent): AxiomEvent | AxiomEvent[] | null => {
    // Use custom transform if provided
    if (transform) {
      return transform(event);
    }

    // Default conversion with type guards
    const base: AxiomEvent = {
      _time: new Date(event.timestamp).toISOString(),
      event_type: event.type,
      ...resource,
    };

    if (isSpanStartEvent(event)) {
      return {
        ...base,
        span_id: event.spanId,
        trace_id: event.traceId,
        parent_span_id: event.parentSpanId,
        operation: event.operation,
        ...event.attributes,
        ...event.resource,
      };
    }

    if (isSpanEndEvent(event)) {
      return {
        ...base,
        span_id: event.spanId,
        duration_ms: event.duration,
        status: event.status,
        ...(event.error ? {
          error_type: event.error.type,
          error_message: event.error.message,
          error_stack: event.error.stack,
        } : {}),
      };
    }

    if (isMetricEvent(event)) {
      return {
        ...base,
        metric_name: event.name,
        metric_kind: event.kind,
        metric_value: event.value,
        ...event.labels,
        ...(event.traceId ? { trace_id: event.traceId } : {}),
        ...(event.spanId ? { span_id: event.spanId } : {}),
        ...event.resource,
      };
    }

    if (isLogEvent(event)) {
      return {
        ...base,
        log_level: event.level,
        message: event.message,
        ...event.context,
        ...(event.traceId ? { trace_id: event.traceId } : {}),
        ...(event.spanId ? { span_id: event.spanId } : {}),
        ...event.resource,
      };
    }

    if (isCustomEvent(event)) {
      return {
        ...base,
        custom_event_type: event.type,
        data: event.data,
        ...(event.traceId ? { trace_id: event.traceId } : {}),
        ...(event.spanId ? { span_id: event.spanId } : {}),
      };
    }

    return null;
  };

  /**
   * Process a single event
   */
  const process = (event: ObservabilityEvent): void => {
    const axiomEvents = convertToAxiomEvent(event);

    if (!axiomEvents) return;

    // Handle array of events
    if (Array.isArray(axiomEvents)) {
      buffer.push(...axiomEvents);
    } else {
      buffer.push(axiomEvents);
    }

    // Auto-flush if batch size reached
    if (buffer.length >= batchSize) {
      void flush();
    }
  };

  /**
   * Flush buffered events to Axiom
   */
  const flush = async (): Promise<void> => {
    if (buffer.length === 0 || isFlushing) return;

    isFlushing = true;
    const eventsToSend = buffer.splice(0, buffer.length);

    try {
      const response = await fetch(`${url}/v1/datasets/${dataset}/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'servicejs-observability/0.1.0',
        },
        body: JSON.stringify(eventsToSend),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to ingest events to Axiom: ${response.status} ${error}`);

        // Put events back in buffer for retry
        buffer.unshift(...eventsToSend);
      } else {
        const result = await response.json() as AxiomIngestResponse;

        if (result.failed > 0) {
          console.warn(`Axiom ingest had ${result.failed} failures`);
          if (result.failures) {
            result.failures.forEach((failure) => {
              console.warn(`  - ${failure.timestamp}: ${failure.error}`);
            });
          }
        }
      }
    } catch (error) {
      console.error('Error flushing events to Axiom:', error);

      // Put events back in buffer for retry
      buffer.unshift(...eventsToSend);
    } finally {
      isFlushing = false;
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

/**
 * Create Axiom adapter with query support
 *
 * Adds the ability to query Axiom for analysis.
 */
export const createAxiomAdapterWithQuery = (
  options: AxiomAdapterOptions
): {
  process: (event: ObservabilityEvent) => void;
  flush: () => Promise<void>;
  shutdown: () => Promise<void>;
  query: (apl: string, startTime?: string, endTime?: string) => Promise<unknown>;
} => {
  const adapter = createAxiomAdapter(options);
  const { token, dataset, url = 'https://api.axiom.co' } = options;

  /**
   * Query Axiom using APL (Axiom Processing Language)
   *
   * @example
   * ```typescript
   * // Get error count by service
   * const result = await adapter.query(`
   *   ['my-dataset']
   *   | where event_type == 'log' and log_level == 'error'
   *   | summarize count() by service
   * `);
   * ```
   */
  const query = async (
    apl: string,
    startTime?: string,
    endTime?: string
  ): Promise<unknown> => {
    try {
      const body: Record<string, unknown> = {
        apl,
      };

      if (startTime) body['startTime'] = startTime;
      if (endTime) body['endTime'] = endTime;

      const response = await fetch(`${url}/v1/datasets/${dataset}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'servicejs-observability/0.1.0',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Axiom query failed: ${response.status} ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error querying Axiom:', error);
      throw error;
    }
  };

  return {
    ...adapter,
    query,
  };
};
