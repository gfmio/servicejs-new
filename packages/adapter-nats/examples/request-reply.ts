/**
 * NATS Request-Reply Example
 *
 * This example demonstrates the request-reply pattern with NATS.
 *
 * Prerequisites:
 * - Start NATS: docker run -d -p 4222:4222 nats:latest
 * - Run: bun run examples/request-reply.ts
 */

import { createNatsAdapter, createNatsResponder } from '../src/nats.js';
import { isOk, isErr } from '@servicejs/result';

interface User {
  id: string;
  name: string;
  email: string;
}

// Simulated database
const users = new Map<string, User>([
  ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
  ['2', { id: '2', name: 'Bob', email: 'bob@example.com' }],
  ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com' }],
]);

async function main() {
  console.log('=== NATS Request-Reply Example ===\n');

  // Create adapter
  const nats = createNatsAdapter();

  // Initialize and start
  console.log('1. Connecting to NATS...');
  await nats.init({
    servers: 'nats://localhost:4222',
    name: 'request-reply-example',
  });
  await nats.start();
  console.log('✓ Connected to NATS\n');

  // Create responders
  console.log('2. Setting up responders...');

  // User lookup responder
  await createNatsResponder<{ userId: string }, { user: User | null }>(
    nats,
    'user.get',
    async (message) => {
      const user = users.get(message.data.userId) || null;
      console.log(`  📨 Request: user.get for userId=${message.data.userId}`);
      console.log(`  📤 Response: ${user ? user.name : 'not found'}`);
      return { user };
    }
  );

  // User list responder
  await createNatsResponder<void, { users: User[] }>(
    nats,
    'user.list',
    async () => {
      const userList = Array.from(users.values());
      console.log(`  📨 Request: user.list`);
      console.log(`  📤 Response: ${userList.length} users`);
      return { users: userList };
    }
  );

  // Math operations responder
  await createNatsResponder<{ a: number; b: number }, { result: number }>(
    nats,
    'math.add',
    async (message) => {
      const result = message.data.a + message.data.b;
      console.log(`  📨 Request: math.add (${message.data.a} + ${message.data.b})`);
      console.log(`  📤 Response: ${result}`);
      return { result };
    }
  );

  console.log('✓ Responders ready\n');

  // Wait for responders to be ready
  await new Promise(resolve => setTimeout(resolve, 100));

  // Make requests
  console.log('3. Making requests...\n');

  // Request 1: Get user by ID
  console.log('Request 1: Get user by ID');
  const user1Result = await nats.request<{ userId: string }, { user: User | null }>(
    'user.get',
    { userId: '1' },
    5000
  );

  if (isOk(user1Result) && user1Result.value.user) {
    console.log(`✓ Found user:`, user1Result.value.user);
  }
  console.log();

  // Request 2: Get non-existent user
  console.log('Request 2: Get non-existent user');
  const user999Result = await nats.request<{ userId: string }, { user: User | null }>(
    'user.get',
    { userId: '999' },
    5000
  );

  if (isOk(user999Result)) {
    console.log(`✓ Result: ${user999Result.value.user ? 'found' : 'not found'}`);
  }
  console.log();

  // Request 3: List all users
  console.log('Request 3: List all users');
  const listResult = await nats.request<void, { users: User[] }>(
    'user.list',
    undefined,
    5000
  );

  if (isOk(listResult)) {
    console.log(`✓ Found ${listResult.value.users.length} users:`);
    listResult.value.users.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
  }
  console.log();

  // Request 4: Math operation
  console.log('Request 4: Math operation');
  const mathResult = await nats.request<{ a: number; b: number }, { result: number }>(
    'math.add',
    { a: 42, b: 58 },
    5000
  );

  if (isOk(mathResult)) {
    console.log(`✓ Result: 42 + 58 = ${mathResult.value.result}`);
  }
  console.log();

  // Request 5: Multiple parallel requests
  console.log('Request 5: Multiple parallel requests');
  const [alice, bob, charlie] = await Promise.all([
    nats.request<{ userId: string }, { user: User | null }>('user.get', { userId: '1' }),
    nats.request<{ userId: string }, { user: User | null }>('user.get', { userId: '2' }),
    nats.request<{ userId: string }, { user: User | null }>('user.get', { userId: '3' }),
  ]);

  if (isOk(alice) && isOk(bob) && isOk(charlie)) {
    console.log('✓ Fetched 3 users in parallel:');
    console.log(`  - ${alice.value.user?.name}`);
    console.log(`  - ${bob.value.user?.name}`);
    console.log(`  - ${charlie.value.user?.name}`);
  }
  console.log();

  // Request 6: Timeout example
  console.log('Request 6: Timeout example (requesting non-existent service)');
  const timeoutResult = await nats.request(
    'non.existent.service',
    { data: 'test' },
    500 // Short timeout
  );

  if (isErr(timeoutResult)) {
    console.log(`✓ Request timed out as expected: ${timeoutResult.error.message}`);
  }
  console.log();

  // Cleanup
  console.log('4. Cleaning up...');
  await nats.stop();
  await nats.destroy();
  console.log('✓ Disconnected from NATS\n');

  console.log('=== Example Complete ===');
}

main().catch(console.error);
