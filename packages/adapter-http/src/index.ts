/**
 * HTTP Client Adapter for ServiceJS
 * Modern HTTP client with interceptors, retry logic, and timeout handling
 */

import { ok, err, type Result } from '@servicejs/result';

export interface HTTPConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  params?: Record<string, string>;
}

export interface HTTPResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
}

export type RequestInterceptor = (url: string, options: RequestOptions) => Promise<{ url: string; options: RequestOptions }> | { url: string; options: RequestOptions };
export type ResponseInterceptor = (response: HTTPResponse) => Promise<HTTPResponse> | HTTPResponse;
export type ErrorInterceptor = (error: Error) => Promise<Error | HTTPResponse> | Error | HTTPResponse;

export interface HTTPAdapter {
  init(config: HTTPConfig): Promise<Result<void, Error>>;
  start(): Promise<Result<void, Error>>;
  stop(): Promise<Result<void, Error>>;
  destroy(): Promise<Result<void, Error>>;
  health(): Promise<Result<{ status: 'healthy' | 'unhealthy' }, Error>>;

  request<T = any>(url: string, options?: RequestOptions): Promise<Result<HTTPResponse<T>, Error>>;
  get<T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse<T>, Error>>;
  post<T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse<T>, Error>>;
  put<T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse<T>, Error>>;
  patch<T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse<T>, Error>>;
  delete<T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<Result<HTTPResponse<T>, Error>>;

  addRequestInterceptor(interceptor: RequestInterceptor): void;
  addResponseInterceptor(interceptor: ResponseInterceptor): void;
  addErrorInterceptor(interceptor: ErrorInterceptor): void;
}

export const createHTTPAdapter = (): HTTPAdapter => {
  let config: HTTPConfig | null = null;

  const requestInterceptors: RequestInterceptor[] = [];
  const responseInterceptors: ResponseInterceptor[] = [];
  const errorInterceptors: ErrorInterceptor[] = [];

  const buildURL = (url: string, params?: Record<string, string>): string => {
    const fullURL = config?.baseURL ? `${config.baseURL}${url}` : url;

    if (!params || Object.keys(params).length === 0) {
      return fullURL;
    }

    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');

    return `${fullURL}?${queryString}`;
  };

  const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  };

  const executeRequest = async <T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<Result<HTTPResponse<T>, Error>> => {
    try {
      // Apply request interceptors
      let interceptedURL = url;
      let interceptedOptions = options;

      for (const interceptor of requestInterceptors) {
        const result = await interceptor(interceptedURL, interceptedOptions);
        interceptedURL = result.url;
        interceptedOptions = result.options;
      }

      const fullURL = buildURL(interceptedURL, interceptedOptions.params);
      const timeout = interceptedOptions.timeout ?? config?.timeout ?? 30000;
      const method = interceptedOptions.method || 'GET';

      const headers: Record<string, string> = {
        ...config?.headers,
        ...interceptedOptions.headers,
      };

      // Add Content-Type for body requests
      if (interceptedOptions.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (interceptedOptions.body) {
        fetchOptions.body = typeof interceptedOptions.body === 'string'
          ? interceptedOptions.body
          : JSON.stringify(interceptedOptions.body);
      }

      const response = await fetch(fullURL, fetchOptions);
      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      let httpResponse: HTTPResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        url: fullURL,
      };

      // Apply response interceptors
      for (const interceptor of responseInterceptors) {
        httpResponse = await interceptor(httpResponse);
      }

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        return err(error);
      }

      return ok(httpResponse);
    } catch (error) {
      let finalError = error instanceof Error ? error : new Error(String(error));

      // Apply error interceptors
      for (const interceptor of errorInterceptors) {
        const result = await interceptor(finalError);
        if (result instanceof Error) {
          finalError = result;
        } else {
          // Interceptor returned a response, return it as success
          return ok(result as HTTPResponse<T>);
        }
      }

      return err(finalError);
    }
  };

  const requestWithRetry = async <T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<Result<HTTPResponse<T>, Error>> => {
    const maxRetries = options.retries ?? config?.retries ?? 0;
    const retryDelay = config?.retryDelay ?? 1000;

    let lastResult: Result<HTTPResponse<T>, Error> = err(new Error('No attempts made'));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await executeRequest<T>(url, options);

      if (lastResult.ok) {
        return lastResult;
      }

      // Retry on network errors or 5xx status codes
      if (attempt < maxRetries) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }
    }

    return lastResult;
  };

  return {
    init: async (cfg) => {
      config = {
        timeout: 30000,
        retries: 0,
        retryDelay: 1000,
        ...cfg,
      };
      return ok(undefined);
    },

    start: async () => ok(undefined),
    stop: async () => ok(undefined),
    destroy: async () => {
      config = null;
      requestInterceptors.length = 0;
      responseInterceptors.length = 0;
      errorInterceptors.length = 0;
      return ok(undefined);
    },

    health: async () => ok({ status: config ? 'healthy' as const : 'unhealthy' as const }),

    request: async <T = any>(url: string, options?: RequestOptions) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, options);
    },

    get: async <T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, { ...options, method: 'GET' });
    },

    post: async <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, { ...options, method: 'POST', body });
    },

    put: async <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, { ...options, method: 'PUT', body });
    },

    patch: async <T = any>(url: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, { ...options, method: 'PATCH', body });
    },

    delete: async <T = any>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) => {
      if (!config) return err(new Error('HTTP adapter not initialized'));
      return requestWithRetry<T>(url, { ...options, method: 'DELETE' });
    },

    addRequestInterceptor: (interceptor) => {
      requestInterceptors.push(interceptor);
    },

    addResponseInterceptor: (interceptor) => {
      responseInterceptors.push(interceptor);
    },

    addErrorInterceptor: (interceptor) => {
      errorInterceptors.push(interceptor);
    },
  };
};
