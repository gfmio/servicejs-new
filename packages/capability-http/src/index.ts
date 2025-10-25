/**
 * @servicejs/capability-http
 *
 * HTTP client capability interface for ServiceJS.
 *
 * Provides platform-agnostic HTTP operations without ambient authority.
 *
 * @example
 * ```typescript
 * import { createMockHTTP } from '@servicejs/capability-http';
 *
 * const http = createMockHTTP();
 *
 * http.mockRoute('https://api.example.com/users', {
 *   status: 200,
 *   body: [{ id: 1, name: 'Alice' }],
 * });
 *
 * const response = await http.get('https://api.example.com/users');
 * if (response.ok) {
 *   const users = await response.value.json();
 *   console.log(users);
 * }
 * ```
 *
 * @packageDocumentation
 */

export type {
  HTTPCapability,
  HTTPError,
  HTTPErrorCode,
  HTTPResponse,
  HTTPRequestOptions,
  HTTPMethod,
  HTTPHeaders,
  HTTPBody,
} from './types.js';

export type {
  MockHTTPCapability,
  MockHTTPResponse,
  MockHTTPError,
  MockHTTPResult,
  MockRoute,
  CapturedRequest,
  RequestMatcher,
} from './mock.js';

export { createMockHTTP, createNoOpHTTP } from './mock.js';
