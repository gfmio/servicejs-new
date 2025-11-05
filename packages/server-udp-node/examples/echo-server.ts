/**
 * UDP Echo Server Example
 * Demonstrates basic UDP datagram echo functionality
 */

import { createUDPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createUDPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
    type: 'udp4',
  });

  console.log('=== UDP Echo Server ===');

  server.onMessage(async (message) => {
    const text = message.data.toString();
    console.log(`Received from ${message.remote.address}:${message.remote.port}:`, text);

    // Echo back to sender
    const result = await server.send(
      message.data,
      message.remote.port,
      message.remote.address
    );

    if (isOk(result)) {
      console.log('Echoed back');
    } else {
      console.error('Failed to echo:', result.error.message);
    }
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  server.onListening(() => {
    console.log('Server is listening');
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('UDP Echo Server listening on localhost:3000');
    console.log('Send datagrams with:');
    console.log('  echo "Hello" | nc -u localhost 3000');
    console.log('  (Press Ctrl+D after typing your message)');
  } else {
    console.error('Failed to start server:', startResult.error.message);
  }

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
