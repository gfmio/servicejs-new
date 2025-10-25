/**
 * Basic environment variable reading with in-memory implementation
 */

import { createInMemoryEnv } from '@servicejs/capability-env';

// Create an in-memory environment capability with some variables
const env = createInMemoryEnv(
  {
    NODE_ENV: 'development',
    API_KEY: 'test-key-12345',
    PORT: '3000',
    DEBUG: 'true',
  },
  'node',
  '20.0.0'
);

console.log('Environment Variables Example\n');

// Get individual variables
const nodeEnv = env.get('NODE_ENV');
if (nodeEnv.some) {
  console.log(`NODE_ENV: ${nodeEnv.value}`);
}

const apiKey = env.get('API_KEY');
if (apiKey.some) {
  console.log(`API_KEY: ${apiKey.value}`);
}

// Get a missing variable
const missing = env.get('MISSING_VAR');
if (!missing.some) {
  console.log('MISSING_VAR: (not set)');
}

// Get all variables
console.log('\nAll variables:');
const all = env.getAll();
for (const [key, value] of Object.entries(all)) {
  console.log(`  ${key}: ${value}`);
}

// Platform info
console.log(`\nPlatform: ${env.platform}`);
console.log(`Version: ${env.version}`);
