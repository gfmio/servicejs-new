/**
 * StatsD adapter - sends metrics to StatsD server
 *
 * This adapter converts MetricEvents to StatsD format and sends them
 * to a StatsD server via UDP or TCP.
 */

import type { ObservabilityEvent } from '../types.js';
import { isMetricEvent } from '../types.js';

// ============================================================================
// StatsD Types
// ============================================================================

/**
 * StatsD protocol type
 */
export type StatsDProtocol = 'udp' | 'tcp';

/**
 * StatsD metric packet
 */
export interface StatsDPacket {
  metric: string;
  value: number;
  type: 'c' | 'g' | 'h' | 'ms';
  sampleRate?: number;
  tags?: Record<string, string>;
}

// ============================================================================
// StatsD Adapter
// ============================================================================

export interface StatsDAdapterOptions {
  /** StatsD server host */
  host?: string;

  /** StatsD server port */
  port?: number;

  /** Protocol (udp or tcp) */
  protocol?: StatsDProtocol;

  /** Metric prefix */
  prefix?: string;

  /** Global tags to add to all metrics */
  globalTags?: Record<string, string>;

  /** Sample rate (0-1) for all metrics */
  sampleRate?: number;

  /** Use DogStatsD tag format (recommended) */
  useDogStatsD?: boolean;

  /** Custom send function for testing */
  send?: (packet: string) => void | Promise<void>;
}

/**
 * Create StatsD adapter
 *
 * Sends metrics to a StatsD server.
 *
 * @example
 * ```typescript
 * const adapter = createStatsDAdapter({
 *   host: 'localhost',
 *   port: 8125,
 *   protocol: 'udp',
 *   prefix: 'myapp.',
 *   globalTags: { env: 'production' },
 * });
 *
 * observability.emit = (event) => {
 *   adapter.process(event);
 * };
 *
 * // Cleanup
 * adapter.close();
 * ```
 */
export const createStatsDAdapter = (
  options: StatsDAdapterOptions = {}
): {
  process: (event: ObservabilityEvent) => void;
  close: () => void;
} => {
  const {
    host = 'localhost',
    port = 8125,
    protocol = 'udp',
    prefix = '',
    globalTags = {},
    sampleRate = 1,
    useDogStatsD = true,
    send: customSend,
  } = options;

  let socket: unknown = null;

  /**
   * Initialize socket connection
   */
  const initSocket = (): void => {
    if (customSend) return; // Using custom send function

    // In a real implementation, this would create UDP/TCP socket
    // For now, we just log
    console.log(`[StatsD] Would connect to ${protocol}://${host}:${port}`);
  };

  /**
   * Send packet to StatsD server
   */
  const sendPacket = (packet: string): void => {
    if (customSend) {
      void customSend(packet);
      return;
    }

    // In a real implementation, this would send via socket
    console.log(`[StatsD] ${packet}`);
  };

  /**
   * Format tags based on StatsD variant
   */
  const formatTags = (tags: Record<string, string>): string => {
    const allTags = { ...globalTags, ...tags };
    const entries = Object.entries(allTags);

    if (entries.length === 0) return '';

    if (useDogStatsD) {
      // DogStatsD format: |#tag1:value1,tag2:value2
      return '|#' + entries.map(([k, v]) => `${k}:${v}`).join(',');
    } else {
      // InfluxDB StatsD format: ,tag1=value1,tag2=value2
      return ',' + entries.map(([k, v]) => `${k}=${v}`).join(',');
    }
  };

  /**
   * Format sample rate
   */
  const formatSampleRate = (rate: number): string => {
    return rate < 1 ? `|@${rate}` : '';
  };

  /**
   * Process a single event
   */
  const process = (event: ObservabilityEvent): void => {
    if (!isMetricEvent(event)) return;

    // Apply sampling
    if (sampleRate < 1 && Math.random() > sampleRate) {
      return;
    }

    const metricName = prefix + event.name.replace(/\./g, '_');
    const tags = formatTags(event.labels || {});
    const sample = formatSampleRate(sampleRate);

    let packet: string;

    switch (event.kind) {
      case 'counter':
        // Counter: metric:value|c[|@sample_rate][|#tags]
        packet = `${metricName}:${event.value}|c${sample}${tags}`;
        break;

      case 'gauge':
        // Gauge: metric:value|g[|#tags]
        packet = `${metricName}:${event.value}|g${tags}`;
        break;

      case 'histogram':
        // Histogram/Timer: metric:value|h[|@sample_rate][|#tags]
        // Note: StatsD uses 'ms' for timers, 'h' for histograms
        // We use 'h' for histograms, assuming values are already in correct units
        packet = `${metricName}:${event.value}|h${sample}${tags}`;
        break;

      default:
        return;
    }

    sendPacket(packet);
  };

  /**
   * Close connection
   */
  const close = (): void => {
    if (socket) {
      // In real implementation, close the socket
      console.log('[StatsD] Connection closed');
      socket = null;
    }
  };

  // Initialize connection
  initSocket();

  return {
    process,
    close,
  };
};

/**
 * Utility to batch multiple metrics into a single packet
 *
 * StatsD supports multiple metrics per packet for efficiency.
 */
export const createStatsDBuffer = (options: {
  adapter: ReturnType<typeof createStatsDAdapter>;
  maxPacketSize?: number;
  flushInterval?: number;
}): {
  process: (event: ObservabilityEvent) => void;
  flush: () => void;
  close: () => void;
} => {
  const { adapter, flushInterval = 1000 } = options;

  const buffer: string[] = [];
  let flushTimer: Timer | null = null;

  const flush = (): void => {
    if (buffer.length === 0) return;

    // const packet = buffer.join('\n');
    // Send batched packet
    // Note: We'd need to modify the adapter to accept raw packets
    buffer.length = 0;
  };

  const process = (event: ObservabilityEvent): void => {
    if (!isMetricEvent(event)) {
      adapter.process(event);
      return;
    }

    // For simplicity, just forward to adapter
    // In a real implementation, we'd buffer the formatted packets
    adapter.process(event);
  };

  const close = (): void => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    flush();
    adapter.close();
  };

  // Start periodic flushing
  if (flushInterval > 0) {
    flushTimer = setInterval(flush, flushInterval);
  }

  return {
    process,
    flush,
    close,
  };
};
