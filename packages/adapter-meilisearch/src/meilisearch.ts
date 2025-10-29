/**
 * Meilisearch Adapter
 *
 * Fast full-text search with typo tolerance and instant results
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { MeiliSearch, Index } from 'meilisearch';

export interface MeilisearchAdapterConfig {
  // Host URL
  host: string;

  // Optional: API Key
  apiKey?: string;

  // Optional: Request timeout in milliseconds
  timeout?: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  filter?: string | string[];
  facets?: string[];
  attributesToRetrieve?: string[];
  attributesToCrop?: string[];
  cropLength?: number;
  attributesToHighlight?: string[];
  sort?: string[];
  matchingStrategy?: 'all' | 'last';
}

export interface MeilisearchAdapter {
  init(config: MeilisearchAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Meilisearch client
  getClient(): Result<MeiliSearch, Error>;

  // Index operations
  createIndex(indexName: string, options?: { primaryKey?: string }): Promise<Result<any, Error>>;
  deleteIndex(indexName: string): Promise<Result<any, Error>>;
  getIndex(indexName: string): Promise<Result<Index, Error>>;

  // Document operations
  addDocuments(indexName: string, documents: any[], options?: { primaryKey?: string }): Promise<Result<any, Error>>;
  updateDocuments(indexName: string, documents: any[], options?: { primaryKey?: string }): Promise<Result<any, Error>>;
  deleteDocument(indexName: string, documentId: string | number): Promise<Result<any, Error>>;
  deleteDocuments(indexName: string, documentIds: (string | number)[]): Promise<Result<any, Error>>;
  deleteAllDocuments(indexName: string): Promise<Result<any, Error>>;

  // Search operations
  search(indexName: string, options: SearchOptions): Promise<Result<any, Error>>;

  // Settings
  getSettings(indexName: string): Promise<Result<any, Error>>;
  updateSettings(indexName: string, settings: any): Promise<Result<any, Error>>;
}

export const createMeilisearchAdapter = (): MeilisearchAdapter => {
  let client: MeiliSearch | null = null;
  let config: MeilisearchAdapterConfig | null = null;

  return {
    init: async (cfg: MeilisearchAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;

        const { MeiliSearch: MeiliSearchClient } = await import('meilisearch');

        client = new MeiliSearchClient({
          host: cfg.host,
          apiKey: cfg.apiKey,
          timeout: cfg.timeout,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Meilisearch client doesn't need explicit stop
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
        const health = await client.health();

        if (health.status === 'available') {
          return ok({ status: 'healthy' });
        } else {
          return ok({ status: 'unhealthy', error: new Error(`Service status: ${health.status}`) });
        }
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<MeiliSearch, Error> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }
      return ok(client);
    },

    createIndex: async (indexName: string, options?: { primaryKey?: string }): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const result = await client.createIndex(indexName, options);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteIndex: async (indexName: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const result = await client.deleteIndex(indexName);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getIndex: async (indexName: string): Promise<Result<Index, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        return ok(index);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    addDocuments: async (indexName: string, documents: any[], options?: { primaryKey?: string }): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.addDocuments(documents, options);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateDocuments: async (indexName: string, documents: any[], options?: { primaryKey?: string }): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.updateDocuments(documents, options);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteDocument: async (indexName: string, documentId: string | number): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.deleteDocument(documentId);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteDocuments: async (indexName: string, documentIds: (string | number)[]): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.deleteDocuments(documentIds);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteAllDocuments: async (indexName: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.deleteAllDocuments();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    search: async (indexName: string, options: SearchOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.search(options.query, {
          limit: options.limit,
          offset: options.offset,
          filter: options.filter,
          facets: options.facets,
          attributesToRetrieve: options.attributesToRetrieve,
          attributesToCrop: options.attributesToCrop,
          cropLength: options.cropLength,
          attributesToHighlight: options.attributesToHighlight,
          sort: options.sort,
          matchingStrategy: options.matchingStrategy,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getSettings: async (indexName: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.getSettings();
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    updateSettings: async (indexName: string, settings: any): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Meilisearch client not initialized'));
      }

      try {
        const index = client.index(indexName);
        const result = await index.updateSettings(settings);
        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
