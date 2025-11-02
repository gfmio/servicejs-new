/**
 * HTTP interceptors example
 *
 * This example demonstrates:
 * - Request interceptors for authentication
 * - Response interceptors for logging
 * - Error interceptors for error handling
 */

import { createHTTPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createHTTPAdapter();

  await adapter.init({
    baseURL: 'https://jsonplaceholder.typicode.com'
  });

  // Add request interceptor for authentication
  adapter.addRequestInterceptor((url, options) => {
    console.log(`[Request] ${options.method || 'GET'} ${url}`);

    return {
      url,
      options: {
        ...options,
        headers: {
          ...options.headers,
          'X-Custom-Header': 'my-value',
          'X-Request-ID': crypto.randomUUID()
        }
      }
    };
  });

  // Add response interceptor for logging
  adapter.addResponseInterceptor((response) => {
    console.log(`[Response] ${response.status} ${response.url}`);
    console.log(`[Response] Duration: ${response.headers.get('X-Duration') || 'N/A'}`);
    return response;
  });

  // Add response interceptor for data transformation
  adapter.addResponseInterceptor((response) => {
    // Transform data if needed
    const data = response.data;
    if (data && typeof data === 'object') {
      // Add a timestamp to all responses
      return {
        ...response,
        data: {
          ...data,
          _fetchedAt: new Date().toISOString()
        }
      };
    }
    return response;
  });

  // Add error interceptor
  adapter.addErrorInterceptor((error) => {
    console.error(`[Error] ${error.message}`);

    // Transform error messages
    if (error.message.includes('HTTP 404')) {
      return new Error('Resource not found');
    }
    if (error.message.includes('HTTP 500')) {
      return new Error('Server error - please try again later');
    }

    return error;
  });

  // Make requests - interceptors will be applied
  console.log('\nMaking request to /posts/1...');
  const result1 = await adapter.get('/posts/1');

  if (isOk(result1)) {
    console.log('Data:', result1.value.data);
  }

  console.log('\nMaking request to /posts/999 (will 404)...');
  const result2 = await adapter.get('/posts/999');

  if (!isOk(result2)) {
    console.log('Error:', result2.error.message);
  }

  console.log('\nMaking POST request...');
  const result3 = await adapter.post('/posts', {
    title: 'Test Post',
    body: 'This is a test',
    userId: 1
  });

  if (isOk(result3)) {
    console.log('Created:', result3.value.data);
  }
}

main().catch(console.error);
