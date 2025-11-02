/**
 * @packageDocumentation
 * Sentry adapter for error tracking and performance monitoring
 *
 * Features:
 * - Error and exception tracking
 * - Performance monitoring (transactions, spans)
 * - Release tracking and source maps
 * - User context and feedback
 * - Breadcrumbs for debugging
 * - Custom tags and contexts
 *
 * @example
 * ```typescript
 * import { createSentryAdapter } from '@servicejs/adapter-sentry';
 *
 * const adapter = createSentryAdapter();
 * await adapter.init({
 *   dsn: 'https://...@sentry.io/...',
 *   environment: 'production',
 *   release: 'myapp@1.0.0'
 * });
 *
 * // Track an error
 * await adapter.captureError(new Error('Something went wrong'));
 *
 * // Start a transaction
 * const transaction = await adapter.startTransaction('api.request', 'http');
 * // ... do work ...
 * await adapter.finishTransaction(transaction.value.id);
 * ```
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * Sentry configuration
 */
export interface SentryConfig {
  /** Sentry DSN (Data Source Name) */
  dsn: string;
  /** Environment name (e.g., 'production', 'staging') */
  environment?: string;
  /** Release version */
  release?: string;
  /** Sample rate for error events (0.0 to 1.0) */
  sampleRate?: number;
  /** Sample rate for performance transactions (0.0 to 1.0) */
  tracesSampleRate?: number;
  /** Enable debug mode */
  debug?: boolean;
}

/**
 * Sentry severity levels
 */
export type SentrySeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * User context
 */
export interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
  [key: string]: any;
}

/**
 * Breadcrumb for debugging
 */
export interface SentryBreadcrumb {
  message: string;
  category?: string;
  level?: SentrySeverity;
  timestamp?: number;
  data?: Record<string, any>;
}

/**
 * Transaction for performance monitoring
 */
export interface SentryTransaction {
  id: string;
  name: string;
  op: string;
  startTime: number;
  tags?: Record<string, string>;
  data?: Record<string, any>;
}

/**
 * Span within a transaction
 */
export interface SentrySpan {
  id: string;
  transactionId: string;
  op: string;
  description?: string;
  startTime: number;
  tags?: Record<string, string>;
}

/**
 * Event sent to Sentry
 */
export interface SentryEvent {
  id: string;
  message?: string;
  level: SentrySeverity;
  timestamp: number;
  tags?: Record<string, string>;
  user?: SentryUser;
  contexts?: Record<string, any>;
  breadcrumbs?: SentryBreadcrumb[];
}

/**
 * Sentry adapter interface
 */
export interface SentryAdapter {
  // Lifecycle methods
  init(config: SentryConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  // Error tracking
  captureError(error: Error, tags?: Record<string, string>): Promise<Result<string, Error>>;
  captureMessage(message: string, level?: SentrySeverity, tags?: Record<string, string>): Promise<Result<string, Error>>;
  captureException(exception: any, tags?: Record<string, string>): Promise<Result<string, Error>>;

  // User context
  setUser(user: SentryUser | null): Promise<Result<void, Error>>;
  setTag(key: string, value: string): Promise<Result<void, Error>>;
  setContext(name: string, context: Record<string, any>): Promise<Result<void, Error>>;

  // Breadcrumbs
  addBreadcrumb(breadcrumb: SentryBreadcrumb): Promise<Result<void, Error>>;

  // Performance monitoring
  startTransaction(name: string, op: string, tags?: Record<string, string>): Promise<Result<SentryTransaction, Error>>;
  finishTransaction(transactionId: string): Promise<Result<void, Error>>;
  startSpan(transactionId: string, op: string, description?: string): Promise<Result<SentrySpan, Error>>;
  finishSpan(spanId: string): Promise<Result<void, Error>>;

  // Query events
  getEvents(limit?: number): Promise<Result<SentryEvent[], Error>>;
}

/**
 * Create a Sentry adapter instance
 */
export const createSentryAdapter = (): SentryAdapter => {
  let config: SentryConfig | null = null;
  let currentUser: SentryUser | null = null;
  let globalTags: Record<string, string> = {};
  let globalContexts: Record<string, Record<string, any>> = {};
  let breadcrumbs: SentryBreadcrumb[] = [];
  let events: SentryEvent[] = [];
  let transactions: Map<string, SentryTransaction> = new Map();
  let spans: Map<string, SentrySpan> = new Map();

  return {
    init: async (cfg) => {
      config = cfg;
      globalTags = {};
      globalContexts = {};
      breadcrumbs = [];
      events = [];
      transactions.clear();
      spans.clear();

      // In production, initialize @sentry/node or @sentry/browser here
      console.log(`Sentry initialized with DSN: ${cfg.dsn}`);
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),

    destroy: async () => {
      config = null;
      currentUser = null;
      globalTags = {};
      globalContexts = {};
      breadcrumbs = [];
      events = [];
      transactions.clear();
      spans.clear();
      return ok(undefined);
    },

    health: async () => {
      if (!config) {
        return ok({ status: 'unhealthy' as const });
      }
      return ok({ status: 'healthy' as const });
    },

    captureError: async (error, tags) => {
      if (!config) {
        return err(new Error('Sentry not initialized'));
      }

      const eventId = crypto.randomUUID();
      const event: SentryEvent = {
        id: eventId,
        message: error.message,
        level: 'error',
        timestamp: Date.now(),
        tags: { ...globalTags, ...tags },
        user: currentUser || undefined,
        contexts: globalContexts,
        breadcrumbs: [...breadcrumbs]
      };

      events.push(event);
      console.log(`[Sentry] Error captured: ${error.message} (${eventId})`);

      return ok(eventId);
    },

    captureMessage: async (message, level = 'info', tags) => {
      if (!config) {
        return err(new Error('Sentry not initialized'));
      }

      const eventId = crypto.randomUUID();
      const event: SentryEvent = {
        id: eventId,
        message,
        level,
        timestamp: Date.now(),
        tags: { ...globalTags, ...tags },
        user: currentUser || undefined,
        contexts: globalContexts,
        breadcrumbs: [...breadcrumbs]
      };

      events.push(event);
      console.log(`[Sentry] Message captured: ${message} [${level}] (${eventId})`);

      return ok(eventId);
    },

    captureException: async (exception, tags) => {
      if (!config) {
        return err(new Error('Sentry not initialized'));
      }

      const error = exception instanceof Error ? exception : new Error(String(exception));
      const eventId = crypto.randomUUID();
      const event: SentryEvent = {
        id: eventId,
        message: error.message,
        level: 'error',
        timestamp: Date.now(),
        tags: { ...globalTags, ...tags },
        user: currentUser || undefined,
        contexts: globalContexts,
        breadcrumbs: [...breadcrumbs]
      };

      events.push(event);
      console.log(`[Sentry] Exception captured: ${error.message} (${eventId})`);

      return ok(eventId);
    },

    setUser: async (user) => {
      currentUser = user;
      console.log(`[Sentry] User set:`, user?.id || 'null');
      return ok(undefined);
    },

    setTag: async (key, value) => {
      globalTags[key] = value;
      console.log(`[Sentry] Tag set: ${key}=${value}`);
      return ok(undefined);
    },

    setContext: async (name, context) => {
      globalContexts[name] = context;
      console.log(`[Sentry] Context set: ${name}`);
      return ok(undefined);
    },

    addBreadcrumb: async (breadcrumb) => {
      const fullBreadcrumb: SentryBreadcrumb = {
        ...breadcrumb,
        timestamp: breadcrumb.timestamp || Date.now()
      };
      breadcrumbs.push(fullBreadcrumb);

      // Keep only last 100 breadcrumbs
      if (breadcrumbs.length > 100) {
        breadcrumbs = breadcrumbs.slice(-100);
      }

      console.log(`[Sentry] Breadcrumb added: ${breadcrumb.message}`);
      return ok(undefined);
    },

    startTransaction: async (name, op, tags) => {
      if (!config) {
        return err(new Error('Sentry not initialized'));
      }

      const transaction: SentryTransaction = {
        id: crypto.randomUUID(),
        name,
        op,
        startTime: Date.now(),
        tags,
        data: {}
      };

      transactions.set(transaction.id, transaction);
      console.log(`[Sentry] Transaction started: ${name} (${transaction.id})`);

      return ok(transaction);
    },

    finishTransaction: async (transactionId) => {
      const transaction = transactions.get(transactionId);
      if (!transaction) {
        return err(new Error(`Transaction not found: ${transactionId}`));
      }

      const duration = Date.now() - transaction.startTime;
      console.log(`[Sentry] Transaction finished: ${transaction.name} (${duration}ms)`);

      transactions.delete(transactionId);
      return ok(undefined);
    },

    startSpan: async (transactionId, op, description) => {
      const transaction = transactions.get(transactionId);
      if (!transaction) {
        return err(new Error(`Transaction not found: ${transactionId}`));
      }

      const span: SentrySpan = {
        id: crypto.randomUUID(),
        transactionId,
        op,
        description,
        startTime: Date.now()
      };

      spans.set(span.id, span);
      console.log(`[Sentry] Span started: ${op} - ${description || 'N/A'}`);

      return ok(span);
    },

    finishSpan: async (spanId) => {
      const span = spans.get(spanId);
      if (!span) {
        return err(new Error(`Span not found: ${spanId}`));
      }

      const duration = Date.now() - span.startTime;
      console.log(`[Sentry] Span finished: ${span.op} (${duration}ms)`);

      spans.delete(spanId);
      return ok(undefined);
    },

    getEvents: async (limit = 100) => {
      const result = events.slice(-limit);
      return ok(result);
    }
  };
};
