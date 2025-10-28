/**
 * Kafka Adapter for ServiceJS
 *
 * Provides event streaming capabilities using Apache Kafka.
 */

import { Kafka, type KafkaConfig, type ProducerRecord, type ConsumerConfig, type Producer, type Consumer } from 'kafkajs';
import { ok, err, isOk, type Result } from '@servicejs/result';
import {
  createMessageQueueAdapter,
  type MessageQueueAdapter,
  type QueueMessage,
  type QueueProducer,
  type QueueConsumer,
} from '@servicejs/integration-mq';

export interface KafkaAdapterConfig {
  /**
   * Kafka brokers
   */
  brokers: string[];

  /**
   * Client ID
   */
  clientId?: string;

  /**
   * Consumer group ID
   */
  groupId?: string;

  /**
   * SASL authentication
   */
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
    username: string;
    password: string;
  };

  /**
   * SSL/TLS configuration
   */
  ssl?: boolean | {
    rejectUnauthorized?: boolean;
    ca?: string[];
    cert?: string;
    key?: string;
  };

  /**
   * Connection timeout
   */
  connectionTimeout?: number;

  /**
   * Request timeout
   */
  requestTimeout?: number;
}

/**
 * Create a Kafka adapter
 *
 * Uses KafkaJS for robust event streaming.
 *
 * @example
 * ```typescript
 * const kafka = createKafkaAdapter();
 *
 * await kafka.init({
 *   brokers: ['localhost:9092'],
 *   clientId: 'my-app',
 *   groupId: 'my-group',
 * });
 * await kafka.start();
 *
 * const producer = await kafka.createProducer();
 * if (isOk(producer)) {
 *   await producer.value.publish('events', { type: 'user.created', userId: '123' });
 * }
 *
 * const consumer = await kafka.createConsumer();
 * if (isOk(consumer)) {
 *   await consumer.value.subscribe('events', async (msg) => {
 *     console.log('Event:', msg.data);
 *     await msg.ack();
 *   });
 * }
 *
 * await kafka.stop();
 * await kafka.destroy();
 * ```
 */
export const createKafkaAdapter = (): MessageQueueAdapter => {
  let kafka: Kafka | null = null;
  let config: KafkaAdapterConfig | null = null;

  const adapter = createMessageQueueAdapter(
    {
      name: 'kafka',
      version: '1.0.0',
      type: 'message-queue',
      platforms: ['node', 'bun'],
      description: 'Apache Kafka adapter for event streaming',
    },
    {
      onInit: async (cfg) => {
        config = cfg as unknown as KafkaAdapterConfig;

        // Validate config
        if (!config.brokers || config.brokers.length === 0) {
          return err(new Error('At least one broker must be provided'));
        }

        return ok(undefined);
      },

      onStart: async () => {
        if (!config) {
          return err(new Error('Adapter not initialized'));
        }

        try {
          // Build Kafka config
          const kafkaConfig: KafkaConfig = {
            clientId: config.clientId || 'servicejs-kafka',
            brokers: config.brokers,
          };

          if (config.sasl !== undefined) {
            kafkaConfig.sasl = config.sasl as any; // Type assertion for SASL options
          }

          if (config.ssl !== undefined) {
            kafkaConfig.ssl = config.ssl;
          }

          if (config.connectionTimeout !== undefined) {
            kafkaConfig.connectionTimeout = config.connectionTimeout;
          }

          if (config.requestTimeout !== undefined) {
            kafkaConfig.requestTimeout = config.requestTimeout;
          }

          // Create Kafka instance
          kafka = new Kafka(kafkaConfig);

          return ok(undefined);
        } catch (error) {
          return err(error instanceof Error ? error : new Error(String(error)));
        }
      },

      onStop: async () => {
        // Kafka cleanup happens at producer/consumer level
        return ok(undefined);
      },

      onDestroy: async () => {
        kafka = null;
        config = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!kafka) {
          return ok({ status: 'unhealthy', error: new Error('Not initialized') });
        }

        try {
          // Kafka health is checked at producer/consumer level
          return ok({ status: 'healthy' });
        } catch (error) {
          return ok({
            status: 'unhealthy',
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      },
    }
  );

  // Implement createProducer
  adapter.createProducer = async (): Promise<Result<QueueProducer, Error>> => {
    if (!kafka) {
      return err(new Error('Kafka not initialized'));
    }

    try {
      const producer: Producer = kafka.producer();
      const admin = kafka.admin();

      await Promise.all([
        producer.connect(),
        admin.connect(),
      ]);

      const createdTopics = new Set<string>();

      const queueProducer: QueueProducer = {
        publish: async <T = unknown>(
          topic: string,
          data: T,
          options?: { attributes?: Map<string, string> }
        ): Promise<Result<string, Error>> => {
          try {
            // Ensure topic exists (create if needed)
            if (!createdTopics.has(topic)) {
              try {
                const topics = await admin.listTopics();
                if (!topics.includes(topic)) {
                  await admin.createTopics({
                    topics: [{
                      topic,
                      numPartitions: 1,
                      replicationFactor: 1,
                    }],
                  });
                }
                createdTopics.add(topic);
              } catch (createError) {
                // Topic might already exist (race condition), ignore error
                createdTopics.add(topic);
              }
            }

            // Build headers from attributes
            const headers: Record<string, string> = {};
            if (options?.attributes) {
              options.attributes.forEach((value, key) => {
                headers[key] = value;
              });
            }

            // Generate message ID
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            // Prepare message
            const record: ProducerRecord = {
              topic,
              messages: [
                {
                  key: messageId,
                  value: JSON.stringify(data),
                  headers,
                },
              ],
            };

            // Send message
            await producer.send(record);

            return ok(messageId);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        close: async (): Promise<Result<void, Error>> => {
          try {
            await Promise.all([
              producer.disconnect(),
              admin.disconnect(),
            ]);
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },
      };

      return ok(queueProducer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Implement createConsumer
  adapter.createConsumer = async (options?: { consumerGroup?: string }): Promise<Result<QueueConsumer, Error>> => {
    if (!kafka) {
      return err(new Error('Kafka not initialized'));
    }

    if (!config?.groupId && !options?.consumerGroup) {
      return err(new Error('Consumer group ID must be provided'));
    }

    try {
      const consumerConfig: ConsumerConfig = {
        groupId: options?.consumerGroup || config!.groupId!,
      };

      const consumer: Consumer = kafka.consumer(consumerConfig);
      await consumer.connect();

      const consumerId = `consumer_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const subscriptions = new Set<string>();
      const handlers = new Map<string, (message: QueueMessage<any>) => Promise<void>>();
      let isRunning = false;

      const queueConsumer: QueueConsumer = {
        id: consumerId,

        subscribe: async <T = unknown>(
          topic: string,
          handler: (message: QueueMessage<T>) => Promise<void>
        ): Promise<Result<void, Error>> => {
          try {
            // Check if already subscribed
            if (subscriptions.has(topic)) {
              return err(new Error(`Already subscribed to topic: ${topic}`));
            }

            // Store handler for this topic BEFORE subscribing
            handlers.set(topic, handler as (message: QueueMessage<any>) => Promise<void>);
            subscriptions.add(topic);

            // Subscribe to topic (fromBeginning: false to only get new messages)
            await consumer.subscribe({ topic, fromBeginning: false });

            // Start consumer.run() after first subscription
            if (!isRunning) {
              isRunning = true;

              // Start consumer (only called once)
              consumer.run({
                eachMessage: async ({ topic: msgTopic, message }) => {
                  try {
                    // Get the handler for this topic
                    const topicHandler = handlers.get(msgTopic);
                    if (!topicHandler) {
                      // This can happen if message arrives before handler is registered
                      // or after unsubscribe - just skip it
                      return;
                    }

                    // Parse message data
                    const data = message.value ? JSON.parse(message.value.toString()) : null;

                    // Build attributes from headers
                    const attributes = new Map<string, string>();
                    if (message.headers) {
                      for (const [key, value] of Object.entries(message.headers)) {
                        if (value !== null && value !== undefined) {
                          attributes.set(key, value.toString());
                        }
                      }
                    }

                    // Create message object
                    let acknowledged = false;

                    const queueMessage: QueueMessage<any> = {
                      id: message.key?.toString() || `${Date.now()}-${Math.random()}`,
                      data,
                      attributes,
                      timestamp: message.timestamp ? parseInt(message.timestamp, 10) : Date.now(),

                      ack: async (): Promise<Result<void, Error>> => {
                        if (acknowledged) {
                          return err(new Error('Message already acknowledged'));
                        }

                        try {
                          // Kafka auto-commits offsets, so we just mark as acknowledged
                          acknowledged = true;
                          return ok(undefined);
                        } catch (error) {
                          return err(error instanceof Error ? error : new Error(String(error)));
                        }
                      },

                      nack: async (): Promise<Result<void, Error>> => {
                        if (acknowledged) {
                          return err(new Error('Message already acknowledged'));
                        }

                        try {
                          // For Kafka, nack means we don't commit the offset
                          // The message will be reprocessed on restart
                          acknowledged = true;
                          return ok(undefined);
                        } catch (error) {
                          return err(error instanceof Error ? error : new Error(String(error)));
                        }
                      },
                    };

                    // Call handler for this topic
                    await topicHandler(queueMessage);
                  } catch (error) {
                    console.error('Error processing Kafka message:', error);
                  }
                },
              });
            }

            return ok(undefined);
          } catch (error) {
            // Clean up on error
            handlers.delete(topic);
            subscriptions.delete(topic);
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        unsubscribe: async (topic: string): Promise<Result<void, Error>> => {
          if (!subscriptions.has(topic)) {
            return err(new Error(`Not subscribed to topic: ${topic}`));
          }

          try {
            // Kafka doesn't have a direct unsubscribe for individual topics
            // We would need to restart the consumer with different subscriptions
            subscriptions.delete(topic);
            handlers.delete(topic);
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },

        close: async (): Promise<Result<void, Error>> => {
          try {
            await consumer.disconnect();
            subscriptions.clear();
            handlers.clear();
            isRunning = false;
            return ok(undefined);
          } catch (error) {
            return err(error instanceof Error ? error : new Error(String(error)));
          }
        },
      };

      return ok(queueConsumer);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Implement quick publish
  adapter.publish = async <T = unknown>(
    topic: string,
    data: T
  ): Promise<Result<string, Error>> => {
    const producerResult = await adapter.createProducer();
    if (!isOk(producerResult)) {
      return err(new Error('Failed to create producer'));
    }

    const producer = producerResult.value;
    const result = await producer.publish(topic, data);
    await producer.close();

    return result;
  };

  return adapter;
};
