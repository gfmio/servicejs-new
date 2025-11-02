/**
 * Webhook Adapter for ServiceJS
 * Send webhooks with retry logic, signature verification, and event tracking
 */

import { ok, err, type Result } from '@servicejs/result';

export interface WebhookConfig {
  secret?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp?: number;
  id?: string;
}

export interface WebhookOptions {
  headers?: Record<string, string>;
  retries?: number;
  timeout?: number;
}

export interface WebhookResponse {
  success: boolean;
  statusCode: number;
  responseBody?: any;
  attempts: number;
  duration: number;
}

export interface WebhookEvent {
  id: string;
  url: string;
  payload: WebhookPayload;
  response?: WebhookResponse;
  status: 'pending' | 'success' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface WebhookAdapter {
  init(config: WebhookConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  send(url: string, payload: WebhookPayload, options?: WebhookOptions): Promise<Result<WebhookResponse, Error>>;
  verifySignature(payload: string, signature: string): Promise<Result<boolean, Error>>;
  generateSignature(payload: string): Promise<Result<string, Error>>;
  listEvents(options?: { limit?: number; status?: 'pending' | 'success' | 'failed' }): Promise<Result<WebhookEvent[], Error>>;
}

export const createWebhookAdapter = (): WebhookAdapter => {
  let config: WebhookConfig | null = null;

  // In-memory event tracking
  const events = new Map<string, WebhookEvent>();

  const generateId = (): string => {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const generateHmacSignature = async (payload: string, secret: string): Promise<string> => {
    // Simple signature generation (in production, use crypto.subtle or similar)
    // This is a placeholder - use proper HMAC-SHA256 in production
    const encoder = new TextEncoder();
    const data = encoder.encode(payload + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const sendWithRetry = async (
    url: string,
    payload: WebhookPayload,
    options: WebhookOptions = {}
  ): Promise<Result<WebhookResponse, Error>> => {
    const maxRetries = options.retries ?? config?.maxRetries ?? 3;
    const timeout = options.timeout ?? config?.timeout ?? 30000;
    const retryDelay = config?.retryDelay ?? 1000;

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const body = JSON.stringify(payload);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'ServiceJS-Webhook/1.0',
          ...options.headers,
        };

        // Add signature if secret is configured
        if (config?.secret) {
          const signature = await generateHmacSignature(body, config.secret);
          headers['X-Webhook-Signature'] = signature;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const responseBody = await response.text();
        let parsedBody: any;
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          parsedBody = responseBody;
        }

        const duration = Date.now() - startTime;
        const webhookResponse: WebhookResponse = {
          success: response.ok,
          statusCode: response.status,
          responseBody: parsedBody,
          attempts: attempt,
          duration,
        };

        if (response.ok) {
          return ok(webhookResponse);
        }

        // If not OK and we have retries left, continue
        if (attempt < maxRetries) {
          await sleep(retryDelay * attempt);
          continue;
        }

        // No more retries
        return ok(webhookResponse);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Retry on network errors
        if (attempt < maxRetries) {
          await sleep(retryDelay * attempt);
          continue;
        }
      }
    }

    return err(lastError || new Error('Webhook delivery failed'));
  };

  return {
    init: async (cfg) => {
      config = {
        maxRetries: 3,
        retryDelay: 1000,
        timeout: 30000,
        ...cfg,
      };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      config = null;
      events.clear();
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    send: async (url, payload, options) => {
      if (!config) return err(new Error('Webhook adapter not initialized'));

      // Create event tracking
      const eventId = generateId();
      const event: WebhookEvent = {
        id: eventId,
        url,
        payload,
        status: 'pending',
        createdAt: new Date(),
      };

      events.set(eventId, event);

      // Add metadata to payload
      const enrichedPayload: WebhookPayload = {
        ...payload,
        timestamp: payload.timestamp ?? Date.now(),
        id: payload.id ?? eventId,
      };

      // Send webhook
      const result = await sendWithRetry(url, enrichedPayload, options);

      // Update event tracking
      event.completedAt = new Date();
      if (result.ok) {
        event.response = result.value;
        event.status = result.value.success ? 'success' : 'failed';
      } else {
        event.status = 'failed';
      }
      events.set(eventId, event);

      return result;
    },

    verifySignature: async (payload, signature) => {
      if (!config?.secret) {
        return err(new Error('Secret not configured'));
      }

      try {
        const expectedSignature = await generateHmacSignature(payload, config.secret);
        return ok(signature === expectedSignature);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    generateSignature: async (payload) => {
      if (!config?.secret) {
        return err(new Error('Secret not configured'));
      }

      try {
        const signature = await generateHmacSignature(payload, config.secret);
        return ok(signature);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listEvents: async (options = {}) => {
      const limit = options.limit || 100;
      let filtered = Array.from(events.values());

      if (options.status) {
        filtered = filtered.filter(e => e.status === options.status);
      }

      return ok(filtered.slice(0, limit));
    },
  };
};
