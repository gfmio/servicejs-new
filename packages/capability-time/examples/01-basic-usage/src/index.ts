/**
 * Fake timer for controlled time simulation in tests
 */

import { createFakeTime } from '@servicejs/capability-time';

console.log('Fake Timer Example\n');

// Create a fake time capability starting at a specific time
const startTime = Date.UTC(2024, 0, 1, 0, 0, 0); // 2024-01-01 00:00:00 UTC
const time = createFakeTime(startTime);

console.log(`Start time: ${new Date(time.now()).toISOString()}`);

// Schedule some timers
console.log('\nScheduling timers...\n');

time.setTimeout(() => {
  console.log(`[Timer 1] Fired at ${new Date(time.now()).toISOString()}`);
}, 1000);

time.setTimeout(() => {
  console.log(`[Timer 2] Fired at ${new Date(time.now()).toISOString()}`);
}, 2000);

time.setTimeout(() => {
  console.log(`[Timer 3] Fired at ${new Date(time.now()).toISOString()}`);
}, 3000);

// Advance time manually
console.log('Advancing time by 1.5 seconds...');
time.tick(1500);

console.log(`Current time: ${new Date(time.now()).toISOString()}\n`);

console.log('Advancing time by 2 seconds...');
time.tick(2000);

console.log(`\nFinal time: ${new Date(time.now()).toISOString()}`);
