/**
 * Binary protocol communication example
 *
 * This example demonstrates:
 * - Sending binary data with Buffer
 * - Writing structured binary messages
 * - Reading and parsing binary responses
 */

import { createTCPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTCPAdapter();

  await adapter.init({ host: 'localhost', port: 9000 });
  await adapter.connect();

  // Create a binary message
  // Format: [magic: 4 bytes][type: 4 bytes][timestamp: 8 bytes]
  const message = Buffer.alloc(16);
  message.writeUInt32BE(0x12345678, 0);  // Magic number
  message.writeUInt32BE(42, 4);          // Message type
  message.writeBigUInt64BE(BigInt(Date.now()), 8); // Timestamp

  console.log('Sending binary message:', message);

  const sendResult = await adapter.send(message);
  if (isOk(sendResult)) {
    console.log(`Sent ${sendResult.value} bytes`);
  }

  // Receive binary response
  const receiveResult = await adapter.receive(16);
  if (isOk(receiveResult)) {
    const buffer = receiveResult.value;
    const magic = buffer.readUInt32BE(0);
    const type = buffer.readUInt32BE(4);
    const timestamp = buffer.readBigUInt64BE(8);

    console.log('Received binary message:');
    console.log('  Magic:', '0x' + magic.toString(16));
    console.log('  Type:', type);
    console.log('  Timestamp:', Number(timestamp));
  }

  await adapter.disconnect();
}

main().catch(console.error);
