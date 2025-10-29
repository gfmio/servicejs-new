/**
 * Google Cloud Pub/Sub Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';

export interface GooglePubSubConfig {
  projectId: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
  keyFilename?: string;
  apiEndpoint?: string; // For testing with emulator
}

export interface PublishOptions {
  orderingKey?: string;
  attributes?: Record<string, string>;
}

export interface SubscriptionConfig {
  ackDeadlineSeconds?: number;
  enableMessageOrdering?: boolean;
  filter?: string;
  deadLetterPolicy?: {
    deadLetterTopic: string;
    maxDeliveryAttempts: number;
  };
}

export interface PullOptions {
  maxMessages?: number;
  returnImmediately?: boolean;
}

export interface GooglePubSubAdapter {
  init(config: GooglePubSubConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Topic operations
  createTopic(topicName: string): Promise<Result<{ name: string }, Error>>;
  deleteTopic(topicName: string): Promise<Result<void, Error>>;
  listTopics(): Promise<Result<string[], Error>>;
  topicExists(topicName: string): Promise<Result<boolean, Error>>;

  // Publishing
  publish(topicName: string, data: any, options?: PublishOptions): Promise<Result<{ messageId: string }, Error>>;
  publishBatch(topicName: string, messages: Array<{ data: any; options?: PublishOptions }>): Promise<Result<{ messageIds: string[] }, Error>>;

  // Subscription operations
  createSubscription(topicName: string, subscriptionName: string, config?: SubscriptionConfig): Promise<Result<{ name: string }, Error>>;
  deleteSubscription(subscriptionName: string): Promise<Result<void, Error>>;
  listSubscriptions(topicName?: string): Promise<Result<string[], Error>>;
  subscriptionExists(subscriptionName: string): Promise<Result<boolean, Error>>;

  // Pull-based consumption
  pull(subscriptionName: string, options?: PullOptions): Promise<Result<Array<{
    id: string;
    data: any;
    attributes: Record<string, string>;
    publishTime: Date;
    ackId: string;
  }>, Error>>;
  acknowledge(subscriptionName: string, ackIds: string[]): Promise<Result<void, Error>>;
  modifyAckDeadline(subscriptionName: string, ackIds: string[], seconds: number): Promise<Result<void, Error>>;

  // Push-based consumption (streaming)
  subscribe(
    subscriptionName: string,
    handler: (message: {
      id: string;
      data: any;
      attributes: Record<string, string>;
      publishTime: Date;
      ack: () => void;
      nack: () => void;
    }) => void | Promise<void>
  ): Promise<Result<{ unsubscribe: () => void }, Error>>;
}

export const createGooglePubSubAdapter = (): GooglePubSubAdapter => {
  let client: PubSub | null = null;
  let subscriptions: Map<string, Subscription> = new Map();

  return {
    init: async (config: GooglePubSubConfig): Promise<Result<void, Error>> => {
      try {
        const options: any = {
          projectId: config.projectId,
        };

        if (config.credentials) {
          options.credentials = config.credentials;
        }

        if (config.keyFilename) {
          options.keyFilename = config.keyFilename;
        }

        if (config.apiEndpoint) {
          options.apiEndpoint = config.apiEndpoint;
        }

        client = new PubSub(options);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Close all active subscriptions
      for (const [name, subscription] of subscriptions) {
        try {
          await subscription.close();
        } catch (error) {
          console.error(`Failed to close subscription ${name}:`, error);
        }
      }
      subscriptions.clear();
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        await client.close();
        client = null;
      }
      subscriptions.clear();
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Pub/Sub not initialized') });
      }

      try {
        // Test connection by listing topics
        await client.getTopics({ pageSize: 1 });
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    createTopic: async (topicName: string): Promise<Result<{ name: string }, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const [topic] = await client.createTopic(topicName);
        return ok({ name: topic.name });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteTopic: async (topicName: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        await client.topic(topicName).delete();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listTopics: async (): Promise<Result<string[], Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const [topics] = await client.getTopics();
        return ok(topics.map(topic => topic.name));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    topicExists: async (topicName: string): Promise<Result<boolean, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const [exists] = await client.topic(topicName).exists();
        return ok(exists);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    publish: async (topicName: string, data: any, options?: PublishOptions): Promise<Result<{ messageId: string }, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const topic = client.topic(topicName);
        const dataBuffer = Buffer.from(JSON.stringify(data));

        const publishOptions: any = {};
        if (options?.orderingKey) {
          publishOptions.orderingKey = options.orderingKey;
        }

        const messageId = await topic.publishMessage({
          data: dataBuffer,
          attributes: options?.attributes,
          ...publishOptions,
        });

        return ok({ messageId });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    publishBatch: async (topicName: string, messages: Array<{ data: any; options?: PublishOptions }>): Promise<Result<{ messageIds: string[] }, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const topic = client.topic(topicName);
        const messageIds: string[] = [];

        for (const message of messages) {
          const dataBuffer = Buffer.from(JSON.stringify(message.data));
          const publishOptions: any = {};

          if (message.options?.orderingKey) {
            publishOptions.orderingKey = message.options.orderingKey;
          }

          const messageId = await topic.publishMessage({
            data: dataBuffer,
            attributes: message.options?.attributes,
            ...publishOptions,
          });

          messageIds.push(messageId);
        }

        return ok({ messageIds });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createSubscription: async (topicName: string, subscriptionName: string, config?: SubscriptionConfig): Promise<Result<{ name: string }, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const options: any = {};

        if (config?.ackDeadlineSeconds) {
          options.ackDeadlineSeconds = config.ackDeadlineSeconds;
        }

        if (config?.enableMessageOrdering) {
          options.enableMessageOrdering = config.enableMessageOrdering;
        }

        if (config?.filter) {
          options.filter = config.filter;
        }

        if (config?.deadLetterPolicy) {
          options.deadLetterPolicy = config.deadLetterPolicy;
        }

        const [subscription] = await client
          .topic(topicName)
          .createSubscription(subscriptionName, options);

        return ok({ name: subscription.name });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteSubscription: async (subscriptionName: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const subscription = subscriptions.get(subscriptionName);
        if (subscription) {
          await subscription.close();
          subscriptions.delete(subscriptionName);
        }

        await client.subscription(subscriptionName).delete();
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    listSubscriptions: async (topicName?: string): Promise<Result<string[], Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        let subs;
        if (topicName) {
          [subs] = await client.topic(topicName).getSubscriptions();
        } else {
          [subs] = await client.getSubscriptions();
        }
        return ok(subs.map(sub => sub.name));
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    subscriptionExists: async (subscriptionName: string): Promise<Result<boolean, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const [exists] = await client.subscription(subscriptionName).exists();
        return ok(exists);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    pull: async (subscriptionName: string, options?: PullOptions): Promise<Result<Array<{
      id: string;
      data: any;
      attributes: Record<string, string>;
      publishTime: Date;
      ackId: string;
    }>, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const subscription = client.subscription(subscriptionName);
        const [response] = await subscription.pull({
          maxMessages: options?.maxMessages || 10,
          returnImmediately: options?.returnImmediately,
        });

        const messages = response.receivedMessages?.map((msg: any) => {
          let data;
          try {
            data = JSON.parse(msg.message.data.toString());
          } catch {
            data = msg.message.data.toString();
          }

          return {
            id: msg.message.messageId,
            data,
            attributes: msg.message.attributes || {},
            publishTime: new Date(msg.message.publishTime),
            ackId: msg.ackId,
          };
        }) || [];

        return ok(messages);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    acknowledge: async (subscriptionName: string, ackIds: string[]): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const subscription = client.subscription(subscriptionName);
        await subscription.acknowledge(ackIds);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    modifyAckDeadline: async (subscriptionName: string, ackIds: string[], seconds: number): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const subscription = client.subscription(subscriptionName);
        await subscription.modifyAckDeadline(ackIds, seconds);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    subscribe: async (
      subscriptionName: string,
      handler: (message: any) => void | Promise<void>
    ): Promise<Result<{ unsubscribe: () => void }, Error>> => {
      if (!client) {
        return err(new Error('Pub/Sub not initialized'));
      }

      try {
        const subscription = client.subscription(subscriptionName);

        subscription.on('message', async (message: Message) => {
          let data;
          try {
            data = JSON.parse(message.data.toString());
          } catch {
            data = message.data.toString();
          }

          await handler({
            id: message.id,
            data,
            attributes: message.attributes,
            publishTime: new Date(message.publishTime),
            ack: () => message.ack(),
            nack: () => message.nack(),
          });
        });

        subscription.on('error', (error: Error) => {
          console.error('Subscription error:', error);
        });

        subscriptions.set(subscriptionName, subscription);

        return ok({
          unsubscribe: () => {
            subscription.removeAllListeners();
            subscription.close();
            subscriptions.delete(subscriptionName);
          },
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
