/**
 * UDP Multicast Server Example
 * Demonstrates UDP multicast group communication
 */

import { createUDPServer } from '../src/index.js';
import { isOk } from '@servicejs/result';

const MULTICAST_ADDRESS = '239.255.255.250';
const MULTICAST_PORT = 3000;

async function main() {
  const server = createUDPServer();

  await server.init({
    port: MULTICAST_PORT,
    host: '0.0.0.0',
    type: 'udp4',
    reuseAddr: true,
  });

  console.log('=== UDP Multicast Server ===');

  let messageCount = 0;
  const senders = new Set<string>();

  server.onMessage(async (message) => {
    messageCount++;
    const text = message.data.toString().trim();
    const senderKey = `${message.remote.address}:${message.remote.port}`;

    if (!senders.has(senderKey)) {
      senders.add(senderKey);
      console.log(`[New Sender] ${senderKey}`);
    }

    console.log(`[${messageCount}] ${senderKey}: ${text}`);

    // Handle commands
    if (text === 'STATS') {
      const stats = `Messages: ${messageCount}, Senders: ${senders.size}`;
      await server.send(stats, message.remote.port, message.remote.address);
      console.log(`  -> Sent stats to ${senderKey}`);
    } else if (text.startsWith('MULTICAST:')) {
      // Send to multicast group
      const multicastMsg = text.substring(10);
      console.log(`  -> Multicasting: "${multicastMsg}"`);

      const result = await server.send(
        `[Server] ${multicastMsg}`,
        MULTICAST_PORT,
        MULTICAST_ADDRESS
      );

      if (isOk(result)) {
        console.log('  -> Multicast sent successfully');
      } else {
        console.error('  -> Multicast failed:', result.error.message);
      }
    } else if (text === 'PING') {
      // Reply directly to sender
      await server.send('PONG', message.remote.port, message.remote.address);
    }
  });

  server.onError((error) => {
    console.error('Server error:', error.message);
  });

  server.onListening(() => {
    console.log(`Server listening on 0.0.0.0:${MULTICAST_PORT}`);
  });

  const startResult = await server.start();
  if (isOk(startResult)) {
    console.log(`UDP Multicast Server started`);

    // Join multicast group
    const joinResult = await server.addMembership(MULTICAST_ADDRESS);
    if (isOk(joinResult)) {
      console.log(`Joined multicast group ${MULTICAST_ADDRESS}`);
    } else {
      console.error('Failed to join multicast group:', joinResult.error.message);
    }

    // Set multicast TTL
    const ttlResult = await server.setMulticastTTL(128);
    if (isOk(ttlResult)) {
      console.log('Multicast TTL set to 128');
    }

    console.log('\nCommands:');
    console.log('  PING              - Ping the server (unicast reply)');
    console.log('  STATS             - Get server statistics (unicast reply)');
    console.log('  MULTICAST:msg     - Send message to multicast group');
    console.log('\nSend to multicast group with:');
    console.log(`  echo "PING" | nc -u ${MULTICAST_ADDRESS} ${MULTICAST_PORT}`);
  }

  // Send periodic multicast announcements
  let announceCount = 0;
  const announceInterval = setInterval(async () => {
    announceCount++;
    const announcement = `[Announcement ${announceCount}] Server is alive - Messages: ${messageCount}, Senders: ${senders.size}`;

    const result = await server.send(announcement, MULTICAST_PORT, MULTICAST_ADDRESS);

    if (isOk(result)) {
      console.log(`\n[Announcement] ${announcement}`);
    }
  }, 30000); // Every 30 seconds

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nShutting down...');
    console.log(`Final stats - Messages: ${messageCount}, Unique Senders: ${senders.size}`);

    clearInterval(announceInterval);

    // Leave multicast group
    const leaveResult = await server.dropMembership(MULTICAST_ADDRESS);
    if (isOk(leaveResult)) {
      console.log(`Left multicast group ${MULTICAST_ADDRESS}`);
    }

    await server.stop();
    process.exit(0);
  });
}

main().catch(console.error);
