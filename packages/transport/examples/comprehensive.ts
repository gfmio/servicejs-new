/**
 * Comprehensive Transport Example
 *
 * Demonstrates using local, worker, and network transports together
 * in a realistic application scenario.
 */

import {
  createLocalTransport,
  createWorkerTransport,
  createNetworkTransport,
  type Transport,
  type MessageEnvelope,
  type WorkerLike,
} from '../src/index.js';

console.log('\n=== Comprehensive Transport Example ===\n');
console.log('Building a distributed application with multiple transport types\n');

// Mock Worker for demonstration
class MockWorker implements WorkerLike {
  private messageHandlers: ((event: MessageEvent) => void)[] = [];
  private errorHandlers: ((event: ErrorEvent) => void)[] = [];

  postMessage(message: unknown): void {
    setTimeout(() => {
      this.messageHandlers.forEach((handler) => {
        handler(new MessageEvent('message', { data: message }));
      });
    }, 10);
  }

  addEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') {
      this.messageHandlers.push(listener);
    } else if (type === 'error') {
      this.errorHandlers.push(listener);
    }
  }

  removeEventListener(type: 'message' | 'error', listener: any): void {
    if (type === 'message') {
      const index = this.messageHandlers.indexOf(listener);
      if (index >= 0) this.messageHandlers.splice(index, 1);
    } else if (type === 'error') {
      const index = this.errorHandlers.indexOf(listener);
      if (index >= 0) this.errorHandlers.splice(index, 1);
    }
  }
}

// Scenario: Multi-tier Application
// - Local components (in-process services)
// - Worker components (background processing)
// - Network components (remote API)

// 1. Local Components (In-Process Services)
console.log('1. Setting up local components...\n');

const localComponents = {
  router: createLocalTransport({ localUrn: 'urn:local:router' }),
  authService: createLocalTransport({ localUrn: 'urn:local:auth' }),
  dataService: createLocalTransport({ localUrn: 'urn:local:data' }),
};

// Connect all local components
for (const [name, transport] of Object.entries(localComponents)) {
  await transport.connect();
  console.log(`  ✓ ${name} connected`);
}

// 2. Worker Components (Background Processing)
console.log('\n2. Setting up worker components...\n');

const worker = new MockWorker();
const workerTransport = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker,
});

await workerTransport.connect();
console.log('  ✓ worker transport connected');

// 3. Network Component (Remote API) - conceptual
console.log('\n3. Network component (conceptual)...\n');
console.log('  (Would connect to ws://api.example.com)');

// 4. Set up message routing
console.log('\n4. Setting up message routing...\n');

// Router forwards messages to appropriate services
localComponents.router.onReceive(async (envelope) => {
  console.log(`  [Router] Routing message: ${envelope.message.type}`);

  const message = envelope.message as { type: string; service?: string };

  // Route based on service field
  switch (message.service) {
    case 'auth':
      await localComponents.authService.send({
        from: envelope.from,
        to: 'urn:local:auth',
        message: envelope.message,
        correlationId: envelope.correlationId,
      });
      break;

    case 'data':
      await localComponents.dataService.send({
        from: envelope.from,
        to: 'urn:local:data',
        message: envelope.message,
        correlationId: envelope.correlationId,
      });
      break;

    case 'worker':
      await workerTransport.send({
        from: envelope.from,
        to: 'urn:worker:processor',
        message: envelope.message,
        correlationId: envelope.correlationId,
      });
      break;
  }
});

// Auth service handles authentication
localComponents.authService.onReceive(async (envelope) => {
  console.log(`  [Auth] Processing: ${envelope.message.type}`);

  // Simulate authentication
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Send response back via router
  await localComponents.router.send({
    from: 'urn:local:auth',
    to: envelope.from,
    message: { type: 'auth-response', authenticated: true },
    correlationId: envelope.correlationId,
  });
});

// Data service handles data operations
localComponents.dataService.onReceive(async (envelope) => {
  console.log(`  [Data] Processing: ${envelope.message.type}`);

  // Simulate data retrieval
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Send response back via router
  await localComponents.router.send({
    from: 'urn:local:data',
    to: envelope.from,
    message: { type: 'data-response', data: { id: 123, name: 'Example' } },
    correlationId: envelope.correlationId,
  });
});

// Worker handles heavy processing
workerTransport.onReceive(async (envelope) => {
  console.log(`  [Worker] Processing: ${envelope.message.type}`);

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 20));

  // Send response back via router
  await localComponents.router.send({
    from: 'urn:worker:processor',
    to: envelope.from,
    message: { type: 'worker-response', result: 'processed' },
    correlationId: envelope.correlationId,
  });
});

// 5. Client Code
console.log('\n5. Running client requests...\n');

const client = createLocalTransport({ localUrn: 'urn:local:client' });
await client.connect();

// Track pending requests
const pendingRequests = new Map<string, (envelope: MessageEnvelope) => void>();

client.onReceive((envelope) => {
  const handler = pendingRequests.get(envelope.correlationId || '');
  if (handler) {
    handler(envelope);
    pendingRequests.delete(envelope.correlationId || '');
  }
});

// Helper to make requests
const makeRequest = async (service: string, message: any): Promise<MessageEnvelope> => {
  const correlationId = `req-${Date.now()}-${Math.random()}`;

  const responsePromise = new Promise<MessageEnvelope>((resolve) => {
    pendingRequests.set(correlationId, resolve);
  });

  await client.send({
    from: 'urn:local:client',
    to: 'urn:local:router',
    message: { ...message, service },
    correlationId,
  });

  return responsePromise;
};

// Make authentication request
console.log('  → Client: Authenticating...');
const authResponse = await makeRequest('auth', { type: 'authenticate', user: 'alice' });
console.log(`  ← Client: Auth response:`, authResponse.message);

// Make data request
console.log('\n  → Client: Fetching data...');
const dataResponse = await makeRequest('data', { type: 'getData', id: 123 });
console.log(`  ← Client: Data response:`, dataResponse.message);

// Make worker request
console.log('\n  → Client: Sending to worker...');
const workerResponse = await makeRequest('worker', { type: 'heavyTask', data: [1, 2, 3] });
console.log(`  ← Client: Worker response:`, workerResponse.message);

// 6. Transport Abstraction Example
console.log('\n6. Transport abstraction example...\n');

// Function that works with any transport type
const sendHeartbeat = async (transport: Transport, target: string): Promise<void> => {
  await transport.send({
    from: transport.getLocalUrn(),
    to: target,
    message: { type: 'heartbeat' },
    timestamp: Date.now(),
  });
};

// Use with local transport
await sendHeartbeat(localComponents.router, 'urn:local:auth');
console.log('  ✓ Sent heartbeat via local transport');

// Use with worker transport
await sendHeartbeat(workerTransport, 'urn:worker:processor');
console.log('  ✓ Sent heartbeat via worker transport');

// 7. Error Handling Across Transports
console.log('\n7. Error handling...\n');

const setupErrorHandling = (transport: Transport, name: string): void => {
  transport.onError((error) => {
    console.log(`  [${name}] Error: ${error.type}`);
  });
};

setupErrorHandling(localComponents.router, 'Router');
setupErrorHandling(localComponents.authService, 'Auth');
setupErrorHandling(localComponents.dataService, 'Data');
setupErrorHandling(workerTransport, 'Worker');

console.log('  ✓ Error handlers registered for all transports');

// 8. Statistics and Monitoring
console.log('\n8. Statistics...\n');

let messagesSent = 0;
let messagesReceived = 0;

const wrapSend = (transport: Transport): Transport => {
  const originalSend = transport.send.bind(transport);
  return {
    ...transport,
    send: async (envelope) => {
      messagesSent++;
      return originalSend(envelope);
    },
  };
};

console.log(`  Messages sent: ${messagesSent}`);
console.log(`  Messages received: ${messagesReceived}`);

// 9. Cleanup
console.log('\n9. Cleanup...\n');

await client.disconnect();
console.log('  ✓ Client disconnected');

for (const [name, transport] of Object.entries(localComponents)) {
  await transport.disconnect();
  console.log(`  ✓ ${name} disconnected`);
}

await workerTransport.disconnect();
console.log('  ✓ Worker transport disconnected');

console.log('\n✓ Comprehensive example completed\n');

// Summary
console.log('Summary');
console.log('=======\n');
console.log('This example demonstrated:');
console.log('  • Local transport for in-process components');
console.log('  • Worker transport for background processing');
console.log('  • Network transport (conceptual) for remote APIs');
console.log('  • Message routing between transports');
console.log('  • Request-reply pattern with correlation IDs');
console.log('  • Transport abstraction (works with any transport type)');
console.log('  • Error handling across all transports');
console.log('  • Connection lifecycle management');
console.log('  • Monitoring and statistics\n');
