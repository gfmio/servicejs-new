/**
 * Elasticsearch Adapter
 *
 * Full-text search engine with analytics capabilities
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { Client } from '@elastic/elasticsearch';

export interface ElasticsearchAdapterConfig {
  // Node URL(s)
  node?: string | string[];

  // Optional: Cloud ID for Elastic Cloud
  cloud?: {
    id: string;
  };

  // Optional: Authentication
  auth?: {
    username?: string;
    password?: string;
    apiKey?: string;
    bearer?: string;
  };

  // Optional: Request timeout in milliseconds
  requestTimeout?: number;

  // Optional: Max retries
  maxRetries?: number;
}

export interface IndexDocumentOptions {
  index: string;
  id?: string;
  document: any;
  refresh?: boolean | 'wait_for';
}

export interface SearchOptions {
  index: string | string[];
  query?: any;
  from?: number;
  size?: number;
  sort?: any[];
  _source?: boolean | string[];
  aggregations?: any;
}

export interface UpdateDocumentOptions {
  index: string;
  id: string;
  doc?: any;
  script?: any;
  refresh?: boolean | 'wait_for';
}

export interface DeleteDocumentOptions {
  index: string;
  id: string;
  refresh?: boolean | 'wait_for';
}

export interface BulkOperation {
  index?: {
    _index: string;
    _id?: string;
  };
  create?: {
    _index: string;
    _id?: string;
  };
  update?: {
    _index: string;
    _id: string;
  };
  delete?: {
    _index: string;
    _id: string;
  };
  doc?: any;
  script?: any;
}

export interface CreateIndexOptions {
  index: string;
  mappings?: any;
  settings?: any;
}

export interface ElasticsearchAdapter {
  init(config: ElasticsearchAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Elasticsearch client
  getClient(): Result<Client, Error>;

  // Document operations
  index(options: IndexDocumentOptions): Promise<Result<any, Error>>;
  search(options: SearchOptions): Promise<Result<any, Error>>;
  get(index: string, id: string): Promise<Result<any, Error>>;
  update(options: UpdateDocumentOptions): Promise<Result<any, Error>>;
  delete(options: DeleteDocumentOptions): Promise<Result<any, Error>>;
  bulk(operations: BulkOperation[]): Promise<Result<any, Error>>;

  // Index management
  createIndex(options: CreateIndexOptions): Promise<Result<any, Error>>;
  deleteIndex(index: string): Promise<Result<any, Error>>;
  indexExists(index: string): Promise<Result<boolean, Error>>;
}

export const createElasticsearchAdapter = (): ElasticsearchAdapter => {
  let client: Client | null = null;
  let config: ElasticsearchAdapterConfig | null = null;

  return {
    init: async (cfg: ElasticsearchAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;

        const { Client: ElasticsearchClient } = await import('@elastic/elasticsearch');

        const clientConfig: any = {};

        if (cfg.node) {
          clientConfig.node = cfg.node;
        }

        if (cfg.cloud) {
          clientConfig.cloud = cfg.cloud;
        }

        if (cfg.auth) {
          clientConfig.auth = cfg.auth;
        }

        if (cfg.requestTimeout !== undefined) {
          clientConfig.requestTimeout = cfg.requestTimeout;
        }

        if (cfg.maxRetries !== undefined) {
          clientConfig.maxRetries = cfg.maxRetries;
        }

        client = new ElasticsearchClient(clientConfig);

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      if (client) {
        try {
          await client.close();
        } catch (error) {
          // Ignore errors during stop
        }
      }
      return ok(undefined);
    },

    destroy: async (): Promise<Result<void, Error>> => {
      if (client) {
        try {
          await client.close();
        } catch (error) {
          // Ignore errors
        }
        client = null;
        config = null;
      }
      return ok(undefined);
    },

    health: async (): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>> => {
      if (!client) {
        return ok({ status: 'unhealthy', error: new Error('Client not initialized') });
      }

      try {
        const health = await client.cluster.health();

        if (health.status === 'green') {
          return ok({ status: 'healthy' });
        } else if (health.status === 'yellow') {
          return ok({ status: 'degraded' });
        } else {
          return ok({ status: 'unhealthy', error: new Error(`Cluster status: ${health.status}`) });
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
        return err(new Error('Elasticsearch client not initialized'));
      }
      return ok(client);
    },

    index: async (options: IndexDocumentOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.index({
          index: options.index,
          id: options.id,
          document: options.document,
          refresh: options.refresh,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    search: async (options: SearchOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.search({
          index: options.index,
          query: options.query,
          from: options.from,
          size: options.size,
          sort: options.sort,
          _source: options._source,
          aggregations: options.aggregations,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    get: async (index: string, id: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.get({
          index,
          id,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    update: async (options: UpdateDocumentOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.update({
          index: options.index,
          id: options.id,
          doc: options.doc,
          script: options.script,
          refresh: options.refresh,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    delete: async (options: DeleteDocumentOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.delete({
          index: options.index,
          id: options.id,
          refresh: options.refresh,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    bulk: async (operations: BulkOperation[]): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.bulk({
          operations: operations as any,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    createIndex: async (options: CreateIndexOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.indices.create({
          index: options.index,
          mappings: options.mappings,
          settings: options.settings,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteIndex: async (index: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.indices.delete({
          index,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    indexExists: async (index: string): Promise<Result<boolean, Error>> => {
      if (!client) {
        return err(new Error('Elasticsearch client not initialized'));
      }

      try {
        const result = await client.indices.exists({
          index,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
