/**
 * Algolia Adapter
 *
 * Instant search with typo tolerance and faceting
 */

import type { Result } from '@servicejs/result';
import { err, ok } from '@servicejs/result';
import type { SearchClient } from 'algoliasearch';

export interface AlgoliaAdapterConfig {
  // Application ID
  appId: string;

  // API Key
  apiKey: string;

  // Optional: Auth mode
  authMode?: 'WithinQueryParameters' | 'WithinHeaders';
}

export interface SearchOptions {
  query: string;
  hitsPerPage?: number;
  page?: number;
  filters?: string;
  facetFilters?: string | string[];
  numericFilters?: string | string[];
  attributesToRetrieve?: string[];
  attributesToHighlight?: string[];
  typoTolerance?: boolean | 'min' | 'strict';
  aroundLatLng?: string;
  aroundRadius?: number | 'all';
  getRankingInfo?: boolean;
}

export interface SaveObjectOptions {
  objectID?: string;
  [key: string]: any;
}

export interface SearchForFacetValuesOptions {
  facetName: string;
  facetQuery: string;
  maxFacetHits?: number;
}

export interface AlgoliaAdapter {
  init(config: AlgoliaAdapterConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'degraded' | 'unhealthy'; error?: Error }, Error>>;

  // Get the underlying Algolia client
  getClient(): Result<SearchClient, Error>;

  // Index operations
  saveObject(indexName: string, object: SaveObjectOptions): Promise<Result<any, Error>>;
  saveObjects(indexName: string, objects: SaveObjectOptions[]): Promise<Result<any, Error>>;
  deleteObject(indexName: string, objectID: string): Promise<Result<any, Error>>;
  deleteObjects(indexName: string, objectIDs: string[]): Promise<Result<any, Error>>;
  clearObjects(indexName: string): Promise<Result<any, Error>>;

  // Search operations
  search(indexName: string, options: SearchOptions): Promise<Result<any, Error>>;
  searchForFacetValues(indexName: string, options: SearchForFacetValuesOptions): Promise<Result<any, Error>>;

  // Settings
  getSettings(indexName: string): Promise<Result<any, Error>>;
  setSettings(indexName: string, settings: any): Promise<Result<any, Error>>;
}

export const createAlgoliaAdapter = (): AlgoliaAdapter => {
  let client: SearchClient | null = null;
  let config: AlgoliaAdapterConfig | null = null;

  return {
    init: async (cfg: AlgoliaAdapterConfig): Promise<Result<void, Error>> => {
      try {
        config = cfg;

        const { algoliasearch } = await import('algoliasearch');

        client = algoliasearch(cfg.appId, cfg.apiKey, {
          authMode: cfg.authMode,
        });

        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    start: async (): Promise<Result<void, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      return ok(undefined);
    },

    stop: async (): Promise<Result<void, Error>> => {
      // Algolia client doesn't need explicit stop
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
        // Test with a simple list indices call
        await client.listIndices();
        return ok({ status: 'healthy' });
      } catch (error) {
        return ok({
          status: 'unhealthy',
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    },

    getClient: (): Result<SearchClient, Error> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }
      return ok(client);
    },

    saveObject: async (indexName: string, object: SaveObjectOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.saveObject({
          indexName,
          body: object,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    saveObjects: async (indexName: string, objects: SaveObjectOptions[]): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.saveObjects({
          indexName,
          objects,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteObject: async (indexName: string, objectID: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.deleteObject({
          indexName,
          objectID,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    deleteObjects: async (indexName: string, objectIDs: string[]): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.deleteObjects({
          indexName,
          objectIDs,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    clearObjects: async (indexName: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.clearObjects({
          indexName,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    search: async (indexName: string, options: SearchOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.searchSingleIndex({
          indexName,
          searchParams: {
            query: options.query,
            hitsPerPage: options.hitsPerPage,
            page: options.page,
            filters: options.filters,
            facetFilters: options.facetFilters,
            numericFilters: options.numericFilters,
            attributesToRetrieve: options.attributesToRetrieve,
            attributesToHighlight: options.attributesToHighlight,
            typoTolerance: options.typoTolerance,
            aroundLatLng: options.aroundLatLng,
            aroundRadius: options.aroundRadius,
            getRankingInfo: options.getRankingInfo,
          },
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    searchForFacetValues: async (indexName: string, options: SearchForFacetValuesOptions): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.searchForFacetValues({
          indexName,
          facetName: options.facetName,
          searchForFacetValuesRequest: {
            facetQuery: options.facetQuery,
            maxFacetHits: options.maxFacetHits,
          },
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getSettings: async (indexName: string): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.getSettings({
          indexName,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },

    setSettings: async (indexName: string, settings: any): Promise<Result<any, Error>> => {
      if (!client) {
        return err(new Error('Algolia client not initialized'));
      }

      try {
        const result = await client.setSettings({
          indexName,
          indexSettings: settings,
        });

        return ok(result);
      } catch (error) {
        return err(error instanceof Error ? error : new Error(String(error)));
      }
    },
  };
};
