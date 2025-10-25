/**
 * Hash and HMAC operations
 */

import { createDeterministicCrypto } from '@servicejs/capability-crypto';
import { isOk } from '@servicejs/result';

console.log('Hash and HMAC Example\n');

const crypto = createDeterministicCrypto({ seed: 12345 });

// Hash some data
console.log('Hashing data with SHA-256:\n');

const data1 = 'Hello, world!';
const hash1Result = await crypto.hash('sha256', data1, 'hex');
if (isOk(hash1Result)) {
  console.log(`Input: "${data1}"`);
  console.log(`Hash:  ${hash1Result.value}\n`);
}

const data2 = 'Hello, world!'; // Same data
const hash2Result = await crypto.hash('sha256', data2, 'hex');
if (isOk(hash2Result) && isOk(hash1Result)) {
  console.log(`Same input produces same hash: ${hash1Result.value === hash2Result.value ? '✓' : '✗'}\n`);
}

// HMAC with key
console.log('HMAC with secret key:\n');

const secret = 'my-secret-key';
const message = 'Important message';

const hmacResult = await crypto.hmac('sha256', secret, message, 'hex');
if (isOk(hmacResult)) {
  console.log(`Message: "${message}"`);
  console.log(`Secret:  "${secret}"`);
  console.log(`HMAC:    ${hmacResult.value}\n`);
}

// Constant-time comparison
console.log('Constant-time comparison:');

const value1 = 'secret-value-123';
const value2 = 'secret-value-123';
const value3 = 'different-value';

const compare1Result = await crypto.timingSafeEqual(value1, value2);
const compare2Result = await crypto.timingSafeEqual(value1, value3);

if (isOk(compare1Result) && isOk(compare2Result)) {
  console.log(`  "${value1}" == "${value2}": ${compare1Result.value ? '✓' : '✗'}`);
  console.log(`  "${value1}" == "${value3}": ${compare2Result.value ? '✓' : '✗'}`);
}
