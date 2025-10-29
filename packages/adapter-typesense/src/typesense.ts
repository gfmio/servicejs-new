/**
 * Typesense Adapter
 *
 * Fast search API with typo tolerance and faceting
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { Client } from 'typesense';

export interface TypesenseAdapterConfig {
  // Nodes configuration
  nodes: Array<{
    host: string;
    port: number;
    protocol: 'http' | 'https';
  }>;

  // API Key
  apiKey: string;

  // Optional: Connection timeout in seconds
  connectionTimeoutSeconds?: number;

  // Optional: Number of retries
  numRetries?: number;
}

export interface SearchOptions {
  q: string;
  query_by: string | string[];
  filter_by?: string;
  sort_by?: string;
  facet_by?: string;
  max_facet_values?: number;
  per_page?: number;
  page?: number;
  num_typos?: number | string;
  prefix?: boolean | string;
  split_join_tokens?: 'off' | 'fallback' | 'always';
}

export interface CollectionSchema {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    facet?: boolean;
    optional?: boolean;
    index?: boolean;
  }>;
  default_sorting_field?: string;
}

export interface TypesenseAdapter {
  init(config: TypesenseAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Typesense client
  getClient(): Result<Client, Error>;

  // Collection operations
  createCollection(schema: CollectionSchema): Promise<Result<any, Error>>;
  deleteCollection(name: string): Promise<Result<any, Error>>;
  retrieveCollection(name: string): Promise<Result<any, Error>>;

  // Document operations
  createDocument(collectionName: string, document: any): Promise<Result<any, Error>>;
  upsertDocument(collectionName: string, document: any): Promise<Result<any, Error>>;
  updateDocument(collectionName: string, id: string, document: any): Promise<Result<any, Error>>;
  deleteDocument(collectionName: string, id: string): Promise<Result<any, Error>>;
  importDocuments(collectionName: string, documents: any[], options?: { action?: 'create' | 'upsert' | 'update' }): Promise<Result<any, Error>>;

  // Search operations
  search(collectionName: string, options: SearchOptions): Promise<Result<any, Error>>;
}

export const createTypesenseAdapter = (): TypesenseAdapter => {
  let client: Client | null = null;
  let config: TypesenseAdapterConfig | null = null;

  return {
    init: async (cfg: TypesenseAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;

        const { Client: TypesenseClient } = await import('typesense');

        client = new TypesenseClient({
          nodes: cfg.nodes,
          apiKey: cfg.apiKey,
          connectionTimeoutSeconds: cfg.connectionTimeoutSeconds,
          numRetries: cfg.numRetries,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Typesense client doesn't need explicit stop
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      client = null;
      config = null;
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Client not initialized') });
      }

      try {
        const health = await client.health.retrieve();

        if (health.ok === true) {
          return ok({ status: 'healthy' });
        } else {
          return ok({ status: 'unhealthy', error: new Error('Health check failed') });
        }
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<Client, Error> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }
      return ok(client);
    },

    createCollection: async (schema: CollectionSchema): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections().create(schema);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteCollection: async (name: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(name).delete();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    retrieveCollection: async (name: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(name).retrieve();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createDocument: async (collectionName: string, document: any): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents().create(document);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    upsertDocument: async (collectionName: string, document: any): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents().upsert(document);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateDocument: async (collectionName: string, id: string, document: any): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents(id).update(document);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteDocument: async (collectionName: string, id: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents(id).delete();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    importDocuments: async (collectionName: string, documents: any[], options?: { action?: 'create' | 'upsert' | 'update' }): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents().import(documents, options);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    search: async (collectionName: string, options: SearchOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Typesense client not initialized'));
      }

      try {
        const result = await client.collections(collectionName).documents().search(options);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
