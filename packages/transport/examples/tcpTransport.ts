/**
 * TCP Transport Examples
 *
 * Demonstrates server-to-server communication using TCP sockets (Node.js only).
 *
 * Note: These examples require a TCP server to be running. They are designed
 * to show the API usage rather than being fully runnable examples.
 */

import { createTCPTransport } from '../src/tcpTransport.js';
import type { MessageEnvelope } from '../src/transport.js';

// Example 1: Basic TCP Client Connection
console.log('\n=== Example 1: Basic TCP Client Connection ===\n');

const client1 = createTCPTransport({
  urn: 'urn:client:app1' as any,
  host: 'localhost',
  port: 9000,
});

// Connect to server
const connectResult1 = await client1.connect();

if (connectResult1.success) {
  console.log('Connected to TCP server');

  // Set up message handler
  client1.onReceive((envelope) => {
    console.log(`Received from server: ${JSON.stringify(envelope.message)}`);
  });

  // Send message
  const sendResult = await client1.send({
    from: 'urn:client:app1' as any,
    to: 'urn:server:main' as any,
    message: { type: 'hello', data: 'Hello TCP!' },
  });

  if (sendResult.success) {
    console.log('Message sent successfully');
  } else {
    console.error('Failed to send message:', sendResult.error);
  }

  // Disconnect
  await client1.disconnect();
  console.log('Disconnected from server');
} else {
  console.error('Failed to connect:', connectResult1.error);
}

// Example 2: Automatic Reconnection
console.log('\n=== Example 2: Automatic Reconnection ===\n');

const client2 = createTCPTransport({
  urn: 'urn:client:app2' as any,
  host: 'localhost',
  port: 9001,
  reconnect: true,
  reconnectDelay: 1000, // 1 second
  maxReconnectAttempts: 5,
});

// Handle connection errors
client2.onError((error) => {
  console.log(`Connection error: ${error.type}`);
  if (error.type === 'CONNECTION_FAILED') {
    console.log('Will retry connection automatically...');
  }
});

const connectResult2 = await client2.connect();

if (connectResult2.success) {
  console.log('Connected with auto-reconnect enabled');

  // Send messages continuously
  for (let i = 0; i < 5; i++) {
    await client2.send({
      from: 'urn:client:app2' as any,
      to: 'urn:server:main' as any,
      message: { type: 'ping', sequence: i, timestamp: Date.now() },
    });

    console.log(`Sent ping ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await client2.disconnect();
} else {
  console.error('Failed to connect even with retries');
}

// Example 3: Request-Reply Pattern over TCP
console.log('\n=== Example 3: Request-Reply Pattern over TCP ===\n');

const client3 = createTCPTransport({
  urn: 'urn:client:rpc' as any,
  host: 'localhost',
  port: 9002,
});

await client3.connect();

// Set up response handler
const responses = new Map<string, any>();

client3.onReceive((envelope) => {
  if (envelope.message.correlationId) {
    responses.set(envelope.message.correlationId, envelope.message);
    console.log(`Received response for request ${envelope.message.correlationId}`);
  }
});

// Send request with correlation ID
const correlationId = `req-${Date.now()}`;

await client3.send({
  from: 'urn:client:rpc' as any,
  to: 'urn:server:rpc' as any,
  message: {
    type: 'request',
    correlationId,
    method: 'getData',
    params: { id: 123 },
  },
  correlationId,
});

console.log(`Sent request with correlation ID: ${correlationId}`);

// Wait for response
await new Promise((resolve) => setTimeout(resolve, 100));

if (responses.has(correlationId)) {
  console.log(`Got response: ${JSON.stringify(responses.get(correlationId))}`);
}

await client3.disconnect();

// Example 4: Multiple Concurrent Connections
console.log('\n=== Example 4: Multiple Concurrent Connections ===\n');

const clients = [
  createTCPTransport({
    urn: 'urn:client:1' as any,
    host: 'localhost',
    port: 9003,
  }),
  createTCPTransport({
    urn: 'urn:client:2' as any,
    host: 'localhost',
    port: 9003,
  }),
  createTCPTransport({
    urn: 'urn:client:3' as any,
    host: 'localhost',
    port: 9003,
  }),
];

// Connect all clients
const connections = await Promise.all(clients.map((c) => c.connect()));

const connectedClients = clients.filter((_, i) => connections[i].success);
console.log(`Connected ${connectedClients.length} out of ${clients.length} clients`);

// Send messages from all clients concurrently
const sends = connectedClients.map((client, i) =>
  client.send({
    from: client.getLocalUrn(),
    to: 'urn:server:load-test' as any,
    message: { type: 'data', clientId: i, timestamp: Date.now() },
  })
);

await Promise.all(sends);
console.log('All messages sent');

// Disconnect all
await Promise.all(connectedClients.map((c) => c.disconnect()));
console.log('All clients disconnected');

// Example 5: Connection Timeout Handling
console.log('\n=== Example 5: Connection Timeout Handling ===\n');

const client5 = createTCPTransport({
  urn: 'urn:client:timeout' as any,
  host: 'non-existent-host.example.com',
  port: 9999,
  connectionTimeout: 2000, // 2 second timeout
});

console.log('Attempting to connect to non-existent host...');
const startTime = Date.now();

const connectResult5 = await client5.connect();

const duration = Date.now() - startTime;

if (!connectResult5.success) {
  console.log(`Connection failed after ${duration}ms (expected timeout)`);
  console.log(`Error type: ${connectResult5.error.type}`);
} else {
  console.log('Unexpected success');
  await client5.disconnect();
}

// Example 6: Binary Message Protocol
console.log('\n=== Example 6: Binary Message Protocol ===\n');

const client6 = createTCPTransport({
  urn: 'urn:client:binary' as any,
  host: 'localhost',
  port: 9004,
});

await client6.connect();

// Send message with binary data
const binaryData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);

await client6.send({
  from: 'urn:client:binary' as any,
  to: 'urn:server:binary' as any,
  message: {
    type: 'binary-upload',
    filename: 'data.bin',
    data: Array.from(binaryData), // Convert to array for JSON serialization
    size: binaryData.length,
  },
});

console.log(`Sent binary data (${binaryData.length} bytes)`);

await client6.disconnect();

// Example 7: Health Check and Keep-Alive
console.log('\n=== Example 7: Health Check and Keep-Alive ===\n');

const client7 = createTCPTransport({
  urn: 'urn:client:health' as any,
  host: 'localhost',
  port: 9005,
  keepAlive: true,
  keepAliveInterval: 30000, // 30 seconds
});

await client7.connect();

// Check if connected
if (client7.isConnected()) {
  console.log('Connection is healthy');

  // Send periodic heartbeats
  const heartbeatInterval = setInterval(async () => {
    if (client7.isConnected()) {
      await client7.send({
        from: 'urn:client:health' as any,
        to: 'urn:server:health' as any,
        message: { type: 'heartbeat', timestamp: Date.now() },
      });
      console.log('Heartbeat sent');
    } else {
      console.log('Connection lost, stopping heartbeats');
      clearInterval(heartbeatInterval);
    }
  }, 5000); // Every 5 seconds

  // Run for 15 seconds
  await new Promise((resolve) => setTimeout(resolve, 15000));

  clearInterval(heartbeatInterval);
}

await client7.disconnect();

// Example 8: Error Handling and Recovery
console.log('\n=== Example 8: Error Handling and Recovery ===\n');

const client8 = createTCPTransport({
  urn: 'urn:client:robust' as any,
  host: 'localhost',
  port: 9006,
  reconnect: true,
  maxReconnectAttempts: 3,
});

// Track errors
const errors: any[] = [];
client8.onError((error) => {
  errors.push(error);
  console.log(`Error occurred: ${error.type}`);
});

// Track connection state
let wasConnected = false;

const connectResult8 = await client8.connect();

if (connectResult8.success) {
  wasConnected = true;
  console.log('Initial connection successful');

  // Simulate network operations with error handling
  for (let i = 0; i < 5; i++) {
    const result = await client8.send({
      from: 'urn:client:robust' as any,
      to: 'urn:server:robust' as any,
      message: { type: 'operation', id: i },
    });

    if (result.success) {
      console.log(`Operation ${i} succeeded`);
    } else {
      console.log(`Operation ${i} failed: ${result.error.type}`);
      // Implement retry or fallback logic here
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

if (wasConnected) {
  await client8.disconnect();
}

console.log(`Total errors encountered: ${errors.length}`);

console.log('\n=== All TCP Transport Examples Complete ===\n');

// Note: To run these examples, you need a TCP server. Here's a simple example server:
//
// const net = require('net');
//
// const server = net.createServer((socket) => {
//   console.log('Client connected');
//
//   socket.on('data', (data) => {
//     try {
//       const message = JSON.parse(data.toString());
//       console.log('Received:', message);
//
//       // Echo back
//       socket.write(JSON.stringify({
//         type: 'response',
//         correlationId: message.correlationId,
//         result: 'ok'
//       }) + '\n');
//     } catch (err) {
//       console.error('Parse error:', err);
//     }
//   });
//
//   socket.on('end', () => {
//     console.log('Client disconnected');
//   });
// });
//
// server.listen(9000, () => {
//   console.log('TCP server listening on port 9000');
// });
