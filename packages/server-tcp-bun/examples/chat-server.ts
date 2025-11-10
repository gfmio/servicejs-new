/**
 * Multi-user chat server example.
 *
 * Run with: bun run examples/chat-server.ts
 * Test with multiple terminals: telnet localhost 3000
 */

import { createTCPServer } from '../src/index';

const server = createTCPServer();
const usernames = new Map<string, string>();

await server.init({ port: 3000 });

server.onConnection(async (connection) => {
  console.log(`[${connection.id}] New connection from ${connection.remoteAddress}`);

  // Send welcome message
  await server.send(
    connection.id,
    'Welcome to the chat! Please enter your username:\n'
  );
});

server.onData(async (connectionId, data) => {
  const message = data.toString().trim();

  // First message is username
  if (!usernames.has(connectionId)) {
    usernames.set(connectionId, message);
    console.log(`[${connectionId}] User ${message} joined`);

    await server.send(connectionId, `Welcome, ${message}!\n`);

    // Broadcast join message
    const joinMsg = `*** ${message} has joined the chat ***\n`;
    for (const [id] of usernames.entries()) {
      if (id !== connectionId) {
        await server.send(id, joinMsg);
      }
    }
    return;
  }

  // Broadcast message to all other users
  const username = usernames.get(connectionId);
  const broadcastMsg = `${username}: ${message}\n`;

  console.log(`[${connectionId}] ${broadcastMsg.trim()}`);

  for (const [id] of usernames.entries()) {
    if (id !== connectionId) {
      await server.send(id, broadcastMsg);
    }
  }
});

server.onClose(async (connectionId) => {
  const username = usernames.get(connectionId);
  if (username) {
    console.log(`[${connectionId}] User ${username} left`);

    // Broadcast leave message
    const leaveMsg = `*** ${username} has left the chat ***\n`;
    for (const [id] of usernames.entries()) {
      if (id !== connectionId) {
        await server.send(id, leaveMsg);
      }
    }

    usernames.delete(connectionId);
  }
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('TCP Chat Server listening on port 3000');
console.log('Connect with: telnet localhost 3000');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
