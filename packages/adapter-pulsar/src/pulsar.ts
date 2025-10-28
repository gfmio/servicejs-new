/**
 * Apache Pulsar Messaging Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import Pulsar from 'pulsar-client';

export interface PulsarConfig {
  serviceUrl: string;
  authentication?: {
    token: string;
  };
}

export interface ProducerConfig {
  topic: string;
}

export interface ConsumerConfig {
  topic: string;
  subscription: string;
  subscriptionType?: 'Exclusive' | 'Shared' | 'Failover' | 'KeyShared';
}

export interface MessagingAdapter {
  init(config: PulsarConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  createProducer(config: ProducerConfig): Promise<Result<{ send: (data: Buffer) => Promise<Result<void, Error>> }, Error>>;
  createConsumer(config: ConsumerConfig): Promise<Result<{ receive: () => Promise<Result<Buffer, Error>>; ack: (msgId: unknown) => Promise<Result<void, Error>> }, Error>>;
}

export const createPulsarAdapter = (): MessagingAdapter => {
  let client: Pulsar.Client | null = null;
  const producers: Pulsar.Producer[] = [];
  const consumers: Pulsar.Consumer[] = [];

  return {
    init: async (config: PulsarConfig): Promise<Result<void, Error>> => {
      try {
        const clientConfig: Pulsar.ClientConfig = {
          serviceUrl: config.serviceUrl,
        };

        if (config.authentication) {
          clientConfig.authentication = new Pulsar.AuthenticationToken({
            token: config.authentication.token,
          });
        }

        client = new Pulsar.Client(clientConfig);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Messaging not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        for (const producer of producers) {
          await producer.close();
        }
        for (const consumer of consumers) {
          await consumer.close();
        }
        await client.close();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Messaging not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    createProducer: async (config: ProducerConfig) => {
      if (!client) {
        return err(new Error('Messaging not initialized'));
      }

      try {
        const producer = await client.createProducer({
          topic: config.topic,
        });
        producers.push(producer);

        return ok({
          send: async (data: Buffer): Promise<Result<void, Error>> => {
            try {
              await producer.send({ data });
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createConsumer: async (config: ConsumerConfig) => {
      if (!client) {
        return err(new Error('Messaging not initialized'));
      }

      try {
        const consumer = await client.subscribe({
          topic: config.topic,
          subscription: config.subscription,
          subscriptionType: config.subscriptionType || 'Exclusive',
        });
        consumers.push(consumer);

        return ok({
          receive: async (): Promise<Result<Buffer, Error>> => {
            try {
              const msg = await consumer.receive();
              return ok(msg.getData());
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
          ack: async (msgId: unknown): Promise<Result<void, Error>> => {
            try {
              await consumer.acknowledge(msgId as Pulsar.Message);
              return ok(undefined);
            } catch (error) {
              return err(error instanceof Error ? error : new Error(String(error)));
            }
          },
        });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
