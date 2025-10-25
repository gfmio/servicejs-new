/**
 * HTTP client capability interface for ServiceJS.
 *
 * Provides platform-agnostic HTTP operations without ambient authority.
 *
 * @packageDocumentation
 */

import type { Result } from '@servicejs/result';

/**
 * HTTP methods.
 */
export type HTTPMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

/**
 * HTTP error codes.
 */
export type HTTPErrorCode =
  | 'NETWORK_ERROR' // Network failure (no connection, DNS failure, etc.)
  | 'TIMEOUT' // Request timeout
  | 'INVALID_URL' // Invalid URL format
  | 'INVALID_REQUEST' // Invalid request configuration
  | 'INVALID_RESPONSE' // Invalid response (e.g., unparseable body)
  | 'ABORTED' // Request was aborted
  | 'UNKNOWN'; // Unknown error

/**
 * HTTP error type.
 */
export interface HTTPError {
  readonly code: HTTPErrorCode;
  readonly message: string;
  readonly url?: string;
  readonly statusCode?: number;
}

/**
 * HTTP request headers.
 */
export type HTTPHeaders = Record<string, string>;

/**
 * HTTP request body.
 */
export type HTTPBody = string | Uint8Array | ArrayBuffer | Blob | FormData | URLSearchParams;

/**
 * HTTP response.
 */
export interface HTTPResponse {
  readonly status: number;
  readonly statusText: string;
  readonly headers: Readonly<HTTPHeaders>;
  readonly ok: boolean; // true if status 200-299

  /**
   * Get response body as text.
   */
  text(): Promise<Result<string, HTTPError>>;

  /**
   * Get response body as JSON.
   */
  json<T = unknown>(): Promise<Result<T, HTTPError>>;

  /**
   * Get response body as binary data.
   */
  arrayBuffer(): Promise<Result<ArrayBuffer, HTTPError>>;

  /**
   * Get response body as Blob (if supported).
   */
  blob?(): Promise<Result<Blob, HTTPError>>;
}

/**
 * HTTP request options.
 */
export interface HTTPRequestOptions {
  /**
   * Request method.
   */
  readonly method?: HTTPMethod;

  /**
   * Request headers.
   */
  readonly headers?: HTTPHeaders;

  /**
   * Request body.
   */
  readonly body?: HTTPBody;

  /**
   * Request timeout in milliseconds.
   */
  readonly timeout?: number;

  /**
   * Abort signal to cancel the request.
   */
  readonly signal?: AbortSignal;

  /**
   * Follow redirects. Default: true.
   */
  readonly redirect?: 'follow' | 'error' | 'manual';

  /**
   * Credentials mode.
   */
  readonly credentials?: 'omit' | 'same-origin' | 'include';
}

/**
 * HTTP client capability.
 *
 * Provides access to HTTP operations in a platform-agnostic way.
 *
 * @example
 * ```typescript
 * const http = runtime.http;
 *
 * // GET request
 * const response = await http.get('https://api.example.com/users');
 * if (response.ok) {
 *   const users = await response.value.json();
 *   console.log(users);
 * }
 *
 * // POST request
 * const createResult = await http.post(
 *   'https://api.example.com/users',
 *   {
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name: 'Alice' }),
 *   }
 * );
 * ```
 */
export interface HTTPCapability {
  /**
   * Make an HTTP request.
   *
   * @param url - Request URL
   * @param options - Request options
   * @returns Result containing HTTP response or error
   */
  request(
    url: string,
    options?: HTTPRequestOptions
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a GET request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to GET)
   * @returns Result containing HTTP response or error
   */
  get(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a POST request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to POST)
   * @returns Result containing HTTP response or error
   */
  post(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a PUT request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to PUT)
   * @returns Result containing HTTP response or error
   */
  put(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a PATCH request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to PATCH)
   * @returns Result containing HTTP response or error
   */
  patch(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a DELETE request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to DELETE)
   * @returns Result containing HTTP response or error
   */
  delete(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>>;

  /**
   * Make a HEAD request.
   *
   * @param url - Request URL
   * @param options - Request options (method will be overridden to HEAD)
   * @returns Result containing HTTP response or error
   */
  head(
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>>;
}
