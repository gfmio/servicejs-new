/**
 * Connection management example with limits and timeouts.
 *
 * Run with: bun run examples/connection-manager.ts
 */

import { createTCPServer } from '../src/index';

const MAX_CONNECTIONS = 5;
const CONNECTION_TIMEOUT = 30000; // 30 seconds

const server = createTCPServer();
const connectionTimers = new Map<string, NodeJS.Timeout>();

await server.init({
  port: 3000,
  maxConnections: MAX_CONNECTIONS,
  timeout: CONNECTION_TIMEOUT,
});

server.onConnection(async (connection) => {
  // Check connection limit
  const connections = await server.getConnections();
  if (connections.ok && connections.value.length > MAX_CONNECTIONS) {
    await server.send(
      connection.id,
      'Server is full. Please try again later.\n'
    );
    await server.closeConnection(connection.id);
    return;
  }

  console.log(
    `[${connection.id}] New connection from ${connection.remoteAddress} (${connections.value?.length}/${MAX_CONNECTIONS})`
  );

  await server.send(connection.id, `Welcome! Connection ID: ${connection.id}\n`);
  await server.send(connection.id, `Timeout: ${CONNECTION_TIMEOUT / 1000}s\n`);

  // Set up connection timeout
  const timer = setTimeout(async () => {
    console.log(`[${connection.id}] Connection timeout`);
    await server.send(connection.id, 'Connection timeout. Goodbye!\n');
    await server.closeConnection(connection.id);
  }, CONNECTION_TIMEOUT);

  connectionTimers.set(connection.id, timer);
});

server.onData(async (connectionId, data) => {
  const message = data.toString().trim();
  console.log(`[${connectionId}] Received: ${message}`);

  // Reset timeout on activity
  const existingTimer = connectionTimers.get(connectionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    console.log(`[${connectionId}] Connection timeout`);
    await server.send(connectionId, 'Connection timeout. Goodbye!\n');
    await server.closeConnection(connectionId);
  }, CONNECTION_TIMEOUT);

  connectionTimers.set(connectionId, timer);

  // Echo back with connection info
  const connections = await server.getConnections();
  await server.send(
    connectionId,
    `Echo: ${message}\nActive connections: ${connections.value?.length}/${MAX_CONNECTIONS}\n`
  );
});

server.onClose((connectionId) => {
  const timer = connectionTimers.get(connectionId);
  if (timer) {
    clearTimeout(timer);
    connectionTimers.delete(connectionId);
  }

  console.log(`[${connectionId}] Connection closed`);
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('TCP Connection Manager listening on port 3000');
console.log(`Max connections: ${MAX_CONNECTIONS}`);
console.log(`Connection timeout: ${CONNECTION_TIMEOUT / 1000}s`);
console.log('Connect with: telnet localhost 3000');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');

  // Clear all timers
  for (const timer of connectionTimers.values()) {
    clearTimeout(timer);
  }

  await server.stop();
  process.exit(0);
});
