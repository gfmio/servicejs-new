/**
 * Message Queue Adapter Framework
 *
 * Base interfaces for message queue integrations
 *
 * Supports:
 * - AMQP (RabbitMQ)
 * - Kafka
 * - NATS
 * - Redis Pub/Sub
 * - Cloud queues (SQS, Cloud Pub/Sub, etc.)
 */

import { type Result } from '@servicejs/result';
import { type Integration, type IntegrationMetadata, createIntegration } from '@servicejs/integrations';

// ============================================================================
// Types
// ============================================================================

/**
 * Message queue configuration
 */
export interface MessageQueueConfig {
  /** Connection string or brokers */
  connection: string | string[];

  /** Authentication */
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };

  /** Default queue/topic */
  defaultQueue?: string;

  /** Consumer group */
  consumerGroup?: string;

  /** Additional queue-specific options */
  [key: string]: unknown;
}

/**
 * Queue message
 */
export interface QueueMessage<T = unknown> {
  /** Message ID */
  readonly id: string;

  /** Message data */
  readonly data: T;

  /** Message attributes/headers */
  readonly attributes?: ReadonlyMap<string, string>;

  /** Timestamp when message was published */
  readonly timestamp: number;

  /** Acknowledge message */
  ack(): Promise<Result<void, Error>>;

  /** Negative acknowledge (requeue) */
  nack(): Promise<Result<void, Error>>;
}

/**
 * Message producer
 */
export interface QueueProducer {
  /** Publish a message */
  publish<T>(
    queue: string,
    data: T,
    options?: {
      attributes?: Map<string, string>;
      delay?: number;
    }
  ): Promise<Result<string, Error>>;

  /** Close producer */
  close(): Promise<Result<void, Error>>;
}

/**
 * Message consumer
 */
export interface QueueConsumer {
  /** Consumer ID */
  readonly id: string;

  /** Subscribe to queue */
  subscribe<T>(
    queue: string,
    handler: (message: QueueMessage<T>) => Promise<void>
  ): Promise<Result<void, Error>>;

  /** Unsubscribe from queue */
  unsubscribe(queue: string): Promise<Result<void, Error>>;

  /** Close consumer */
  close(): Promise<Result<void, Error>>;
}

/**
 * Message queue adapter interface
 */
export interface MessageQueueAdapter extends Integration {
  /**
   * Create a producer
   */
  createProducer(): Promise<Result<QueueProducer, Error>>;

  /**
   * Create a consumer
   */
  createConsumer(options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>>;

  /**
   * Publish a message directly
   */
  publish<T>(queue: string, data: T): Promise<Result<string, Error>>;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a message queue adapter
 *
 * @example
 * ```typescript
 * const mq = createMessageQueueAdapter(
 *   {
 *     name: 'rabbitmq',
 *     version: '1.0.0',
 *     type: 'message-queue',
 *     platforms: ['node', 'bun']
 *   },
 *   {
 *     onInit: async (config) => {
 *       // Connect to broker
 *       return ok(undefined);
 *     },
 *     onDestroy: async () => {
 *       // Close connections
 *       return ok(undefined);
 *     }
 *   }
 * );
 * ```
 */
export const createMessageQueueAdapter = (
  metadata: IntegrationMetadata,
  handlers: Parameters<typeof createIntegration>[1]
): MessageQueueAdapter => {
  const base = createIntegration(metadata, handlers);

  return {
    ...base,

    async createProducer(): Promise<Result<QueueProducer, Error>> {
      // Implement in specific adapter
      throw new Error('createProducer() must be implemented by queue adapter');
    },

    async createConsumer(_options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>> {
      // Implement in specific adapter
      throw new Error('createConsumer() must be implemented by queue adapter');
    },

    async publish<T>(_queue: string, _data: T): Promise<Result<string, Error>> {
      // Implement in specific adapter
      throw new Error('publish() must be implemented by queue adapter');
    },
  };
};
