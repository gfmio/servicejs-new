/**
 * OpenAPI Client Adapter for ServiceJS
 *
 * Provides schema-based REST API client generation from OpenAPI specifications.
 */

import { ok, err, type Result } from '@servicejs/result';

/**
 * OpenAPI configuration
 */
export interface OpenAPIConfig {
  baseURL: string;
  spec?: OpenAPISpec;
  specURL?: string;
  headers?: Record<string, string>;
  fetchOptions?: RequestInit;
}

/**
 * Simplified OpenAPI specification
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, Operation>>;
  components?: {
    schemas?: Record<string, any>;
  };
}

/**
 * OpenAPI operation
 */
export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

/**
 * OpenAPI parameter
 */
export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema: any;
}

/**
 * OpenAPI request body
 */
export interface RequestBody {
  required?: boolean;
  content: Record<string, { schema: any }>;
}

/**
 * OpenAPI response
 */
export interface Response {
  description: string;
  content?: Record<string, { schema: any }>;
}

/**
 * Request options
 */
export interface RequestOptions {
  path?: Record<string, string | number>;
  query?: Record<string, string | number | boolean>;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * OpenAPI adapter interface
 */
export interface OpenAPIAdapter {
  init(config: OpenAPIConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<boolean, Error>>;

  request<T = any>(method: string, path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  get<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  post<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  put<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  patch<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  delete<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>>;
  getSpec(): OpenAPISpec | null;
}

/**
 * Creates an OpenAPI client adapter
 *
 * @example
 * ```typescript
 * const adapter = createOpenAPIAdapter();
 * await adapter.init({
 *   baseURL: 'https://api.example.com',
 *   specURL: 'https://api.example.com/openapi.json'
 * });
 *
 * const result = await adapter.get('/users/{id}', {
 *   path: { id: '123' }
 * });
 * ```
 */
export function createOpenAPIAdapter(): OpenAPIAdapter {
  let config: OpenAPIConfig | null = null;
  let spec: OpenAPISpec | null = null;

  function buildURL(path: string, options?: RequestOptions): string {
    if (!config) throw new Error('Adapter not initialized');

    let url = path;

    // Replace path parameters
    if (options?.path) {
      for (const [key, value] of Object.entries(options.path)) {
        url = url.replace(`{${key}}`, String(value));
      }
    }

    // Add query parameters
    if (options?.query) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        searchParams.append(key, String(value));
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return `${config.baseURL}${url}`;
  }

  async function executeRequest<T>(
    method: string,
    path: string,
    options?: RequestOptions
  ): Promise<Result<T, Error>> {
    if (!config) {
      return err(new Error('Adapter not initialized'));
    }

    try {
      const url = buildURL(path, options);

      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
          ...options?.headers,
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        ...config.fetchOptions,
      });

      if (!response.ok) {
        return err(new Error(`HTTP error: ${response.status} ${response.statusText}`));
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return ok(data);
      }

      const text = await response.text();
      return ok(text as any);
    } catch (error) {
      return err(error instanceof Error ? error : new Error('Request failed'));
    }
  }

  return {
    async init(cfg: OpenAPIConfig): Promise<Result<void, Error>> {
      try {
        if (!cfg.baseURL) {
          return err(new Error('Base URL required'));
        }

        config = cfg;

        // Load spec if URL provided
        if (cfg.specURL) {
          const response = await fetch(cfg.specURL);
          if (response.ok) {
            spec = await response.json();
          }
        } else if (cfg.spec) {
          spec = cfg.spec;
        }

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
      return ok(undefined);
    },

    async destroy(): Promise<Result<void, Error>> {
      config = null;
      spec = null;
      return ok(undefined);
    },

    async health(): Promise<Result<boolean, Error>> {
      return ok(config !== null);
    },

    async request<T = any>(method: string, path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>(method, path, options);
    },

    async get<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>('GET', path, options);
    },

    async post<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>('POST', path, options);
    },

    async put<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>('PUT', path, options);
    },

    async patch<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>('PATCH', path, options);
    },

    async delete<T = any>(path: string, options?: RequestOptions): Promise<Result<T, Error>> {
      return executeRequest<T>('DELETE', path, options);
    },

    getSpec(): OpenAPISpec | null {
      return spec;
    },
  };
}
