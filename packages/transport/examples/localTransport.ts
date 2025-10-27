/**
 * Local Transport Examples
 *
 * Demonstrates in-process communication using local transport.
 */

import { createLocalTransport, getLocalTransportRegistry, type MessageEnvelope } from '../src/index.js';

// Example 1: Basic Local Communication
console.log('\n=== Example 1: Basic Local Communication ===\n');

const componentA = createLocalTransport({
  localUrn: 'urn:local:component-a',
});

const componentB = createLocalTransport({
  localUrn: 'urn:local:component-b',
});

await componentA.connect();
await componentB.connect();

componentB.onReceive((envelope) => {
  console.log(`B received: ${envelope.message.type}`);
  console.log(`  From: ${envelope.from}`);
  console.log(`  Message:`, envelope.message);
});

await componentA.send({
  from: 'urn:local:component-a',
  to: 'urn:local:component-b',
  message: { type: 'hello', data: 'Hello from A!' },
});

// Example 2: Bidirectional Communication
console.log('\n=== Example 2: Bidirectional Communication ===\n');

componentA.onReceive((envelope) => {
  console.log(`A received: ${envelope.message.type}`);
  console.log(`  Response:`, envelope.message);
});

componentB.onReceive((envelope) => {
  console.log(`B received: ${envelope.message.type}`);

  // Reply back to A
  componentB.send({
    from: 'urn:local:component-b',
    to: envelope.from,
    message: { type: 'response', data: 'Thanks for the message!' },
  });
});

await componentA.send({
  from: 'urn:local:component-a',
  to: 'urn:local:component-b',
  message: { type: 'greeting', data: 'Hi B!' },
});

// Wait for response
await new Promise((resolve) => setTimeout(resolve, 50));

// Example 3: Request-Reply with Correlation ID
console.log('\n=== Example 3: Request-Reply with Correlation ID ===\n');

const client = createLocalTransport({
  localUrn: 'urn:local:client',
});

const server = createLocalTransport({
  localUrn: 'urn:local:server',
});

await client.connect();
await server.connect();

// Server handles requests
server.onReceive((envelope) => {
  console.log(`Server received request: ${envelope.correlationId}`);

  // Process and send reply with same correlation ID
  server.send({
    from: 'urn:local:server',
    to: envelope.from,
    message: { type: 'response', result: 42 },
    correlationId: envelope.correlationId,
  });
});

// Client sends request
const pendingRequests = new Map<string, (envelope: MessageEnvelope) => void>();

client.onReceive((envelope) => {
  const handler = pendingRequests.get(envelope.correlationId || '');
  if (handler) {
    handler(envelope);
    pendingRequests.delete(envelope.correlationId || '');
  }
});

const requestId = `req-${Date.now()}`;

const responsePromise = new Promise<MessageEnvelope>((resolve) => {
  pendingRequests.set(requestId, resolve);
});

await client.send({
  from: 'urn:local:client',
  to: 'urn:local:server',
  message: { type: 'compute', data: [1, 2, 3] },
  correlationId: requestId,
});

const response = await responsePromise;
console.log(`Client received response: ${response.correlationId}`);
console.log(`  Result:`, response.message);

// Example 4: Multiple Components Communication
console.log('\n=== Example 4: Multiple Components ===\n');

const coordinator = createLocalTransport({
  localUrn: 'urn:local:coordinator',
});

const workers = Array.from({ length: 3 }, (_, i) =>
  createLocalTransport({
    localUrn: `urn:local:worker-${i}`,
  })
);

await coordinator.connect();
for (const worker of workers) {
  await worker.connect();
}

console.log(`Registry size: ${getLocalTransportRegistry().size()}`);

// Workers report back to coordinator
for (const worker of workers) {
  worker.onReceive((envelope) => {
    console.log(`${worker.getLocalUrn()} received task`);

    // Simulate work and report back
    setTimeout(async () => {
      await worker.send({
        from: worker.getLocalUrn(),
        to: 'urn:local:coordinator',
        message: { type: 'done', worker: worker.getLocalUrn() },
      });
    }, Math.random() * 100);
  });
}

let completedTasks = 0;
coordinator.onReceive((envelope) => {
  console.log(`Coordinator: Worker ${envelope.from} completed task`);
  completedTasks++;
});

// Distribute work to all workers
for (let i = 0; i < workers.length; i++) {
  await coordinator.send({
    from: 'urn:local:coordinator',
    to: `urn:local:worker-${i}`,
    message: { type: 'task', id: i },
  });
}

// Wait for all tasks to complete
await new Promise((resolve) => {
  const interval = setInterval(() => {
    if (completedTasks === workers.length) {
      clearInterval(interval);
      resolve(undefined);
    }
  }, 10);
});

console.log(`All ${completedTasks} tasks completed`);

// Example 5: Error Handling
console.log('\n=== Example 5: Error Handling ===\n');

const sender = createLocalTransport({
  localUrn: 'urn:local:sender',
});

await sender.connect();

sender.onError((error) => {
  console.log(`Error occurred: ${error.type}`);
  if (error.type === 'SEND_FAILED') {
    console.log(`  Failed to send to: ${error.urn}`);
  }
});

// Try to send to unknown destination
const result = await sender.send({
  from: 'urn:local:sender',
  to: 'urn:local:unknown',
  message: { type: 'test' },
});

if (result.isErr()) {
  console.log(`Send failed: ${result.error.type}`);
}

// Example 6: Connection Lifecycle
console.log('\n=== Example 6: Connection Lifecycle ===\n');

const lifecycleComponent = createLocalTransport({
  localUrn: 'urn:local:lifecycle',
});

console.log(`Initial state: connected=${lifecycleComponent.isConnected()}`);

await lifecycleComponent.connect();
console.log(`After connect: connected=${lifecycleComponent.isConnected()}`);
console.log(`Registry size: ${getLocalTransportRegistry().size()}`);

await lifecycleComponent.disconnect();
console.log(`After disconnect: connected=${lifecycleComponent.isConnected()}`);
console.log(`Registry size: ${getLocalTransportRegistry().size()}`);

// Can reconnect
await lifecycleComponent.connect();
console.log(`After reconnect: connected=${lifecycleComponent.isConnected()}`);

// Example 7: Message Timestamps
console.log('\n=== Example 7: Message Timestamps ===\n');

const timestampSender = createLocalTransport({
  localUrn: 'urn:local:timestamp-sender',
});

const timestampReceiver = createLocalTransport({
  localUrn: 'urn:local:timestamp-receiver',
});

await timestampSender.connect();
await timestampReceiver.connect();

timestampReceiver.onReceive((envelope) => {
  if (envelope.timestamp) {
    const latency = Date.now() - envelope.timestamp;
    console.log(`Message latency: ${latency}ms`);
    console.log(`  Sent at: ${new Date(envelope.timestamp).toISOString()}`);
  }
});

await timestampSender.send({
  from: 'urn:local:timestamp-sender',
  to: 'urn:local:timestamp-receiver',
  message: { type: 'ping' },
  timestamp: Date.now(),
});

// Example 8: Shared Object References (No Serialization)
console.log('\n=== Example 8: Shared Object References ===\n');

const refSender = createLocalTransport({
  localUrn: 'urn:local:ref-sender',
});

const refReceiver = createLocalTransport({
  localUrn: 'urn:local:ref-receiver',
});

await refSender.connect();
await refReceiver.connect();

const sharedState = { count: 0 };

refReceiver.onReceive((envelope) => {
  // Local transport preserves object references
  const state = (envelope.message as { type: string; state: typeof sharedState }).state;
  state.count++;
  console.log(`Receiver incremented count to: ${state.count}`);
  console.log(`  Same reference: ${state === sharedState}`);
});

await refSender.send({
  from: 'urn:local:ref-sender',
  to: 'urn:local:ref-receiver',
  message: { type: 'increment', state: sharedState },
});

console.log(`Original count after send: ${sharedState.count}`);

console.log('\n✓ All local transport examples completed');
