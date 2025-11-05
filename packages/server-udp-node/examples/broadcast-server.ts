/**
 * UDP Broadcast Server Example
 * Demonstrates UDP broadcast functionality for network discovery
 */

import { createUDPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createUDPServer();

  await server.init({
    port: 3000,
    host: '0.0.0.0',
    type: 'udp4',
    reuseAddr: true,
  });

  console.log('=== UDP Broadcast Server ===');

  const clients = new Map<string, { address: string; port: number; lastSeen: Date }>();

  server.onMessage(async (message) => {
    const text = message.data.toString().trim();
    const clientKey = `${message.remote.address}:${message.remote.port}`;

    console.log(`[${clientKey}] ${text}`);

    // Track client
    clients.set(clientKey, {
      address: message.remote.address,
      port: message.remote.port,
      lastSeen: new Date(),
    });

    // Handle commands
    if (text === 'DISCOVER') {
      // Respond to discovery request
      const response = 'SERVER_HERE';
      await server.send(response, message.remote.port, message.remote.address);
      console.log(`  -> Sent discovery response to ${clientKey}`);
    } else if (text === 'PING') {
      // Respond to ping
      await server.send('PONG', message.remote.port, message.remote.address);
      console.log(`  -> Sent PONG to ${clientKey}`);
    } else if (text.startsWith('BROADCAST:')) {
      // Broadcast message to all known clients
      const broadcastMsg = text.substring(10);
      console.log(`  -> Broadcasting: "${broadcastMsg}" to ${clients.size} clients`);

      for (const [key, client] of clients.entries()) {
        if (key !== clientKey) {
          await server.send(
            `[${clientKey}] ${broadcastMsg}`,
            client.port,
            client.address
          );
        }
      }
    } else if (text === 'CLIENTS') {
      // List all known clients
      const clientList = Array.from(clients.keys()).join(', ');
      await server.send(
        `Active clients (${clients.size}): ${clientList}`,
        message.remote.port,
        message.remote.address
      );
    }
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('UDP Broadcast Server listening on 0.0.0.0:3000');

    // Enable broadcast
    const broadcastResult = await server.setBroadcast(true);
    if (isOk(broadcastResult)) {
      console.log('Broadcast enabled');
    }

    console.log('\nCommands:');
    console.log('  DISCOVER      - Get server response');
    console.log('  PING          - Ping the server');
    console.log('  BROADCAST:msg - Broadcast message to all clients');
    console.log('  CLIENTS       - List active clients');
    console.log('\nSend commands with:');
    console.log('  echo "DISCOVER" | nc -u localhost 3000');
  }

  // Clean up stale clients every 30 seconds
  setInterval(() => {
    const now = new Date();
    const staleThreshold = 60000; // 60 seconds

    for (const [key, client] of clients.entries()) {
      if (now.getTime() - client.lastSeen.getTime() > staleThreshold) {
        console.log(`[Cleanup] Removing stale client: ${key}`);
        clients.delete(key);
      }
    }
  }, 30000);

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    console.log(`Total clients seen: ${clients.size}`);
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
