/**
 * Simple WebSocket echo server example.
 *
 * Run with: bun run examples/echo-server.ts
 * Test with browser console:
 *   const ws = new WebSocket('ws://localhost:3000');
 *   ws.onmessage = (e) => console.log(e.data);
 *   ws.send('Hello!');
 */

import { createWebSocketServer } from '../src/index';

const server = createWebSocketServer();

await server.init({ port: 3000 });

server.onConnection((connection) => {
  console.log(`[${connection.id}] New connection from ${connection.remoteAddress}`);
});

server.onMessage(async (connectionId, data, isBinary) => {
  console.log(`[${connectionId}] Received: ${isBinary ? '[binary]' : data.toString()}`);

  // Echo the message back
  await server.send(connectionId, data, isBinary);
});

server.onClose((connectionId, code, reason) => {
  console.log(`[${connectionId}] Connection closed: ${code} ${reason}`);
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('WebSocket Echo Server listening on ws://localhost:3000');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
