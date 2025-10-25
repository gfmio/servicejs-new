/**
 * HTTP mocking for tests
 */

import { createMockHTTP } from '@servicejs/capability-http';
import { isOk } from '@servicejs/result';

console.log('HTTP Mocking Example\n');

// Create a mock HTTP client
const http = createMockHTTP();

// Add mock responses
http.addMock({
  matcher: 'https://api.example.com/users',
  response: {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]),
  },
});

http.addMock({
  matcher: /\/users\/\d+$/,
  response: {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, name: 'Alice', email: 'alice@example.com' }),
  },
});

// Make requests
console.log('GET /users...');
const usersResult = await http.get('https://api.example.com/users');
if (isOk(usersResult)) {
  const response = usersResult.value;
  console.log(`Status: ${response.status} ${response.statusText}`);

  const jsonResult = await response.json();
  if (isOk(jsonResult)) {
    console.log('Users:', jsonResult.value);
  }
}

console.log('\nGET /users/1...');
const userResult = await http.get('https://api.example.com/users/1');
if (isOk(userResult)) {
  const response = userResult.value;
  const jsonResult = await response.json();
  if (isOk(jsonResult)) {
    console.log('User:', jsonResult.value);
  }
}

// Check captured requests
const requests = http.getCapturedRequests();
console.log(`\nCaptured ${requests.length} requests:`);
for (const req of requests) {
  console.log(`  - ${req.options?.method || 'GET'} ${req.url}`);
}
