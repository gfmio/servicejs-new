/**
 * Mock HTTP implementation for testing.
 */

import { ok, err, isOk } from '@servicejs/result';
import type { Result } from '@servicejs/result';
import type {
  HTTPCapability,
  HTTPError,
  HTTPResponse,
  HTTPRequestOptions,
  HTTPHeaders,
} from './types.js';

/**
 * Mock response configuration.
 */
export interface MockHTTPResponse {
  readonly status: number;
  readonly statusText?: string;
  readonly headers?: HTTPHeaders;
  readonly body?: string | Uint8Array | ArrayBuffer | object;
  readonly delay?: number; // Delay in milliseconds
}

/**
 * Mock error configuration.
 */
export interface MockHTTPError {
  readonly code: HTTPError['code'];
  readonly message: string;
  readonly delay?: number;
}

/**
 * Mock response or error.
 */
export type MockHTTPResult = MockHTTPResponse | MockHTTPError;

/**
 * Request matcher function.
 */
export type RequestMatcher = (url: string, options?: HTTPRequestOptions) => boolean;

/**
 * Mock route configuration.
 */
export interface MockRoute {
  readonly matcher: string | RegExp | RequestMatcher;
  readonly response: MockHTTPResult;
}

/**
 * Captured request.
 */
export interface CapturedRequest {
  readonly url: string;
  readonly options?: HTTPRequestOptions;
  readonly timestamp: number;
}

/**
 * Mock HTTP capability configuration.
 */
export interface MockHTTPCapability extends HTTPCapability {
  /**
   * Add a mock route.
   */
  mockRoute(matcher: string | RegExp | RequestMatcher, response: MockHTTPResult): void;

  /**
   * Clear all mock routes.
   */
  clearRoutes(): void;

  /**
   * Get all captured requests.
   */
  getCapturedRequests(): readonly CapturedRequest[];

  /**
   * Clear captured requests.
   */
  clearCapturedRequests(): void;

  /**
   * Set default response for unmatched requests.
   */
  setDefaultResponse(response: MockHTTPResult): void;
}

/**
 * Create a mock HTTP response object.
 */
function createMockResponse(config: MockHTTPResponse): HTTPResponse {
  const headers = config.headers || {};
  const status = config.status;
  const statusText = config.statusText || getDefaultStatusText(status);

  let bodyData: string | Uint8Array | ArrayBuffer = '';

  if (config.body !== undefined) {
    if (typeof config.body === 'string') {
      bodyData = config.body;
    } else if (config.body instanceof Uint8Array || config.body instanceof ArrayBuffer) {
      bodyData = config.body;
    } else {
      // Object - convert to JSON
      bodyData = JSON.stringify(config.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  const frozenHeaders = Object.freeze({ ...headers });

  // Create methods that capture bodyData and headers in closure
  const text = async (): Promise<Result<string, HTTPError>> => {
    if (typeof bodyData === 'string') {
      return ok(bodyData);
    } else if (bodyData instanceof ArrayBuffer) {
      const decoder = new TextDecoder();
      return ok(decoder.decode(bodyData));
    } else {
      const decoder = new TextDecoder();
      return ok(decoder.decode(bodyData));
    }
  };

  const json = async <T = unknown>(): Promise<Result<T, HTTPError>> => {
    const textResult = await text();
    if (!isOk(textResult)) {
      return textResult as Result<T, HTTPError>;
    }

    try {
      const parsed = JSON.parse(textResult.value);
      return ok(parsed);
    } catch (error) {
      return err({
        code: 'INVALID_RESPONSE',
        message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const arrayBuffer = async (): Promise<Result<ArrayBuffer, HTTPError>> => {
    if (bodyData instanceof ArrayBuffer) {
      return ok(bodyData);
    } else if (bodyData instanceof Uint8Array) {
      return ok(bodyData.buffer as ArrayBuffer);
    } else {
      const encoder = new TextEncoder();
      return ok(encoder.encode(bodyData).buffer as ArrayBuffer);
    }
  };

  const blob = async (): Promise<Result<Blob, HTTPError>> => {
    if (typeof Blob === 'undefined') {
      return err({
        code: 'INVALID_RESPONSE',
        message: 'Blob is not supported in this environment',
      });
    }

    const arrayBufferResult = await arrayBuffer();
    if (!isOk(arrayBufferResult)) {
      return arrayBufferResult as Result<Blob, HTTPError>;
    }

    const blobObject = new Blob([arrayBufferResult.value], {
      type: frozenHeaders['Content-Type'] || frozenHeaders['content-type'] || 'application/octet-stream',
    });

    return ok(blobObject);
  };

  return {
    status,
    statusText,
    headers: frozenHeaders,
    ok: status >= 200 && status < 300,
    text,
    json,
    arrayBuffer,
    blob,
  };
}

/**
 * Get default status text for a status code.
 */
function getDefaultStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return statusTexts[status] || 'Unknown';
}

/**
 * Match a request against a matcher.
 */
function matchesRequest(
  matcher: string | RegExp | RequestMatcher,
  url: string,
  options?: HTTPRequestOptions
): boolean {
  if (typeof matcher === 'string') {
    return url === matcher || url.startsWith(matcher);
  } else if (matcher instanceof RegExp) {
    return matcher.test(url);
  } else {
    return matcher(url, options);
  }
}

/**
 * Create a mock HTTP capability for testing.
 *
 * @param routes - Optional initial routes
 * @returns Mock HTTP capability
 *
 * @example
 * ```typescript
 * const http = createMockHTTP();
 *
 * // Mock a successful response
 * http.mockRoute('https://api.example.com/users', {
 *   status: 200,
 *   body: [{ id: 1, name: 'Alice' }],
 * });
 *
 * // Make request
 * const response = await http.get('https://api.example.com/users');
 * if (response.ok) {
 *   const users = await response.value.json();
 *   console.log(users); // [{ id: 1, name: 'Alice' }]
 * }
 *
 * // Verify request was made
 * const requests = http.getCapturedRequests();
 * expect(requests.length).toBe(1);
 * expect(requests[0].url).toBe('https://api.example.com/users');
 * ```
 */
export function createMockHTTP(routes: MockRoute[] = []): MockHTTPCapability {
  const mockRoutes: MockRoute[] = [...routes];
  const capturedRequests: CapturedRequest[] = [];
  let defaultResponse: MockHTTPResult = {
    code: 'NETWORK_ERROR',
    message: 'No mock route configured for this request',
  };

  const findMockResult = (url: string, options?: HTTPRequestOptions): MockHTTPResult | undefined => {
    for (const route of mockRoutes) {
      if (matchesRequest(route.matcher, url, options)) {
        return route.response;
      }
    }
    return defaultResponse;
  };

  const executeRequest = async (
    url: string,
    options?: HTTPRequestOptions
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    // Capture request
    const capturedRequest: CapturedRequest = {
      url,
      timestamp: Date.now(),
    };
    if (options !== undefined) {
      (capturedRequest as any).options = options;
    }
    capturedRequests.push(capturedRequest);

    // Find matching mock
    const mockResult = findMockResult(url, options);

    if (!mockResult) {
      return err({
        code: 'NETWORK_ERROR',
        message: 'No mock response configured',
        url,
      });
    }

    // Apply delay if specified
    if ('delay' in mockResult && mockResult.delay) {
      await new Promise(resolve => setTimeout(resolve, mockResult.delay));
    }

    // Return error or response
    if ('code' in mockResult) {
      return err({
        code: mockResult.code,
        message: mockResult.message,
        url,
      });
    } else {
      return ok(createMockResponse(mockResult));
    }
  };

  const request = async (
    url: string,
    options?: HTTPRequestOptions
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, options);
  };

  const get = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'GET' });
  };

  const post = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'POST' });
  };

  const put = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'PUT' });
  };

  const patch = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'PATCH' });
  };

  const deleteMethod = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'DELETE' });
  };

  const head = async (
    url: string,
    options?: Omit<HTTPRequestOptions, 'method' | 'body'>
  ): Promise<Result<HTTPResponse, HTTPError>> => {
    return executeRequest(url, { ...options, method: 'HEAD' });
  };

  return {
    request,
    get,
    post,
    put,
    patch,
    delete: deleteMethod,
    head,

    mockRoute(matcher: string | RegExp | RequestMatcher, response: MockHTTPResult): void {
      mockRoutes.push({ matcher, response });
    },

    clearRoutes(): void {
      mockRoutes.length = 0;
    },

    getCapturedRequests(): readonly CapturedRequest[] {
      return [...capturedRequests];
    },

    clearCapturedRequests(): void {
      capturedRequests.length = 0;
    },

    setDefaultResponse(response: MockHTTPResult): void {
      defaultResponse = response;
    },
  };
}

/**
 * Create a no-op HTTP capability where all requests fail.
 *
 * @returns No-op HTTP capability
 */
export function createNoOpHTTP(): HTTPCapability {
  const noOpError: HTTPError = {
    code: 'NETWORK_ERROR',
    message: 'HTTP access disabled',
  };

  const failRequest = async (): Promise<Result<HTTPResponse, HTTPError>> => {
    return err(noOpError);
  };

  return {
    request: failRequest,
    get: failRequest,
    post: failRequest,
    put: failRequest,
    patch: failRequest,
    delete: failRequest,
    head: failRequest,
  };
}
