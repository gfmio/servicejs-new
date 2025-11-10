/**
 * WebSocket Echo Server Example
 * Echoes back all received messages
 */

import { createWebSocketServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const server = createWebSocketServer();

  await server.init({
    port: 3000,
    host: 'localhost',
  });

  console.log('=== WebSocket Echo Server ===');

  server.onConnection((connection) => {
    console.log(`[+] Client connected: ${connection.id}`);
    console.log(`    Remote: ${connection.remoteAddress}`);
  });

  server.onMessage(async (message) => {
    console.log(`[>] Received from ${message.connectionId}:`, message.data.toString());

    // Echo back the message
    const result = await server.send(message.connectionId, message.data, message.isBinary);
    if (isOk(result)) {
      console.log(`[<] Echoed back to ${message.connectionId}`);
    } else {
      console.error(`[!] Failed to echo:`, result.error.message);
    }
  });

  server.onClose((connectionId, code, reason) => {
    console.log(`[-] Client disconnected: ${connectionId}`);
    console.log(`    Code: ${code}, Reason: ${reason || 'None'}`);
  });

  server.onError((error, connectionId) => {
    console.error(`[!] Error${connectionId ? ` on ${connectionId}` : ''}:`, error.message);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log('WebSocket Echo Server listening on ws://localhost:3000');
    console.log('\nConnect with:');
    console.log('  wscat -c ws://localhost:3000');
    console.log('  or use the browser console:');
    console.log('  const ws = new WebSocket("ws://localhost:3000");');
    console.log('  ws.onmessage = e => console.log(e.data);');
    console.log('  ws.send("Hello!");');
  }

  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
