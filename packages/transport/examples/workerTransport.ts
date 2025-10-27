/**
 * Worker Transport Examples
 *
 * Demonstrates communication with Web Workers using worker transport.
 *
 * Note: These examples show the API usage. In a real application, you would
 * create actual Worker instances and use them with the transport.
 */

import { createWorkerTransport, type WorkerLike, type MessageEnvelope } from '../src/index.js';

// Mock worker for demonstration (in real code, use: new Worker('worker.js'))
class MockWorker implements WorkerLike {
  private messageHandlers: ((event: MessageEvent) => void)[] = [];
  private errorHandlers: ((event: ErrorEvent) => void)[] = [];

  postMessage(message: unknown): void {
    console.log('  [Worker] Received message from main');
    // Echo back for demo
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

// Example 1: Basic Worker Communication
console.log('\n=== Example 1: Basic Worker Communication ===\n');

const worker1 = new MockWorker();

const transport1 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker1,
});

await transport1.connect();
console.log(`Transport connected: ${transport1.isConnected()}`);

transport1.onReceive((envelope) => {
  console.log(`Main thread received: ${envelope.message.type}`);
  console.log(`  From: ${envelope.from}`);
  console.log(`  Message:`, envelope.message);
});

await transport1.send({
  from: 'urn:main:app',
  to: 'urn:worker:processor',
  message: { type: 'process', data: [1, 2, 3, 4, 5] },
});

// Wait for response
await new Promise((resolve) => setTimeout(resolve, 50));

// Example 2: Request-Reply Pattern
console.log('\n=== Example 2: Request-Reply Pattern ===\n');

const worker2 = new MockWorker();

const transport2 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker2,
});

await transport2.connect();

// Track pending requests
const pendingRequests = new Map<string, (envelope: MessageEnvelope) => void>();

transport2.onReceive((envelope) => {
  const handler = pendingRequests.get(envelope.correlationId || '');
  if (handler) {
    handler(envelope);
    pendingRequests.delete(envelope.correlationId || '');
  }
});

// Helper function to make requests
const makeRequest = async (message: unknown): Promise<MessageEnvelope> => {
  const correlationId = `req-${Date.now()}-${Math.random()}`;

  const responsePromise = new Promise<MessageEnvelope>((resolve) => {
    pendingRequests.set(correlationId, resolve);
  });

  await transport2.send({
    from: 'urn:main:app',
    to: 'urn:worker:compute',
    message: message as any,
    correlationId,
  });

  return responsePromise;
};

console.log('Sending request to worker...');
const response = await makeRequest({ type: 'compute', value: 42 });
console.log('Received response from worker');
console.log(`  Correlation ID: ${response.correlationId}`);

// Example 3: Multiple Workers
console.log('\n=== Example 3: Multiple Workers ===\n');

const workers = Array.from({ length: 3 }, () => new MockWorker());

const transports = workers.map((worker, i) =>
  createWorkerTransport({
    localUrn: `urn:main:coordinator`,
    worker,
  })
);

for (const transport of transports) {
  await transport.connect();
}

console.log(`Created ${transports.length} worker transports`);

let responsesReceived = 0;

for (let i = 0; i < transports.length; i++) {
  transports[i]!.onReceive((envelope) => {
    console.log(`Worker ${i} completed task`);
    responsesReceived++;
  });

  await transports[i]!.send({
    from: 'urn:main:coordinator',
    to: `urn:worker:processor-${i}`,
    message: { type: 'task', id: i },
  });
}

// Wait for all responses
await new Promise((resolve) => {
  const interval = setInterval(() => {
    if (responsesReceived === transports.length) {
      clearInterval(interval);
      resolve(undefined);
    }
  }, 10);
});

console.log(`All ${responsesReceived} workers responded`);

// Example 4: Error Handling
console.log('\n=== Example 4: Error Handling ===\n');

const worker4 = new MockWorker();

const transport4 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker4,
});

await transport4.connect();

transport4.onError((error) => {
  console.log(`Transport error: ${error.type}`);
  if (error.type === 'DESERIALIZATION_FAILED') {
    console.log('  Failed to deserialize message from worker');
  }
});

console.log('Error handler registered');

// Example 5: Connection Lifecycle
console.log('\n=== Example 5: Connection Lifecycle ===\n');

const worker5 = new MockWorker();

const transport5 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker5,
});

console.log(`Initial state: connected=${transport5.isConnected()}`);

await transport5.connect();
console.log(`After connect: connected=${transport5.isConnected()}`);

await transport5.disconnect();
console.log(`After disconnect: connected=${transport5.isConnected()}`);

// Can reconnect
await transport5.connect();
console.log(`After reconnect: connected=${transport5.isConnected()}`);

// Example 6: Large Data Transfer
console.log('\n=== Example 6: Large Data Transfer ===\n');

const worker6 = new MockWorker();

const transport6 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker6,
});

await transport6.connect();

transport6.onReceive((envelope) => {
  console.log(`Received large data response`);
  const data = (envelope.message as { type: string; data: number[] }).data;
  console.log(`  Data length: ${data.length}`);
});

// Send large array to worker for processing
const largeArray = Array.from({ length: 10000 }, (_, i) => i);

await transport6.send({
  from: 'urn:main:app',
  to: 'urn:worker:processor',
  message: { type: 'processLarge', data: largeArray },
});

await new Promise((resolve) => setTimeout(resolve, 50));

// Example 7: Worker Health Check
console.log('\n=== Example 7: Worker Health Check ===\n');

const worker7 = new MockWorker();

const transport7 = createWorkerTransport({
  localUrn: 'urn:main:app',
  worker: worker7,
});

await transport7.connect();

// Implement ping-pong health check
let lastPingTime = 0;
let pingTimeout: ReturnType<typeof setTimeout> | undefined;

transport7.onReceive((envelope) => {
  if (envelope.message.type === 'pong') {
    const latency = Date.now() - lastPingTime;
    console.log(`Worker is healthy (latency: ${latency}ms)`);
    if (pingTimeout) {
      clearTimeout(pingTimeout);
      pingTimeout = undefined;
    }
  }
});

const sendHealthCheck = async (): Promise<void> => {
  lastPingTime = Date.now();

  pingTimeout = setTimeout(() => {
    console.log('Worker health check timeout - worker may be unresponsive');
  }, 1000);

  await transport7.send({
    from: 'urn:main:app',
    to: 'urn:worker:processor',
    message: { type: 'ping' },
  });
};

await sendHealthCheck();
await new Promise((resolve) => setTimeout(resolve, 50));

console.log('\n✓ All worker transport examples completed');

/**
 * Example Worker Code (worker.js)
 *
 * This would go in a separate worker.js file:
 *
 * ```typescript
 * import { createWorkerTransport } from '@servicejs/transport';
 *
 * const transport = createWorkerTransport({
 *   localUrn: 'urn:worker:processor',
 *   worker: self as any,
 * });
 *
 * await transport.connect();
 *
 * transport.onReceive(async (envelope) => {
 *   switch (envelope.message.type) {
 *     case 'process':
 *       const result = processData(envelope.message.data);
 *
 *       await transport.send({
 *         from: 'urn:worker:processor',
 *         to: envelope.from,
 *         message: { type: 'result', data: result },
 *         correlationId: envelope.correlationId,
 *       });
 *       break;
 *
 *     case 'ping':
 *       await transport.send({
 *         from: 'urn:worker:processor',
 *         to: envelope.from,
 *         message: { type: 'pong' },
 *       });
 *       break;
 *   }
 * });
 * ```
 */
