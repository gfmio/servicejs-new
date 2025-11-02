/**
 * @packageDocumentation
 * New Relic adapter for APM, infrastructure monitoring, and logging
 *
 * Features:
 * - APM (Application Performance Monitoring)
 * - Transaction tracing and segments
 * - Custom metrics and events
 * - Error tracking
 * - Log management
 * - Infrastructure monitoring
 *
 * @example
 * ```typescript
 * import { createNewRelicAdapter } from '@servicejs/adapter-newrelic';
 *
 * const adapter = createNewRelicAdapter();
 * await adapter.init({
 *   licenseKey: 'your-license-key',
 *   appName: 'my-app',
 *   environment: 'production'
 * });
 *
 * // Start a transaction
 * const tx = await adapter.startTransaction('web', '/api/users');
 * // ... do work ...
 * await adapter.endTransaction(tx.value.id);
 * ```
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * New Relic configuration
 */
export interface NewRelicConfig {
  /** New Relic license key */
  licenseKey: string;
  /** Application name */
  appName: string;
  /** Environment (e.g., 'production', 'staging') */
  environment?: string;
  /** Enable distributed tracing */
  distributedTracing?: boolean;
  /** Log level */
  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

/**
 * Transaction types
 */
export type NewRelicTransactionType = 'web' | 'background';

/**
 * Transaction
 */
export interface NewRelicTransaction {
  id: string;
  type: NewRelicTransactionType;
  name: string;
  startTime: number;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Segment (sub-operation within a transaction)
 */
export interface NewRelicSegment {
  id: string;
  transactionId: string;
  name: string;
  category: string;
  startTime: number;
  duration?: number;
}

/**
 * Custom event
 */
export interface NewRelicEvent {
  eventType: string;
  timestamp: number;
  attributes: Record<string, any>;
}

/**
 * Custom metric
 */
export interface NewRelicMetric {
  name: string;
  value: number;
  timestamp: number;
  attributes?: Record<string, string>;
}

/**
 * Error data
 */
export interface NewRelicError {
  error: Error;
  transactionId?: string;
  timestamp: number;
  attributes?: Record<string, any>;
}

/**
 * New Relic adapter interface
 */
export interface NewRelicAdapter {
  // Lifecycle methods
  init(config: NewRelicConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  // Transactions
  startTransaction(type: NewRelicTransactionType, name: string): Promise<Result<NewRelicTransaction, Error>>;
  endTransaction(transactionId: string): Promise<Result<void, Error>>;
  addTransactionAttribute(transactionId: string, key: string, value: string | number | boolean): Promise<Result<void, Error>>;

  // Segments
  startSegment(transactionId: string, name: string, category: string): Promise<Result<NewRelicSegment, Error>>;
  endSegment(segmentId: string): Promise<Result<void, Error>>;

  // Custom metrics
  recordMetric(name: string, value: number, attributes?: Record<string, string>): Promise<Result<void, Error>>;
  incrementMetric(name: string, value?: number): Promise<Result<void, Error>>;

  // Custom events
  recordEvent(eventType: string, attributes: Record<string, any>): Promise<Result<void, Error>>;

  // Error tracking
  noticeError(error: Error, attributes?: Record<string, any>): Promise<Result<void, Error>>;

  // Query
  getTransactions(limit?: number): Promise<Result<NewRelicTransaction[], Error>>;
  getMetrics(limit?: number): Promise<Result<NewRelicMetric[], Error>>;
  getEvents(limit?: number): Promise<Result<NewRelicEvent[], Error>>;
  getErrors(limit?: number): Promise<Result<NewRelicError[], Error>>;
}

/**
 * Create a New Relic adapter instance
 */
export const createNewRelicAdapter = (): NewRelicAdapter => {
  let config: NewRelicConfig | null = null;
  let transactions: Map<string, NewRelicTransaction> = new Map();
  let completedTransactions: NewRelicTransaction[] = [];
  let segments: Map<string, NewRelicSegment> = new Map();
  let metrics: NewRelicMetric[] = [];
  let events: NewRelicEvent[] = [];
  let errors: NewRelicError[] = [];

  const adapter: NewRelicAdapter = {
    init: async (cfg) => {
      config = cfg;
      transactions.clear();
      completedTransactions = [];
      segments.clear();
      metrics = [];
      events = [];
      errors = [];

      // In production, initialize newrelic module here
      console.log(`New Relic initialized: ${cfg.appName} [${cfg.environment || 'production'}]`);
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),

    destroy: async () => {
      config = null;
      transactions.clear();
      completedTransactions = [];
      segments.clear();
      metrics = [];
      events = [];
      errors = [];
      return ok(undefined);
    },

    health: async () => {
      if (!config) {
        return ok({ status: 'unhealthy' as const });
      }
      return ok({ status: 'healthy' as const });
    },

    startTransaction: async (type, name) => {
      if (!config) {
        return err(new Error('New Relic not initialized'));
      }

      const transaction: NewRelicTransaction = {
        id: crypto.randomUUID(),
        type,
        name,
        startTime: Date.now(),
        attributes: {}
      };

      transactions.set(transaction.id, transaction);
      console.log(`[New Relic] Transaction started: ${name} [${type}] (${transaction.id})`);

      return ok(transaction);
    },

    endTransaction: async (transactionId) => {
      const transaction = transactions.get(transactionId);
      if (!transaction) {
        return err(new Error(`Transaction not found: ${transactionId}`));
      }

      const duration = Date.now() - transaction.startTime;
      completedTransactions.push(transaction);
      transactions.delete(transactionId);

      console.log(`[New Relic] Transaction ended: ${transaction.name} (${duration}ms)`);

      return ok(undefined);
    },

    addTransactionAttribute: async (transactionId, key, value) => {
      const transaction = transactions.get(transactionId);
      if (!transaction) {
        return err(new Error(`Transaction not found: ${transactionId}`));
      }

      if (!transaction.attributes) {
        transaction.attributes = {};
      }
      transaction.attributes[key] = value;

      console.log(`[New Relic] Transaction attribute: ${key}=${value}`);

      return ok(undefined);
    },

    startSegment: async (transactionId, name, category) => {
      const transaction = transactions.get(transactionId);
      if (!transaction) {
        return err(new Error(`Transaction not found: ${transactionId}`));
      }

      const segment: NewRelicSegment = {
        id: crypto.randomUUID(),
        transactionId,
        name,
        category,
        startTime: Date.now()
      };

      segments.set(segment.id, segment);
      console.log(`[New Relic] Segment started: ${name} [${category}]`);

      return ok(segment);
    },

    endSegment: async (segmentId) => {
      const segment = segments.get(segmentId);
      if (!segment) {
        return err(new Error(`Segment not found: ${segmentId}`));
      }

      segment.duration = Date.now() - segment.startTime;
      segments.delete(segmentId);

      console.log(`[New Relic] Segment ended: ${segment.name} (${segment.duration}ms)`);

      return ok(undefined);
    },

    recordMetric: async (name, value, attributes) => {
      if (!config) {
        return err(new Error('New Relic not initialized'));
      }

      const metric: NewRelicMetric = {
        name,
        value,
        timestamp: Date.now(),
        attributes
      };

      metrics.push(metric);
      console.log(`[New Relic] Metric: ${name} = ${value}`);

      return ok(undefined);
    },

    incrementMetric: async (name, value = 1) => {
      return adapter.recordMetric(name, value);
    },

    recordEvent: async (eventType, attributes) => {
      if (!config) {
        return err(new Error('New Relic not initialized'));
      }

      const event: NewRelicEvent = {
        eventType,
        timestamp: Date.now(),
        attributes
      };

      events.push(event);
      console.log(`[New Relic] Event: ${eventType}`);

      return ok(undefined);
    },

    noticeError: async (error, attributes) => {
      if (!config) {
        return err(new Error('New Relic not initialized'));
      }

      const errorData: NewRelicError = {
        error,
        timestamp: Date.now(),
        attributes
      };

      errors.push(errorData);
      console.log(`[New Relic] Error: ${error.message}`);

      return ok(undefined);
    },

    getTransactions: async (limit = 100) => {
      const result = completedTransactions.slice(-limit);
      return ok(result);
    },

    getMetrics: async (limit = 100) => {
      const result = metrics.slice(-limit);
      return ok(result);
    },

    getEvents: async (limit = 100) => {
      const result = events.slice(-limit);
      return ok(result);
    },

    getErrors: async (limit = 100) => {
      const result = errors.slice(-limit);
      return ok(result);
    }
  };

  return adapter;
};
