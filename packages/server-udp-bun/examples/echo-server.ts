/**
 * Simple UDP echo server example
 *
 * This server receives messages and echoes them back to the sender.
 */

import { createUDPServer } from '../src/index';
import { isOk } from '@servicejs/result';

const server = createUDPServer();

async function main() {
  // Initialize server
  const initResult = await server.init({
    port: 41234,
    hostname: '0.0.0.0',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize server:', initResult.error);
    process.exit(1);
  }

  // Handle incoming messages
  server.onMessage(async (message) => {
    console.log(
      `Received from ${message.remote.address}:${message.remote.port}:`,
      message.data.toString()
    );

    // Echo back to sender
    const sendResult = await server.send(
      message.data,
      message.remote.port,
      message.remote.address
    );

    if (!isOk(sendResult)) {
      console.error('Failed to send response:', sendResult.error);
    }
  });

  // Handle errors
  server.onError((error) => {
    console.error('Server error:', error);
  });

  // Handle listening event
  server.onListening(() => {
    console.log('UDP echo server listening on port 41234');
    console.log('Test with: echo "Hello" | nc -u localhost 41234');
  });

  // Start server
  const startResult = await server.start();

  if (!isOk(startResult)) {
    console.error('Failed to start server:', startResult.error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    await server.destroy();
    process.exit(0);
  });
}

main();
