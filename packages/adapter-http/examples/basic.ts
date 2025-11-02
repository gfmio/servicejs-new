/**
 * Basic HTTP client example
 *
 * This example demonstrates:
 * - Initializing the HTTP adapter
 * - Making GET and POST requests
 * - Handling responses
 */

import { createHTTPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createHTTPAdapter();

  // Initialize with base configuration
  await adapter.init({
    baseURL: 'https://jsonplaceholder.typicode.com',
    headers: {
      'User-Agent': 'ServiceJS HTTP Adapter Example'
    },
    timeout: 10000
  });

  // Make a GET request
  console.log('Making GET request...');
  const getResult = await adapter.get('/posts/1');

  if (isOk(getResult)) {
    console.log('GET Response:');
    console.log('  Status:', getResult.value.status);
    console.log('  Data:', getResult.value.data);
  } else {
    console.error('GET Error:', getResult.error);
  }

  // Make a POST request
  console.log('\nMaking POST request...');
  const postResult = await adapter.post('/posts', {
    title: 'My New Post',
    body: 'This is the content of my post',
    userId: 1
  });

  if (isOk(postResult)) {
    console.log('POST Response:');
    console.log('  Status:', postResult.value.status);
    console.log('  Data:', postResult.value.data);
  } else {
    console.error('POST Error:', postResult.error);
  }
}

main().catch(console.error);
