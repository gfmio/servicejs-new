#!/usr/bin/env bun

/**
 * Basic Cap'n Proto RPC Example
 *
 * This example demonstrates a calculator service with promise pipelining support.
 * Run with: bun run examples/basic-rpc.ts
 */

import { createCapnpServer, createCapnpClient } from '../src/index';
import { isOk } from '@servicejs/result';

// Calculator service implementation
const calculatorService = {
  add: async (a: number, b: number) => {
    console.log(`  [Server] add(${a}, ${b})`);
    return a + b;
  },

  subtract: async (a: number, b: number) => {
    console.log(`  [Server] subtract(${a}, ${b})`);
    return a - b;
  },

  multiply: async (a: number, b: number) => {
    console.log(`  [Server] multiply(${a}, ${b})`);
    return a * b;
  },

  divide: async (a: number, b: number) => {
    console.log(`  [Server] divide(${a}, ${b})`);
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  },

  ping: () => {
    console.log(`  [Server] ping()`);
    return 'pong';
  },
};

async function main() {
  console.log('═'.repeat(60));
  console.log('Cap\'n Proto RPC Calculator Example');
  console.log('═'.repeat(60));
  console.log();

  // Create and start server
  console.log('Starting Cap\'n Proto server on port 25000...');
  const server = createCapnpServer({
    port: 25000,
    service: calculatorService,
    schema: {}, // In production, this would be the compiled .capnp schema
    logging: false, // Set to true to see detailed logs
  });

  const serverResult = await server.listen();
  if (!isOk(serverResult)) {
    console.error('Failed to start server:', serverResult.error);
    process.exit(1);
  }

  console.log('✓ Server started\n');

  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Create client
  console.log('Creating Cap\'n Proto client...\n');
  const client = createCapnpClient({
    host: 'localhost',
    port: 25000,
    schema: {}, // In production, this would be the compiled .capnp schema
  });

  console.log('Making RPC calls:\n');

  // 1. Addition
  console.log('1. add(10, 5)');
  const addResult = await client.call('add', 10, 5);
  if (isOk(addResult)) {
    console.log(`   ✓ Result: ${addResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${addResult.error.message}\n`);
  }

  // 2. Subtraction
  console.log('2. subtract(20, 8)');
  const subResult = await client.call('subtract', 20, 8);
  if (isOk(subResult)) {
    console.log(`   ✓ Result: ${subResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${subResult.error.message}\n`);
  }

  // 3. Multiplication
  console.log('3. multiply(6, 7)');
  const mulResult = await client.call('multiply', 6, 7);
  if (isOk(mulResult)) {
    console.log(`   ✓ Result: ${mulResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${mulResult.error.message}\n`);
  }

  // 4. Division
  console.log('4. divide(100, 4)');
  const divResult = await client.call('divide', 100, 4);
  if (isOk(divResult)) {
    console.log(`   ✓ Result: ${divResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${divResult.error.message}\n`);
  }

  // 5. Division by zero (error case)
  console.log('5. divide(10, 0) - Error case');
  const errorResult = await client.call('divide', 10, 0);
  if (isOk(errorResult)) {
    console.log(`   ✓ Result: ${errorResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${errorResult.error.message} (expected)\n`);
  }

  // 6. Ping
  console.log('6. ping()');
  const pingResult = await client.call('ping');
  if (isOk(pingResult)) {
    console.log(`   ✓ Result: ${pingResult.value}\n`);
  } else {
    console.log(`   ✗ Error: ${pingResult.error.message}\n`);
  }

  // 7. Concurrent calls
  console.log('7. Making 4 concurrent calls...');
  const concurrentResults = await Promise.all([
    client.call('add', 1, 2),
    client.call('subtract', 5, 3),
    client.call('multiply', 4, 5),
    client.call('divide', 10, 2),
  ]);

  if (concurrentResults.every(isOk)) {
    console.log('   ✓ All concurrent calls succeeded:');
    console.log(`     add(1, 2) = ${concurrentResults[0].value}`);
    console.log(`     subtract(5, 3) = ${concurrentResults[1].value}`);
    console.log(`     multiply(4, 5) = ${concurrentResults[2].value}`);
    console.log(`     divide(10, 2) = ${concurrentResults[3].value}\n`);
  }

  // 8. Promise pipelining (simplified demonstration)
  console.log('8. Promise pipelining - chain calls');
  const pipelinedResult = client.pipeline('add', 5, 3);
  const finalResult = await pipelinedResult.pipeline('multiply', 2);
  
  if (isOk(finalResult)) {
    console.log(`   ✓ Pipelined result: ${finalResult.value}`);
    console.log(`   (Note: Simplified pipelining in this implementation)\n`);
  } else {
    console.log(`   ✗ Error: ${finalResult.error.message}\n`);
  }

  // Close client and server
  console.log('Closing connection...');
  await client.close();
  console.log('✓ Client closed\n');

  console.log('Stopping server...');
  await server.close();
  console.log('✓ Server stopped\n');

  console.log('═'.repeat(60));
  console.log('Example completed successfully!');
  console.log('═'.repeat(60));
}

// Run if executed directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}
