/**
 * WebSocket Chat Server Example
 * Multi-user chat with broadcasting and user management
 */

import { createWebSocketServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

interface User {
  id: string;
  name: string;
  joinedAt: Date;
}

async function main() {
  const server = createWebSocketServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== WebSocket Chat Server ===');

  const users = new Map<string, User>();

  server.onConnection(async (connection) => {
    console.log(`[+] New connection: ${connection.id}`);

    // Send welcome message
    await server.send(
      connection.id,
      JSON.stringify({
        type: 'welcome',
        message: 'Welcome to the chat! Send {"type":"join","name":"YourName"} to join.',
      })
    );
  });

  server.onMessage(async (message) => {
    try {
      const data = JSON.parse(message.data.toString());

      switch (data.type) {
        case 'join': {
          // User joining
          const user: User = {
            id: message.connectionId,
            name: data.name || `User${message.connectionId.split('_')[1]}`,
            joinedAt: new Date(),
          };
          users.set(message.connectionId, user);

          console.log(`[*] ${user.name} joined`);

          // Notify user
          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'joined',
              name: user.name,
              users: Array.from(users.values()).map(u => ({
                name: u.name,
                joinedAt: u.joinedAt,
              })),
            })
          );

          // Broadcast to others
          await broadcastExcept(
            message.connectionId,
            JSON.stringify({
              type: 'user-joined',
              name: user.name,
            })
          );
          break;
        }

        case 'message': {
          // Chat message
          const user = users.get(message.connectionId);
          if (!user) {
            await server.send(
              message.connectionId,
              JSON.stringify({
                type: 'error',
                message: 'Please join first',
              })
            );
            return;
          }

          console.log(`[${user.name}] ${data.message}`);

          // Broadcast message to all
          await server.broadcast(
            JSON.stringify({
              type: 'message',
              from: user.name,
              message: data.message,
              timestamp: new Date().toISOString(),
            })
          );
          break;
        }

        case 'list': {
          // List all users
          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'users',
              users: Array.from(users.values()).map(u => ({
                name: u.name,
                joinedAt: u.joinedAt,
              })),
            })
          );
          break;
        }

        default:
          await server.send(
            message.connectionId,
            JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            })
          );
      }
    } catch (error) {
      await server.send(
        message.connectionId,
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
      console.log(`[-] ${user.name} left`);
      users.delete(connectionId);

      // Notify others
      await server.broadcast(
        JSON.stringify({
          type: 'user-left',
          name: user.name,
        })
      );
    }
  });

  server.onError((error, connectionId) => {
    console.error(`[!] Error${connectionId ? ` on ${connectionId}` : ''}:`, error.message);
  });

  async function broadcastExcept(excludeId: string, data: string) {
    const connectionsResult = await server.getConnections();
    if (isOk(connectionsResult)) {
      for (const conn of connectionsResult.value) {
        if (conn.id !== excludeId) {
          await server.send(conn.id, data);
        }
      }
    }
  }

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('WebSocket Chat Server listening on ws://localhost:3000');
    console.log('\nProtocol:');
    console.log('  Join:    {"type":"join","name":"Alice"}');
    console.log('  Message: {"type":"message","message":"Hello everyone!"}');
    console.log('  List:    {"type":"list"}');
    console.log('\nConnect with:');
    console.log('  wscat -c ws://localhost:3000');
  }

  // Show stats every 10 seconds
  setInterval(async () => {
    console.log(`\n[Stats] Active users: ${users.size}`);
    if (users.size > 0) {
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.id})`);
      });
    }
  }, 10000);

  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    console.log(`Total users served: ${users.size}`);
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
