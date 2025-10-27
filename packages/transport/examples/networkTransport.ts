/**
 * Network Transport Examples
 *
 * Demonstrates WebSocket-based communication using network transport.
 *
 * Note: These examples show the API usage. In a real application, you would
 * connect to an actual WebSocket server.
 */

import { createNetworkTransport, type MessageEnvelope } from '../src/index.js';

console.log('Network Transport Examples');
console.log('==========================\n');

console.log('Note: These examples show API usage.');
console.log('To run them, you would need a WebSocket server.\n');

// Example 1: Basic Client Connection
console.log('=== Example 1: Basic Client Connection ===\n');

const basicUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

// Connect to server
const connectResult = await transport.connect();

if (connectResult.isOk()) {
  console.log('Connected to server');
  console.log(\`Connected: \${transport.isConnected()}\`);
}

// Set up message handler
transport.onReceive((envelope) => {
  console.log(\`Received from \${envelope.from}:\`, envelope.message);
});

// Send message to server
await transport.send({
  from: 'urn:client:app',
  to: 'urn:server:api',
  message: { type: 'hello', data: 'Hello server!' },
});
`;

console.log(basicUsage);

// Example 2: Request-Reply Pattern
console.log('\n=== Example 2: Request-Reply Pattern ===\n');

const requestReplyUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

await transport.connect();

// Track pending requests
const pendingRequests = new Map<string, (envelope: MessageEnvelope) => void>();

transport.onReceive((envelope) => {
  const handler = pendingRequests.get(envelope.correlationId || '');
  if (handler) {
    handler(envelope);
    pendingRequests.delete(envelope.correlationId || '');
  }
});

// Helper to make requests
const makeRequest = async (message: any): Promise<MessageEnvelope> => {
  const correlationId = \`req-\${Date.now()}\`;

  const responsePromise = new Promise<MessageEnvelope>((resolve) => {
    pendingRequests.set(correlationId, resolve);

    // Timeout after 5 seconds
    setTimeout(() => {
      pendingRequests.delete(correlationId);
      throw new Error('Request timeout');
    }, 5000);
  });

  await transport.send({
    from: 'urn:client:app',
    to: 'urn:server:api',
    message,
    correlationId,
  });

  return responsePromise;
};

// Make a request
const response = await makeRequest({ type: 'getData', id: 123 });
console.log('Response:', response.message);
`;

console.log(requestReplyUsage);

// Example 3: Auto-Reconnect
console.log('\n=== Example 3: Auto-Reconnect ===\n');

const autoReconnectUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  autoReconnect: true,
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
});

transport.onError((error) => {
  if (error.type === 'CONNECTION_CLOSED') {
    console.log('Connection closed - will auto-reconnect');
  } else if (error.type === 'CONNECTION_FAILED') {
    console.log('Connection failed:', error.error);
  }
});

await transport.connect();

// If connection drops, transport will automatically attempt to reconnect
// up to maxReconnectAttempts times, waiting reconnectInterval ms between attempts
`;

console.log(autoReconnectUsage);

// Example 4: Connection Timeout
console.log('\n=== Example 4: Connection Timeout ===\n');

const timeoutUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://slow-server.example.com',
  connectionTimeout: 3000, // 3 seconds
});

const result = await transport.connect();

if (result.isErr() && result.error.type === 'CONNECTION_FAILED') {
  console.log('Failed to connect within timeout period');
}
`;

console.log(timeoutUsage);

// Example 5: WebSocket Protocols
console.log('\n=== Example 5: WebSocket Protocols ===\n');

const protocolsUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
  protocols: ['servicejs', 'v1'],
});

await transport.connect();

// Server will select one of the specified protocols
`;

console.log(protocolsUsage);

// Example 6: Error Handling
console.log('\n=== Example 6: Error Handling ===\n');

const errorHandlingUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

await transport.connect();

transport.onError((error) => {
  switch (error.type) {
    case 'NOT_CONNECTED':
      console.log('Not connected to server');
      break;

    case 'SEND_FAILED':
      console.log(\`Failed to send to \${error.urn}\`);
      break;

    case 'CONNECTION_CLOSED':
      console.log('Connection was closed');
      break;

    case 'CONNECTION_FAILED':
      console.log('Connection failed:', error.error);
      break;

    case 'SERIALIZATION_FAILED':
      console.log('Failed to serialize message');
      break;

    case 'DESERIALIZATION_FAILED':
      console.log('Failed to deserialize message');
      break;
  }
});
`;

console.log(errorHandlingUsage);

// Example 7: Secure WebSocket (WSS)
console.log('\n=== Example 7: Secure WebSocket (WSS) ===\n');

const secureUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'wss://secure-server.example.com', // Use wss:// for TLS
});

await transport.connect();

// All communication is encrypted via TLS
`;

console.log(secureUsage);

// Example 8: Connection Lifecycle
console.log('\n=== Example 8: Connection Lifecycle ===\n');

const lifecycleUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

console.log(\`Initial: connected=\${transport.isConnected()}\`); // false

await transport.connect();
console.log(\`After connect: connected=\${transport.isConnected()}\`); // true

await transport.disconnect();
console.log(\`After disconnect: connected=\${transport.isConnected()}\`); // false

// Can reconnect
await transport.connect();
console.log(\`After reconnect: connected=\${transport.isConnected()}\`); // true
`;

console.log(lifecycleUsage);

// Example 9: Message Timestamps
console.log('\n=== Example 9: Message Timestamps ===\n');

const timestampUsage = `
const transport = createNetworkTransport({
  localUrn: 'urn:client:app',
  url: 'ws://localhost:8080',
});

await transport.connect();

transport.onReceive((envelope) => {
  if (envelope.timestamp) {
    const latency = Date.now() - envelope.timestamp;
    console.log(\`Message latency: \${latency}ms\`);
  }
});

// Send with timestamp
await transport.send({
  from: 'urn:client:app',
  to: 'urn:server:api',
  message: { type: 'ping' },
  timestamp: Date.now(),
});
`;

console.log(timestampUsage);

// Example 10: Server-Side Usage
console.log('\n=== Example 10: Server-Side Usage ===\n');

const serverUsage = `
/**
 * Example WebSocket Server (using ws library)
 */
import { WebSocketServer } from 'ws';
import { createNetworkTransport } from '@servicejs/transport';

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Create transport for this connection
  const transport = createNetworkTransport({
    localUrn: 'urn:server:api',
    url: '', // Not used for server-side
    worker: ws as any, // WebSocket implements the same interface
  });

  await transport.connect();

  transport.onReceive(async (envelope) => {
    console.log('Server received:', envelope.message);

    // Echo back
    await transport.send({
      from: 'urn:server:api',
      to: envelope.from,
      message: { type: 'response', echo: envelope.message },
      correlationId: envelope.correlationId,
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    transport.disconnect();
  });
});

console.log('WebSocket server listening on ws://localhost:8080');
`;

console.log(serverUsage);

console.log('\n✓ Network transport examples completed');
console.log('\nTo use these examples, set up a WebSocket server and update the URLs accordingly.');
