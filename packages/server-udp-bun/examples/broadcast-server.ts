/**
 * UDP broadcast server example
 *
 * This server broadcasts messages to all clients on a local network.
 * Demonstrates periodic broadcasting and client discovery.
 */

import { createUDPServer } from '../src/index';
import { isOk } from '@servicejs/result';

const server = createUDPServer();
const BROADCAST_PORT = 41235;
const BROADCAST_ADDRESS = '255.255.255.255';

// Track discovered clients
const clients = new Set<string>();

async function main() {
  // Initialize server
  const initResult = await server.init({
    port: BROADCAST_PORT,
    hostname: '0.0.0.0',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize server:', initResult.error);
    process.exit(1);
  }

  // Enable broadcast mode
  await server.setBroadcast(true);

  // Handle incoming messages (client discovery)
  server.onMessage(async (message) => {
    const clientKey = `${message.remote.address}:${message.remote.port}`;

    if (!clients.has(clientKey)) {
      clients.add(clientKey);
      console.log(`New client discovered: ${clientKey}`);
    }

    const data = message.data.toString();
    console.log(`Received from ${clientKey}: ${data}`);

    // Respond to client
    if (data === 'ping') {
      await server.send('pong', message.remote.port, message.remote.address);
    }
  });

  // Handle errors
  server.onError((error) => {
    console.error('Server error:', error);
  });

  // Handle listening event
  server.onListening(() => {
    console.log(`UDP broadcast server listening on port ${BROADCAST_PORT}`);
    console.log(`Broadcasting to ${BROADCAST_ADDRESS}`);
  });

  // Start server
  const startResult = await server.start();

  if (!isOk(startResult)) {
    console.error('Failed to start server:', startResult.error);
    process.exit(1);
  }

  // Broadcast periodic messages
  let counter = 0;
  const broadcastInterval = setInterval(async () => {
    const message = `Broadcast ${++counter} at ${new Date().toISOString()}`;
    console.log(`Sending: ${message}`);

    const result = await server.send(message, BROADCAST_PORT, BROADCAST_ADDRESS);

    if (!isOk(result)) {
      console.error('Failed to broadcast:', result.error);
    }
  }, 5000);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down server...');
    clearInterval(broadcastInterval);
    await server.destroy();
    console.log(`Discovered ${clients.size} clients`);
    process.exit(0);
  });
}

main();
