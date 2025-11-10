/**
 * Multi-user chat server example.
 *
 * Run with: bun run examples/chat-server.ts
 * Test with browser console (open multiple tabs):
 *   const ws = new WebSocket('ws://localhost:3000');
 *   ws.onmessage = (e) => console.log(e.data);
 *   ws.send(JSON.stringify({ type: 'join', username: 'Alice' }));
 *   ws.send(JSON.stringify({ type: 'message', text: 'Hello!' }));
 */

import { createWebSocketServer } from '../src/index';

interface User {
  id: string;
  username: string;
}

const users = new Map<string, User>();

const server = createWebSocketServer();

await server.init({ port: 3000 });

server.onConnection(async (connection) => {
  console.log(`[${connection.id}] New connection from ${connection.remoteAddress}`);

  // Send welcome message
  await server.send(
    connection.id,
    JSON.stringify({
      type: 'welcome',
      message: 'Welcome to the chat! Send {"type":"join","username":"YourName"} to join.',
    })
  );
});

server.onMessage(async (connectionId, data) => {
  try {
    const message = JSON.parse(data.toString());

    switch (message.type) {
      case 'join': {
        const username = message.username || 'Anonymous';
        users.set(connectionId, { id: connectionId, username });

        console.log(`[${connectionId}] User ${username} joined`);

        // Send confirmation
        await server.send(
          connectionId,
          JSON.stringify({
            type: 'joined',
            username,
            users: Array.from(users.values()).map((u) => u.username),
          })
        );

        // Broadcast join to all other users
        await server.broadcast(
          JSON.stringify({
            type: 'userJoined',
            username,
          })
        );
        break;
      }

      case 'message': {
        const user = users.get(connectionId);
        if (!user) {
          await server.send(
            connectionId,
            JSON.stringify({
              type: 'error',
              message: 'You must join first',
            })
          );
          return;
        }

        console.log(`[${connectionId}] ${user.username}: ${message.text}`);

        // Broadcast message to all users
        await server.broadcast(
          JSON.stringify({
            type: 'message',
            username: user.username,
            text: message.text,
            timestamp: new Date().toISOString(),
          })
        );
        break;
      }

      case 'listUsers': {
        await server.send(
          connectionId,
          JSON.stringify({
            type: 'users',
            users: Array.from(users.values()).map((u) => u.username),
          })
        );
        break;
      }

      default:
        await server.send(
          connectionId,
          JSON.stringify({
            type: 'error',
            message: 'Unknown message type',
          })
        );
    }
  } catch (error) {
    await server.send(
      connectionId,
      JSON.stringify({
        type: 'error',
        message: 'Invalid JSON',
      })
    );
  }
});

server.onClose(async (connectionId) => {
  const user = users.get(connectionId);
  if (user) {
    console.log(`[${connectionId}] User ${user.username} left`);
    users.delete(connectionId);

    // Broadcast leave to all users
    await server.broadcast(
      JSON.stringify({
        type: 'userLeft',
        username: user.username,
      })
    );
  }
});

server.onError((error, connectionId) => {
  console.error(`[${connectionId || 'server'}] Error:`, error.message);
});

await server.start();
console.log('WebSocket Chat Server listening on ws://localhost:3000');
console.log('\nProtocol:');
console.log('  Join:    {"type":"join","username":"YourName"}');
console.log('  Message: {"type":"message","text":"Hello!"}');
console.log('  List:    {"type":"listUsers"}');

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await server.stop();
  process.exit(0);
});
