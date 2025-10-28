/**
 * NATS Message Queue Adapter
 *
 * Implementation using NATS.io
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { connect, type NatsConnection, type Subscription, StringCodec, type ConnectionOptions } from 'nats';

export interface NatsConfig {
  /**
   * NATS server URLs
   * @example ['nats://localhost:4222']
   */
  servers?: string | string[];

  /**
   * Connection name for identification
   */
  name?: string;

  /**
   * Username for authentication
   */
  user?: string;

  /**
   * Password for authentication
   */
  pass?: string;

  /**
   * Token for authentication
   */
  token?: string;

  /**
   * Maximum reconnection attempts
   */
  maxReconnectAttempts?: number;

  /**
   * Reconnect time wait in milliseconds
   */
  reconnectTimeWait?: number;

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;
}

export interface QueueMessage<T = unknown> {
  id: string;
  subject: string;
  data: T;
  timestamp: number;
  reply?: string;
}

export interface QueueAdapter {
  init(config: NatsConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  publish<T>(subject: string, message: T): Promise<Result<void, Error>>;
  subscribe<T>(subject: string, handler: (message: QueueMessage<T>) => Promise<void>): Promise<Result<void, Error>>;
  unsubscribe(subject: string): Promise<Result<void, Error>>;
  request<TReq, TRes>(subject: string, message: TReq, timeout?: number): Promise<Result<TRes, Error>>;
}

/**
 * Create a NATS message queue adapter
 *
 * @example
 * ```typescript
 * const nats = createNatsAdapter();
 *
 * await nats.init({ servers: 'nats://localhost:4222' });
 * await nats.start();
 *
 * // Publish message
 * await nats.publish('events.user.created', { userId: '123' });
 *
 * // Subscribe to messages
 * await nats.subscribe('events.user.*', async (message) => {
 *   console.log('Received:', message.data);
 * });
 *
 * // Request-reply pattern
 * const result = await nats.request<{ userId: string }, { user: User }>(
 *   'user.get',
 *   { userId: '123' },
 *   5000
 * );
 *
 * await nats.stop();
 * await nats.destroy();
 * ```
 */
export const createNatsAdapter = (): QueueAdapter => {
  let connection: NatsConnection | null = null;
  let subscriptions = new Map<string, Subscription>();
  const codec = StringCodec();

  return {
    init: async (config: NatsConfig): Promise<Result<void, Error>> => {
      try {
        const options: ConnectionOptions = {};

        if (config.servers) {
          options.servers = Array.isArray(config.servers) ? config.servers : [config.servers];
        }

        if (config.name) {
          options.name = config.name;
        }

        if (config.user) {
          options.user = config.user;
        }

        if (config.pass) {
          options.pass = config.pass;
        }

        if (config.token) {
          options.token = config.token;
        }

        if (config.maxReconnectAttempts !== undefined) {
          options.maxReconnectAttempts = config.maxReconnectAttempts;
        }

        if (config.reconnectTimeWait !== undefined) {
          options.reconnectTimeWait = config.reconnectTimeWait;
        }

        if (config.timeout !== undefined) {
          options.timeout = config.timeout;
        }

        connection = await connect(options);

        // Handle connection events
        (async () => {
          if (!connection) return;

          for await (const status of connection.status()) {
            console.log(`NATS status: ${status.type}`);
          }
        })();

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!connection) {
        return err(new Error('Connection not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      try {
        // Unsubscribe from all subscriptions
        for (const [subject, sub] of subscriptions.entries()) {
          await sub.drain();
        }
        subscriptions.clear();

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    destroy: async (): Promise<Result<void, Error>> => {
      try {
        if (connection) {
          await connection.drain();
          await connection.close();
          connection = null;
        }
        subscriptions.clear();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!connection) {
        return ok({ status: 'unhealthy', error: new Error('Connection not initialized') });
      }

      try {
        if (connection.isClosed()) {
          return ok({ status: 'unhealthy', error: new Error('Connection is closed') });
        }

        // Check if we can publish (simple health check)
        connection.publish('_health_check_', codec.encode('ping'));
        await connection.flush();

        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error)),
        });
      }
    },

    publish: async <T>(subject: string, message: T): Promise<Result<void, Error>> => {
      if (!connection) {
        return err(new Error('Connection not initialized'));
      }

      try {
        const payload = JSON.stringify(message);
        connection.publish(subject, codec.encode(payload));
        await connection.flush();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    subscribe: async <T>(
      subject: string,
      handler: (message: QueueMessage<T>) => Promise<void>
    ): Promise<Result<void, Error>> => {
      if (!connection) {
        return err(new Error('Connection not initialized'));
      }

      try {
        // Check if already subscribed
        if (subscriptions.has(subject)) {
          return err(new Error(`Already subscribed to subject: ${subject}`));
        }

        const subscription = connection.subscribe(subject);
        subscriptions.set(subject, subscription);

        // Process messages asynchronously
        (async () => {
          for await (const msg of subscription) {
            try {
              const payload = codec.decode(msg.data);
              const data = JSON.parse(payload) as T;

              const queueMessage: QueueMessage<T> = {
                id: crypto.randomUUID(),
                subject: msg.subject,
                data,
                timestamp: Date.now(),
                reply: msg.reply,
              };

              await handler(queueMessage);
            } catch (error) {
              console.error(`Error processing message on ${subject}:`, error);
            }
          }
        })();

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    unsubscribe: async (subject: string): Promise<Result<void, Error>> => {
      try {
        const subscription = subscriptions.get(subject);
        if (!subscription) {
          return err(new Error(`Not subscribed to subject: ${subject}`));
        }

        await subscription.drain();
        subscriptions.delete(subject);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    request: async <TReq, TRes>(subject: string, message: TReq, timeout = 5000): Promise<Result<TRes, Error>> => {
      if (!connection) {
        return err(new Error('Connection not initialized'));
      }

      try {
        const payload = JSON.stringify(message);
        const response = await connection.request(subject, codec.encode(payload), { timeout });

        const responsePayload = codec.decode(response.data);
        const data = JSON.parse(responsePayload) as TRes;

        return ok(data);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};

/**
 * Helper to create a NATS responder (request-reply pattern)
 *
 * @example
 * ```typescript
 * const nats = createNatsAdapter();
 * await nats.init({ servers: 'nats://localhost:4222' });
 * await nats.start();
 *
 * // Create responder for user lookup
 * await createNatsResponder<{ userId: string }, { user: User }>(
 *   nats,
 *   'user.get',
 *   async (request) => {
 *     const user = await database.getUser(request.data.userId);
 *     return { user };
 *   }
 * );
 * ```
 */
export const createNatsResponder = async <TReq, TRes>(
  adapter: QueueAdapter,
  subject: string,
  handler: (message: QueueMessage<TReq>) => Promise<TRes>
): Promise<Result<void, Error>> => {
  return adapter.subscribe<TReq>(subject, async (message) => {
    try {
      const response = await handler(message);

      // If this is a request (has reply subject), send response
      if (message.reply) {
        await adapter.publish(message.reply, response);
      }
    } catch (error) {
      console.error(`Error in responder for ${subject}:`, error);

      // Send error response if reply subject exists
      if (message.reply) {
        await adapter.publish(message.reply, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
};
