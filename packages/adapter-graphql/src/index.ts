/**
 * GraphQL Client Adapter for ServiceJS
 *
 * Provides GraphQL query, mutation, and subscription capabilities.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * GraphQL configuration
 */
export interface GraphQLConfig {
  endpoint: string;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
}

/**
 * GraphQL query variables
 */
export type Variables = Record<string, any>;

/**
 * GraphQL response
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
    extensions?: Record<string, any>;
  }>;
}

/**
 * Subscription callback
 */
export type SubscriptionCallback<T = any> = (data: T) => void;

/**
 * GraphQL adapter interface
 */
export interface GraphQLAdapter {
  init(config: GraphQLConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  query<T = any>(query: string, variables?: Variables): Promise<Result<T, Error>>;
  mutate<T = any>(mutation: string, variables?: Variables): Promise<Result<T, Error>>;
  subscribe<T = any>(subscription: string, variables: Variables, callback: SubscriptionCallback<T>): Promise<Result<() => void, Error>>;
}

/**
 * Creates a GraphQL client adapter
 *
 * @example
 * ```typescript
 * const adapter = createGraphQLAdapter();
 * await adapter.init({
 *   endpoint: 'https://api.example.com/graphql',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 *
 * const result = await adapter.query(`
 *   query GetUser($id: ID!) {
 *     user(id: $id) {
 *       id
 *       name
 *       email
 *     }
 *   }
 * `, { id: '123' });
 * ```
 */
export function createGraphQLAdapter(): GraphQLAdapter {
  let config: GraphQLConfig | null = null;
  const subscriptions = new Map<string, Set<SubscriptionCallback>>();

  async function executeQuery<T>(
    query: string,
    variables?: Variables
  ): Promise<Result<T, Error>> {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({ query, variables }),
        ...config.fetchOptions,
      });

      if (!response.ok) {
        return err(new Error(`HTTP error: ${response.status} ${response.statusText}`));
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map(e => e.message).join(', ');
        return err(new Error(`GraphQL errors: ${errorMessages}`));
      }

      if (!result.data) {
        return err(new Error('No data returned from GraphQL query'));
      }

      return ok(result.data);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('GraphQL request failed'));
    }
  }

  return {
    async init(cfg: GraphQLConfig): Promise<Result<void, Error>> {
      try {
        if (!cfg.endpoint) {
          return err(new Error('GraphQL endpoint required'));
        }
        config = cfg;
        return ok(undefined);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Failed to initialize'));
      }
    },

    async start(): Promise<Result<void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }
      return ok(undefined);
    },

    async stop(): Promise<Result<void, Error>> {
      // Clear all subscriptions
      subscriptions.clear();
      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      config = null;
      subscriptions.clear();
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      if (!config) {
        return ok(false);
      }

      // Try a simple introspection query
      const result = await executeQuery('{ __typename }');
      return ok(result.ok);
    },

    async query<T = any>(query: string, variables?: Variables): Promise<Result<T, Error>> {
      return executeQuery<T>(query, variables);
    },

    async mutate<T = any>(mutation: string, variables?: Variables): Promise<Result<T, Error>> {
      return executeQuery<T>(mutation, variables);
    },

    async subscribe<T = any>(
      subscription: string,
      variables: Variables,
      callback: SubscriptionCallback<T>
    ): Promise<Result<() => void, Error>> {
      if (!config) {
        return err(new Error('Adapter not initialized'));
      }

      try {
        // Mock subscription - in production, this would use WebSocket
        const subscriptionId = `${subscription}:${JSON.stringify(variables)}`;

        if (!subscriptions.has(subscriptionId)) {
          subscriptions.set(subscriptionId, new Set());
        }

        subscriptions.get(subscriptionId)!.add(callback);

        // Return unsubscribe function
        const unsubscribe = () => {
          const callbacks = subscriptions.get(subscriptionId);
          if (callbacks) {
            callbacks.delete(callback);
            if (callbacks.size === 0) {
              subscriptions.delete(subscriptionId);
            }
          }
        };

        return ok(unsubscribe);
      } catch (error) {
        return err(error instanceof Error ? error : new Error('Subscription failed'));
      }
    },
  };
}
