/**
 * UDP batch sending example
 *
 * This example demonstrates efficient batch sending of multiple messages
 * using the sendMany API for high-throughput scenarios.
 */

import { createUDPServer } from '../src/index';
import { isOk } from '@servicejs/result';

const server = createUDPServer();

// Simulate multiple client endpoints
const CLIENTS = [
  { port: 41240, address: '127.0.0.1' },
  { port: 41241, address: '127.0.0.1' },
  { port: 41242, address: '127.0.0.1' },
];

async function main() {
  // Initialize server
  const initResult = await server.init({
    port: 41239,
    hostname: '0.0.0.0',
  });

  if (!isOk(initResult)) {
    console.error('Failed to initialize server:', initResult.error);
    process.exit(1);
  }

  // Handle errors
  server.onError((error) => {
    console.error('Server error:', error);
  });

  // Handle listening event
  server.onListening(() => {
    console.log('UDP batch sender ready on port 41239');
  });

  // Start server
  const startResult = await server.start();

  if (!isOk(startResult)) {
    console.error('Failed to start server:', startResult.error);
    process.exit(1);
  }

  console.log('\nSending messages individually...');
  const individualStart = performance.now();

  for (let i = 0; i < 100; i++) {
    for (const client of CLIENTS) {
      await server.send(`Individual message ${i}`, client.port, client.address);
    }
  }

  const individualTime = performance.now() - individualStart;
  console.log(`Individual sends: ${individualTime.toFixed(2)}ms for 300 messages`);

  console.log('\nSending messages in batches...');
  const batchStart = performance.now();

  for (let i = 0; i < 100; i++) {
    const batch = CLIENTS.map((client) => ({
      data: `Batch message ${i}`,
      port: client.port,
      address: client.address,
    }));

    const result = await server.sendMany(batch);

    if (!isOk(result)) {
      console.error('Batch send failed:', result.error);
    } else {
      // result.value is the number of messages successfully sent
      if (result.value !== batch.length) {
        console.warn(`Only sent ${result.value}/${batch.length} messages (backpressure)`);
      }
    }
  }

  const batchTime = performance.now() - batchStart;
  console.log(`Batch sends: ${batchTime.toFixed(2)}ms for 300 messages`);

  const improvement = ((individualTime - batchTime) / individualTime * 100).toFixed(1);
  console.log(`\nPerformance improvement: ${improvement}% faster with batching`);

  // Clean up
  setTimeout(async () => {
    await server.destroy();
    console.log('\nServer shut down');
    process.exit(0);
  }, 1000);
}

main();
