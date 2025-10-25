/**
 * Deterministic UUIDs for testing
 */

import { createDeterministicCrypto } from '@servicejs/capability-crypto';
import { isOk } from '@servicejs/result';

console.log('Deterministic Crypto Example\n');

// Create deterministic crypto with a seed
const crypto1 = createDeterministicCrypto({ seed: 12345 });
const crypto2 = createDeterministicCrypto({ seed: 12345 });

console.log('Generating UUIDs with same seed:\n');

// Generate UUIDs from both instances
const uuid1Result = crypto1.randomUUID();
const uuid2Result = crypto2.randomUUID();

if (isOk(uuid1Result) && isOk(uuid2Result)) {
  console.log(`Crypto 1: ${uuid1Result.value}`);
  console.log(`Crypto 2: ${uuid2Result.value}`);
  console.log(`\nUUIDs match: ${uuid1Result.value === uuid2Result.value ? '✓' : '✗'}`);
}

// Generate random bytes
console.log('\nGenerating random bytes:');
const bytesResult = crypto1.randomBytes(16);
if (isOk(bytesResult)) {
  const bytes = bytesResult.value;
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
  console.log(`Bytes (hex): ${hex}`);
}

// Random integers
console.log('\nGenerating random integers (1-100):');
for (let i = 0; i < 5; i++) {
  const intResult = crypto1.randomInt(1, 100);
  if (isOk(intResult)) {
    console.log(`  Random ${i + 1}: ${intResult.value}`);
  }
}

// Create another instance with different seed
const crypto3 = createDeterministicCrypto({ seed: 67890 });
const uuid3Result = crypto3.randomUUID();
if (isOk(uuid3Result) && isOk(uuid1Result)) {
  console.log(`\nDifferent seed UUID: ${uuid3Result.value}`);
  console.log(`Different from first: ${uuid3Result.value !== uuid1Result.value ? '✓' : '✗'}`);
}
