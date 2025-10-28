/**
 * Example 5: Automatic Instrumentation
 *
 * Demonstrates:
 * - Automatic observability through message interception
 * - withMessageObservability wrapper
 * - Zero-config telemetry
 */

import {
  createInMemoryObservability,
  withMessageObservability,
  createConsoleAdapter,
  type Capability,
} from '../src/index.js';

// Message types
interface UserMessage {
  type: 'getUser' | 'createUser' | 'updateUser' | 'deleteUser';
  userId: string;
  data?: unknown;
}

// Simple user service
class UserService {
  private users: Map<string, unknown> = new Map();

  handleMessage(msg: UserMessage): void {
    switch (msg.type) {
      case 'getUser':
        console.log(`  [Service] Getting user ${msg.userId}`);
        this.users.get(msg.userId);
        break;

      case 'createUser':
        console.log(`  [Service] Creating user ${msg.userId}`);
        this.users.set(msg.userId, msg.data);
        break;

      case 'updateUser':
        console.log(`  [Service] Updating user ${msg.userId}`);
        this.users.set(msg.userId, msg.data);
        break;

      case 'deleteUser':
        console.log(`  [Service] Deleting user ${msg.userId}`);
        this.users.delete(msg.userId);
        break;
    }
  }
}

console.log('\n=== Automatic Instrumentation Example ===\n');

// Create service and observability
const service = new UserService();
const obs = createInMemoryObservability();

// Console adapter for visibility
const consoleAdapter = createConsoleAdapter({ colors: true, pretty: false });
const originalEmit = obs.emit;
obs.emit = (event) => {
  originalEmit(event);
  consoleAdapter(event);
};

// Create capability
const serviceCapability: Capability<UserMessage> = {
  send: (msg) => service.handleMessage(msg),
};

// Wrap with automatic observability
const instrumentedCapability = withMessageObservability(serviceCapability, obs, {
  // Operation name will be automatically extracted from message type
  // e.g., { type: 'getUser' } → operation 'message.getUser'
  createSpans: true,
  emitMetrics: true,
  propagateContext: true,
});

console.log('Sending messages through instrumented capability:\n');

// Send some messages - telemetry is automatic!
instrumentedCapability.send({ type: 'createUser', userId: 'user-1', data: { name: 'Alice' } });
instrumentedCapability.send({ type: 'getUser', userId: 'user-1' });
instrumentedCapability.send({ type: 'updateUser', userId: 'user-1', data: { name: 'Alice Updated' } });
instrumentedCapability.send({ type: 'deleteUser', userId: 'user-1' });

// Summary
console.log('\n=== Telemetry Summary ===\n');
const events = obs.getEvents();
const spans = events.filter((e) => e.type === 'span.start');
const metrics = events.filter((e) => e.type === 'metric');
const logs = events.filter((e) => e.type === 'log');

console.log(`Total events: ${events.length}`);
console.log(`Spans created: ${spans.length}`);
console.log(`Metrics recorded: ${metrics.length}`);
console.log(`Logs emitted: ${logs.length}`);

console.log('\nSpan operations:');
spans.forEach((span) => {
  if ('operation' in span) {
    console.log(`  - ${span.operation}`);
  }
});

console.log('\n✓ All telemetry collected automatically with zero configuration!\n');
