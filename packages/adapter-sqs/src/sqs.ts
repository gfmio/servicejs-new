/**
 * AWS SQS Queue Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  type Message,
} from '@aws-sdk/client-sqs';

export interface SQSConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
}

export interface QueueMessage {
  id: string;
  body: string;
  receiptHandle: string;
  attributes?: Record<string, string>;
}

export interface QueueAdapter {
  init(config: SQSConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  send(queueUrl: string, message: string, attributes?: Record<string, string>): Promise<Result<{ messageId: string }, Error>>;
  receive(queueUrl: string, maxMessages?: number, waitTimeSeconds?: number): Promise<Result<QueueMessage[], Error>>;
  delete(queueUrl: string, receiptHandle: string): Promise<Result<void, Error>>;
  getQueueAttributes(queueUrl: string): Promise<Result<Record<string, string>, Error>>;
}

export const createSQSAdapter = (): QueueAdapter => {
  let client: SQSClient | null = null;

  return {
    init: async (config: SQSConfig): Promise<Result<void, Error>> => {
      try {
        client = new SQSClient({
          region: config.region,
          credentials: config.credentials,
          endpoint: config.endpoint,
        });
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Queue not initialized'));
      }
      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        client.destroy();
        client = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Queue not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    send: async (queueUrl: string, message: string, attributes?: Record<string, string>): Promise<Result<{ messageId: string }, Error>> => {
      if (!client) {
        return err(new Error('Queue not initialized'));
      }

      try {
        const messageAttributes: Record<string, any> = {};
        if (attributes) {
          for (const [key, value] of Object.entries(attributes)) {
            messageAttributes[key] = {
              DataType: 'String',
              StringValue: value,
            };
          }
        }

        const response = await client.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: message,
            MessageAttributes: Object.keys(messageAttributes).length > 0 ? messageAttributes : undefined,
          })
        );

        return ok({ messageId: response.MessageId || '' });
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    receive: async (queueUrl: string, maxMessages = 1, waitTimeSeconds = 0): Promise<Result<QueueMessage[], Error>> => {
      if (!client) {
        return err(new Error('Queue not initialized'));
      }

      try {
        const response = await client.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: maxMessages,
            WaitTimeSeconds: waitTimeSeconds,
            MessageAttributeNames: ['All'],
          })
        );

        const messages: QueueMessage[] = (response.Messages || []).map((msg: Message) => {
          const attributes: Record<string, string> = {};
          if (msg.MessageAttributes) {
            for (const [key, value] of Object.entries(msg.MessageAttributes)) {
              if (value.StringValue) {
                attributes[key] = value.StringValue;
              }
            }
          }

          return {
            id: msg.MessageId || '',
            body: msg.Body || '',
            receiptHandle: msg.ReceiptHandle || '',
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
          };
        });

        return ok(messages);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (queueUrl: string, receiptHandle: string): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Queue not initialized'));
      }

      try {
        await client.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
          })
        );
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getQueueAttributes: async (queueUrl: string): Promise<Result<Record<string, string>, Error>> => {
      if (!client) {
        return err(new Error('Queue not initialized'));
      }

      try {
        const response = await client.send(
          new GetQueueAttributesCommand({
            QueueUrl: queueUrl,
            AttributeNames: ['All'],
          })
        );

        return ok(response.Attributes || {});
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
