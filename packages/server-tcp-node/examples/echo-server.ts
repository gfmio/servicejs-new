/**
 * TCP Echo Server Example
 */

import { createTCPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createTCPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== TCP Echo Server ===');

  server.onConnection((connection) => {
    console.log('New connection:', connection.id);
    console.log('  Remote:', `${connection.remoteAddress}:${connection.remotePort}`);
  });

  server.onData(async (message) => {
    console.log(`Received from ${message.connectionId}:`, message.data.toString());

    // Echo back
    const result = await server.send(message.connectionId, message.data);
    if (isOk(result)) {
      console.log('Echoed back');
    }
  });

  server.onClose((connectionId) => {
    console.log('Connection closed:', connectionId);
  });

  server.onError((error, connectionId) => {
    console.error('Error:', error.message, connectionId ? `on ${connectionId}` : '');
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Server listening on localhost:3000');
    console.log('Connect with: nc localhost 3000');
  }

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
