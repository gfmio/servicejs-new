/**
 * Rate Limiting Example
 *
 * Demonstrates rate limiting for controlling message throughput.
 */

import { createCapability } from '@servicejs/core';
import { createRateLimiter } from '../src/rateLimiter.js';
import { isOk, isErr } from '@servicejs/result';

// Messages
interface APIRequest {
  readonly type: 'api-request';
  readonly endpoint: string;
  readonly id: number;
}

// Example 1: Basic Rate Limiting
console.log('\n=== Example 1: Basic Rate Limiting ===\n');

const requests: APIRequest[] = [];
const apiCapability = createCapability<APIRequest>((msg) => {
  requests.push(msg);
  console.log(`✓ API request ${msg.id}: ${msg.endpoint}`);
});

const limiter = createRateLimiter(apiCapability, {
  maxMessages: 5,
  windowMs: 1000,
  overflowStrategy: 'error',
});

console.log(`Available tokens: ${limiter.getAvailableTokens()}`);
console.log(`Time until refill: ${limiter.getTimeUntilRefill()}ms\n`);

// Send 5 requests (within limit)
for (let i = 1; i <= 5; i++) {
  const result = limiter.send({
    type: 'api-request',
    endpoint: '/api/data',
    id: i,
  });
  console.log(`Request ${i}: ${isOk(result) ? 'Sent' : 'Rate limited'}`);
  console.log(`  Available tokens: ${limiter.getAvailableTokens()}`);
}

// Example 2: Rate Limit Exceeded with Error
console.log('\n=== Example 2: Rate Limit Exceeded (Error Strategy) ===\n');

const limiter2 = createRateLimiter(apiCapability, {
  maxMessages: 3,
  windowMs: 1000,
  overflowStrategy: 'error',
});

// Send 5 requests (3 within limit, 2 should be rate limited)
for (let i = 1; i <= 5; i++) {
  const result = limiter2.send({
    type: 'api-request',
    endpoint: '/api/users',
    id: i,
  });

  if (isErr(result) && result.error.type === 'RATE_LIMITED') {
    console.log(`✗ Request ${i}: Rate limited`);
    console.log(`  Retry after: ${result.error.retryAfter}ms`);
  } else if (isOk(result)) {
    console.log(`✓ Request ${i}: Sent`);
  }
}

// Example 3: Rate Limit with Drop Strategy
console.log('\n=== Example 3: Rate Limit (Drop Strategy) ===\n');

const droppedRequests: number[] = [];

const limiter3 = createRateLimiter(apiCapability, {
  maxMessages: 2,
  windowMs: 1000,
  overflowStrategy: 'drop',
  onRateLimited: (msg) => {
    const apiMsg = msg as APIRequest;
    droppedRequests.push(apiMsg.id);
    console.log(`  (Request ${apiMsg.id} dropped silently)`);
  },
});

console.log('Sending 5 requests (limit: 2 per second)...\n');

for (let i = 1; i <= 5; i++) {
  const result = limiter3.send({
    type: 'api-request',
    endpoint: '/api/posts',
    id: i,
  });
  // All returns Ok, but some are dropped
  console.log(`Request ${i}: ${isOk(result) ? 'Returned OK' : 'Error'}`);
}

console.log(`\nDropped requests: ${droppedRequests.join(', ')}`);

// Example 4: Token Refill After Window
console.log('\n=== Example 4: Token Refill ===\n');

const limiter4 = createRateLimiter(apiCapability, {
  maxMessages: 3,
  windowMs: 500,
  overflowStrategy: 'error',
});

// Use all tokens
console.log('Using all 3 tokens...');
for (let i = 1; i <= 3; i++) {
  limiter4.send({ type: 'api-request', endpoint: '/test', id: i });
}

console.log(`Available tokens: ${limiter4.getAvailableTokens()}`);
console.log(`Time until refill: ${limiter4.getTimeUntilRefill()}ms\n`);

// Try to send (should fail)
const result1 = limiter4.send({ type: 'api-request', endpoint: '/test', id: 999 });
console.log(`Immediate send: ${isOk(result1) ? 'Success' : 'Rate limited'}`);

// Wait for window to expire
console.log('\nWaiting for token refill (500ms)...');
await new Promise((resolve) => setTimeout(resolve, 550));

console.log(`Available tokens: ${limiter4.getAvailableTokens()}`);

// Try again (should succeed)
const result2 = limiter4.send({ type: 'api-request', endpoint: '/test', id: 4 });
console.log(`After refill: ${isOk(result2) ? 'Success' : 'Rate limited'}`);

// Example 5: Manual Reset
console.log('\n=== Example 5: Manual Reset ===\n');

const limiter5 = createRateLimiter(apiCapability, {
  maxMessages: 2,
  windowMs: 10000, // 10 seconds
  overflowStrategy: 'error',
});

// Use all tokens
limiter5.send({ type: 'api-request', endpoint: '/test', id: 1 });
limiter5.send({ type: 'api-request', endpoint: '/test', id: 2 });

console.log(`Tokens before reset: ${limiter5.getAvailableTokens()}`);

// Manual reset
limiter5.reset();
console.log(`Tokens after reset: ${limiter5.getAvailableTokens()}`);

// Example 6: High Throughput Scenario
console.log('\n=== Example 6: High Throughput ===\n');

const successfulRequests: number[] = [];
const rateLimitedRequests: number[] = [];

const limiter6 = createRateLimiter(apiCapability, {
  maxMessages: 10,
  windowMs: 1000,
  overflowStrategy: 'error',
  onRateLimited: (msg) => {
    rateLimitedRequests.push((msg as APIRequest).id);
  },
});

console.log('Sending 20 requests rapidly (limit: 10/second)...\n');

for (let i = 1; i <= 20; i++) {
  const result = limiter6.send({
    type: 'api-request',
    endpoint: '/api/bulk',
    id: i,
  });

  if (isOk(result)) {
    successfulRequests.push(i);
  }
}

console.log(`Successful: ${successfulRequests.length} requests`);
console.log(`Rate limited: ${rateLimitedRequests.length} requests`);
console.log(`Rate limited IDs: ${rateLimitedRequests.join(', ')}`);

// Example 7: Monitoring Token Availability
console.log('\n=== Example 7: Token Monitoring ===\n');

const limiter7 = createRateLimiter(apiCapability, {
  maxMessages: 5,
  windowMs: 1000,
  overflowStrategy: 'error',
});

for (let i = 1; i <= 7; i++) {
  const available = limiter7.getAvailableTokens();
  const timeUntilRefill = limiter7.getTimeUntilRefill();

  console.log(
    `Request ${i} | Available: ${available} | Refill in: ${timeUntilRefill}ms`
  );

  const result = limiter7.send({
    type: 'api-request',
    endpoint: '/api/test',
    id: i,
  });

  if (isErr(result)) {
    console.log(`  ✗ Rate limited`);
  }
}

// Example 8: API Client with Rate Limiting
console.log('\n=== Example 8: API Client Simulation ===\n');

interface APIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

const apiClient = createCapability<APIRequest>((msg) => {
  console.log(`  [API] ${msg.endpoint} (ID: ${msg.id})`);
});

const rateLimitedClient = createRateLimiter(apiClient, {
  maxMessages: 3,
  windowMs: 1000,
  overflowStrategy: 'error',
});

const makeRequest = (id: number, endpoint: string): APIResponse => {
  const result = rateLimitedClient.send({
    type: 'api-request',
    endpoint,
    id,
  });

  if (isErr(result)) {
    if (result.error.type === 'RATE_LIMITED') {
      return {
        success: false,
        error: `Rate limited. Retry after ${result.error.retryAfter}ms`,
      };
    }
    return {
      success: false,
      error: 'Send failed',
    };
  }

  return {
    success: true,
    data: { id, endpoint },
  };
};

console.log('Simulating API client requests:\n');

const endpoints = ['/users', '/posts', '/comments', '/likes', '/shares'];

endpoints.forEach((endpoint, i) => {
  const response = makeRequest(i + 1, endpoint);
  console.log(`${endpoint}: ${response.success ? '✓ Success' : `✗ ${response.error}`}`);
});

// Example 9: Burst Handling
console.log('\n=== Example 9: Burst Handling ===\n');

const limiter9 = createRateLimiter(apiCapability, {
  maxMessages: 5,
  windowMs: 1000,
  overflowStrategy: 'drop',
});

console.log('Sending burst of 10 requests...');

const start = Date.now();
for (let i = 1; i <= 10; i++) {
  limiter9.send({
    type: 'api-request',
    endpoint: '/api/burst',
    id: i,
  });
}
const elapsed = Date.now() - start;

console.log(`Burst completed in ${elapsed}ms`);
console.log(`Final available tokens: ${limiter9.getAvailableTokens()}`);

console.log('\n✓ All rate limiting examples completed');
