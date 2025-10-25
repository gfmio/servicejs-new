/**
 * Request capture and verification
 */

import { createMockHTTP } from '@servicejs/capability-http';
import { isOk } from '@servicejs/result';

console.log('Request Capture Example\n');

const http = createMockHTTP();

// Set up default response
http.setDefaultResponse({
  status: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ success: true }),
});

// Make various requests
await http.get('https://api.example.com/items');
await http.post('https://api.example.com/items', {
  body: JSON.stringify({ name: 'New Item' }),
  headers: { 'Content-Type': 'application/json' },
});
await http.put('https://api.example.com/items/1', {
  body: JSON.stringify({ name: 'Updated Item' }),
});
await http.delete('https://api.example.com/items/2');

// Verify requests
const requests = http.getCapturedRequests();
console.log(`Captured ${requests.length} requests:\n`);

for (const req of requests) {
  const method = req.options?.method || 'GET';
  console.log(`${method} ${req.url}`);
  if (req.options?.headers) {
    console.log(`  Headers: ${JSON.stringify(req.options.headers)}`);
  }
  if (req.options?.body) {
    console.log(`  Body: ${req.options.body}`);
  }
  console.log();
}

// Clear and verify
http.clearMocks();
http.clearCapturedRequests();
console.log(`Requests after clear: ${http.getCapturedRequests().length}`);
