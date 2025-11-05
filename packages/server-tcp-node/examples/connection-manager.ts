/**
 * TCP Connection Manager Example
 * Demonstrates managing multiple connections and monitoring server health
 */

import { createTCPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createTCPServer();

  await server.init({
    port: 3000,
    host: 'localhost',
    backlog: 100,
  });

  console.log('=== TCP Connection Manager ===');

  let connectionCount = 0;
  let messageCount = 0;

  server.onConnection((connection) => {
    connectionCount++;
    console.log(`[+] New connection #${connectionCount}`);
    console.log(`    ID: ${connection.id}`);
    console.log(`    Remote: ${connection.remoteAddress}:${connection.remotePort}`);
    console.log(`    Local: ${connection.localAddress}:${connection.localPort}`);

    // Send welcome
    server.send(connection.id, `Connected as ${connection.id}\n`);

    // Show connection stats
    showStats();
  });

  server.onData(async (message) => {
    messageCount++;
    const command = message.data.toString().trim();

    console.log(`[>] Message from ${message.connectionId}: ${command}`);

    // Handle commands
    if (command === 'stats') {
      await sendStats(message.connectionId);
    } else if (command === 'connections') {
      await sendConnections(message.connectionId);
    } else if (command === 'close') {
      await server.closeConnection(message.connectionId);
    } else if (command === 'help') {
      await sendHelp(message.connectionId);
    } else {
      await server.send(message.connectionId, `Echo: ${command}\n`);
    }
  });

  server.onClose((connectionId) => {
    connectionCount--;
    console.log(`[-] Connection closed: ${connectionId}`);
    showStats();
  });

  server.onError((error, connectionId) => {
    console.error(`[!] Error${connectionId ? ` on ${connectionId}` : ''}:`, error.message);
  });

  async function sendStats(connectionId: string) {
    const healthResult = await server.health();
    const health = isOk(healthResult) ? healthResult.value : false;

    const stats = `
=== Server Statistics ===
Status: ${health ? 'Running' : 'Stopped'}
Active Connections: ${connectionCount}
Total Messages: ${messageCount}
=======================
`;
    await server.send(connectionId, stats);
  }

  async function sendConnections(connectionId: string) {
    const connectionsResult = await server.getConnections();

    if (isOk(connectionsResult)) {
      const connections = connectionsResult.value;
      let response = '\n=== Active Connections ===\n';

      for (const conn of connections) {
        response += `- ${conn.id}: ${conn.remoteAddress}:${conn.remotePort}\n`;
      }

      response += `Total: ${connections.length}\n=======================\n`;
      await server.send(connectionId, response);
    }
  }

  async function sendHelp(connectionId: string) {
    const help = `
=== Available Commands ===
stats       - Show server statistics
connections - List all active connections
close       - Close your connection
help        - Show this help message
[anything]  - Echo your message
=======================
`;
    await server.send(connectionId, help);
  }

  function showStats() {
    console.log(`\n[Stats] Active: ${connectionCount} | Messages: ${messageCount}\n`);
  }

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('Server listening on localhost:3000');
    console.log('Connect with: nc localhost 3000');
    console.log('Type "help" to see available commands');
    showStats();
  }

  // Health check every 10 seconds
  setInterval(async () => {
    const healthResult = await server.health();
    const health = isOk(healthResult) ? healthResult.value : false;
    console.log(`[Health Check] ${health ? '✓ Healthy' : '✗ Unhealthy'}`);
  }, 10000);

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    console.log(`Final stats - Connections: ${connectionCount}, Messages: ${messageCount}`);
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
