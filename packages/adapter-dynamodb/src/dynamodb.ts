/**
 * AWS DynamoDB Adapter
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

export interface DynamoDBConfig {
  region: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
}

export interface DatabaseAdapter {
  init(config: DynamoDBConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  get(tableName: string, key: Record<string, unknown>): Promise<Result<Record<string, unknown> | null, Error>>;
  put(tableName: string, item: Record<string, unknown>): Promise<Result<void, Error>>;
  delete(tableName: string, key: Record<string, unknown>): Promise<Result<void, Error>>;
  query(tableName: string, keyCondition: string, values: Record<string, unknown>): Promise<Result<Record<string, unknown>[], Error>>;
  scan(tableName: string, filter?: string, values?: Record<string, unknown>): Promise<Result<Record<string, unknown>[], Error>>;
}

export const createDynamoDBAdapter = (): DatabaseAdapter => {
  let client: DynamoDBDocumentClient | null = null;

  return {
    init: async (config: DynamoDBConfig): Promise<Result<void, Error>> => {
      try {
        const dynamoClient = new DynamoDBClient({
          region: config.region,
          credentials: config.credentials,
          endpoint: config.endpoint,
        });
        client = DynamoDBDocumentClient.from(dynamoClient);
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
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
        return ok({ status: 'unhealthy', error: new Error('Database not initialized') });
      }
      return ok({ status: 'healthy' });
    },

    get: async (tableName: string, key: Record<string, unknown>): Promise<Result<Record<string, unknown> | null, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.send(new GetCommand({ TableName: tableName, Key: key }));
        return ok(result.Item || null);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    put: async (tableName: string, item: Record<string, unknown>): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        await client.send(new PutCommand({ TableName: tableName, Item: item }));
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (tableName: string, key: Record<string, unknown>): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        await client.send(new DeleteCommand({ TableName: tableName, Key: key }));
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    query: async (tableName: string, keyCondition: string, values: Record<string, unknown>): Promise<Result<Record<string, unknown>[], Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.send(new QueryCommand({
          TableName: tableName,
          KeyConditionExpression: keyCondition,
          ExpressionAttributeValues: values,
        }));
        return ok(result.Items || []);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    scan: async (tableName: string, filter?: string, values?: Record<string, unknown>): Promise<Result<Record<string, unknown>[], Error>> => {
      if (!client) {
        return err(new Error('Database not initialized'));
      }

      try {
        const result = await client.send(new ScanCommand({
          TableName: tableName,
          FilterExpression: filter,
          ExpressionAttributeValues: values,
        }));
        return ok(result.Items || []);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
