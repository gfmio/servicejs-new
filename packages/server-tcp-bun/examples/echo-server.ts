/**
 * Simple TCP echo server example.
 *
 * Run with: bun run examples/echo-server.ts
 * Test with: telnet localhost 3000
 */

import { createTCPServer } from '../src/index';

const server = createTCPServer();

await server.init({ port: 3000 });

server.onConnection((connection) => {
  console.log(`[${connection.id}] New connection from ${connection.remoteAddress}`);
});

server.onData(async (connectionId, data) => {
  console.log(`[${connectionId}] Received: ${data.toString().trim()}`);

  // Echo the data back
  await server.send(connectionId, data);
});

server.onClose((connectionId) => {
  console.log(`[${connectionId}] Connection closed`);
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('TCP Echo Server listening on port 3000');
console.log('Connect with: telnet localhost 3000');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
