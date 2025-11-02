/**
 * Basic TCP client example
 *
 * This example demonstrates:
 * - Initializing the TCP adapter
 * - Connecting to a server
 * - Sending and receiving data
 * - Proper cleanup
 */

import { createTCPAdapter } from '../src/index.js';
import { isOk } from '@servicejs/result';

async function main() {
  const adapter = createTCPAdapter();

  // Initialize with configuration
  const initResult = await adapter.init({
    host: 'localhost',
    port: 8080,
    timeout: 30000,
    keepAlive: true,
    noDelay: true
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize:', initResult.error);
    return;
  }

  // Connect to server
  const connectResult = await adapter.connect();
  if (!isOk(connectResult)) {
    console.error('Failed to connect:', connectResult.error);
    return;
  }

  console.log('Connected:', connectResult.value);

  // Send string data
  const sendResult = await adapter.send('Hello, server!');
  if (isOk(sendResult)) {
    console.log(`Sent ${sendResult.value} bytes`);
  }

  // Receive response
  const receiveResult = await adapter.receive(1024);
  if (isOk(receiveResult)) {
    console.log('Received:', receiveResult.value.toString());
  }

  // Check connection status
  console.log('Connected:', adapter.isConnected());

  // Disconnect
  await adapter.disconnect();
  console.log('Disconnected');
}

main().catch(console.error);
