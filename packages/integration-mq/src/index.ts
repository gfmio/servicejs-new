/**
 * @servicejs/integration-mq
 *
 * Message queue adapter interfaces for ServiceJS
 *
 * Provides base interfaces for message queue integrations.
 * Supports:
 * - AMQP (RabbitMQ)
 * - Kafka
 * - NATS
 * - Redis Pub/Sub
 * - Cloud queues (SQS, Cloud Pub/Sub)
 */

export type {
  MessageQueueAdapter,
  MessageQueueConfig,
  QueueMessage,
  QueueConsumer,
  QueueProducer,
} from './message-queue.js';

export {
  createMessageQueueAdapter,
} from './message-queue.js';

// Examples
export {
  createSimpleMQAdapter,
  exampleMQUsage,
} from './examples/mq-simple.js';
