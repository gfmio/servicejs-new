/**
 * TCP Chat Server Example
 * Demonstrates broadcasting messages to all connected clients
 */

import { createTCPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createTCPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== TCP Chat Server ===');

  const usernames = new Map<string, string>();

  server.onConnection((connection) => {
    const username = `User${connection.id.split('_')[1]}`;
    usernames.set(connection.id, username);

    console.log(`${username} joined (${connection.remoteAddress}:${connection.remotePort})`);

    // Welcome message
    server.send(connection.id, `Welcome ${username}! Type your message and press Enter.\n`);

    // Notify others
    broadcastMessage(`${username} joined the chat\n`, connection.id);
  });

  server.onData(async (message) => {
    const username = usernames.get(message.connectionId) || 'Unknown';
    const text = message.data.toString().trim();

    if (text) {
      console.log(`${username}: ${text}`);

      // Broadcast to all clients
      await broadcastMessage(`${username}: ${text}\n`);
    }
  });

  server.onClose((connectionId) => {
    const username = usernames.get(connectionId);
    if (username) {
      console.log(`${username} left`);
      usernames.delete(connectionId);

      // Notify others
      broadcastMessage(`${username} left the chat\n`, connectionId);
    }
  });

  server.onError((error, connectionId) => {
    const username = connectionId ? usernames.get(connectionId) || 'Unknown' : 'Server';
    console.error(`Error (${username}):`, error.message);
  });

  async function broadcastMessage(text: string, excludeConnectionId?: string) {
    const connectionsResult = await server.getConnections();
    if (isOk(connectionsResult)) {
      for (const conn of connectionsResult.value) {
        if (conn.id !== excludeConnectionId) {
          await server.send(conn.id, text);
        }
      }
    }
  }

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Chat server listening on localhost:3000');
    console.log('Connect with: nc localhost 3000');
    console.log('Multiple clients can join and chat together!');
  }

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down chat server...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
