#!/usr/bin/env bun

/**
 * Basic gRPC Service Example
 *
 * This example demonstrates a calculator service with both unary and streaming calls.
 * Run with: bun run examples/basic-service.ts
 */

import { createGRPCServer, createGRPCClient, fromArray } from '../src/index';
import { isOk } from '@servicejs/result';

// Calculator service implementation
const calculatorService = {
  // Unary calls
  Add: async (req: { a: number; b: number }) => {
    console.log(`  [Server] Add(${req.a}, ${req.b})`);
    return { result: req.a + req.b };
  },

  Subtract: async (req: { a: number; b: number }) => {
    console.log(`  [Server] Subtract(${req.a}, ${req.b})`);
    return { result: req.a - req.b };
  },

  Multiply: async (req: { a: number; b: number }) => {
    console.log(`  [Server] Multiply(${req.a}, ${req.b})`);
    return { result: req.a * req.b };
  },

  Divide: async (req: { a: number; b: number }) => {
    console.log(`  [Server] Divide(${req.a}, ${req.b})`);
    if (req.b === 0) {
      throw new Error('Division by zero');
    }
    return { result: req.a / req.b };
  },

  // Server streaming call
  StreamNumbers: async function* (req: { count: number }) {
    console.log(`  [Server] StreamNumbers(${req.count})`);
    for (let i = 1; i <= req.count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
      yield { number: i };
    }
  },

  // Server streaming with array
  StreamFibonacci: async function* (req: { count: number }) {
    console.log(`  [Server] StreamFibonacci(${req.count})`);
    let a = 0, b = 1;
    for (let i = 0; i < req.count; i++) {
      yield { value: a };
      [a, b] = [b, a + b];
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  },

  Ping: () => {
    console.log(`  [Server] Ping()`);
    return { message: 'pong' };
  },
};

async function main() {
  console.log('═'.repeat(60));
  console.log('gRPC Service Example');
  console.log('═'.repeat(60));
  console.log();

  // Create and start server
  console.log('Starting gRPC server on 0.0.0.0:15051...');
  const server = createGRPCServer({
    address: '0.0.0.0:15051',
    service: calculatorService,
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
  console.log('Creating gRPC client...\n');
  const client = createGRPCClient({
    address: 'localhost:15051',
  });

  console.log('═'.repeat(60));
  console.log('Unary Calls');
  console.log('═'.repeat(60));
  console.log();

  // 1. Addition
  console.log('1. Add(10, 5)');
  const addResult = await client.unary('Add', { a: 10, b: 5 });
  if (isOk(addResult)) {
    console.log(`   ✓ Result: ${addResult.value.result}\n`);
  } else {
    console.log(`   ✗ Error: ${addResult.error.message}\n`);
  }

  // 2. Subtraction
  console.log('2. Subtract(20, 8)');
  const subResult = await client.unary('Subtract', { a: 20, b: 8 });
  if (isOk(subResult)) {
    console.log(`   ✓ Result: ${subResult.value.result}\n`);
  } else {
    console.log(`   ✗ Error: ${subResult.error.message}\n`);
  }

  // 3. Multiplication
  console.log('3. Multiply(6, 7)');
  const mulResult = await client.unary('Multiply', { a: 6, b: 7 });
  if (isOk(mulResult)) {
    console.log(`   ✓ Result: ${mulResult.value.result}\n`);
  } else {
    console.log(`   ✗ Error: ${mulResult.error.message}\n`);
  }

  // 4. Division
  console.log('4. Divide(100, 4)');
  const divResult = await client.unary('Divide', { a: 100, b: 4 });
  if (isOk(divResult)) {
    console.log(`   ✓ Result: ${divResult.value.result}\n`);
  } else {
    console.log(`   ✗ Error: ${divResult.error.message}\n`);
  }

  // 5. Division by zero (error case)
  console.log('5. Divide(10, 0) - Error case');
  const errorResult = await client.unary('Divide', { a: 10, b: 0 });
  if (isOk(errorResult)) {
    console.log(`   ✓ Result: ${errorResult.value.result}\n`);
  } else {
    console.log(`   ✗ Error: ${errorResult.error.message} (expected)\n`);
  }

  // 6. Ping
  console.log('6. Ping()');
  const pingResult = await client.unary('Ping', {});
  if (isOk(pingResult)) {
    console.log(`   ✓ Result: ${pingResult.value.message}\n`);
  } else {
    console.log(`   ✗ Error: ${pingResult.error.message}\n`);
  }

  // 7. Concurrent calls
  console.log('7. Making 4 concurrent calls...');
  const concurrentResults = await Promise.all([
    client.unary('Add', { a: 1, b: 2 }),
    client.unary('Subtract', { a: 5, b: 3 }),
    client.unary('Multiply', { a: 4, b: 5 }),
    client.unary('Divide', { a: 10, b: 2 }),
  ]);

  if (concurrentResults.every(isOk)) {
    console.log('   ✓ All concurrent calls succeeded:');
    console.log(`     Add(1, 2) = ${concurrentResults[0].value.result}`);
    console.log(`     Subtract(5, 3) = ${concurrentResults[1].value.result}`);
    console.log(`     Multiply(4, 5) = ${concurrentResults[2].value.result}`);
    console.log(`     Divide(10, 2) = ${concurrentResults[3].value.result}\n`);
  }

  console.log('═'.repeat(60));
  console.log('Server Streaming');
  console.log('═'.repeat(60));
  console.log();

  // 8. Stream numbers
  console.log('8. StreamNumbers(5) - Streaming response');
  const numbers: number[] = [];
  for await (const result of client.serverStream('StreamNumbers', { count: 5 })) {
    if (isOk(result)) {
      numbers.push(result.value.number);
      console.log(`   ← Received: ${result.value.number}`);
    } else {
      console.log(`   ✗ Error: ${result.error.message}`);
    }
  }
  console.log(`   ✓ Collected: [${numbers.join(', ')}]\n`);

  // 9. Stream Fibonacci
  console.log('9. StreamFibonacci(8) - Streaming Fibonacci sequence');
  const fibonacci: number[] = [];
  for await (const result of client.serverStream('StreamFibonacci', { count: 8 })) {
    if (isOk(result)) {
      fibonacci.push(result.value.value);
      console.log(`   ← Received: ${result.value.value}`);
    } else {
      console.log(`   ✗ Error: ${result.error.message}`);
    }
  }
  console.log(`   ✓ Collected: [${fibonacci.join(', ')}]\n`);

  // 10. Empty stream
  console.log('10. StreamNumbers(0) - Empty stream');
  const empty: number[] = [];
  for await (const result of client.serverStream('StreamNumbers', { count: 0 })) {
    if (isOk(result)) {
      empty.push(result.value.number);
    }
  }
  console.log(`   ✓ Collected: [] (empty as expected)\n`);

  // Close client and server
  console.log('═'.repeat(60));
  console.log('Cleanup');
  console.log('═'.repeat(60));
  console.log();

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
