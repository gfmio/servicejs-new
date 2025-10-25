/**
 * Simulate periodic tasks with fake time
 */

import { createFakeTime } from '@servicejs/capability-time';

console.log('Interval Scheduling Example\n');

const time = createFakeTime(0);
const events: string[] = [];

// Schedule an interval
let count = 0;
const intervalId = time.setInterval(() => {
  count++;
  const event = `Interval ${count} at ${time.now()}ms`;
  console.log(event);
  events.push(event);

  // Cancel after 5 executions
  if (count >= 5) {
    time.clearInterval(intervalId);
    console.log('\nInterval cancelled after 5 executions');
  }
}, 100);

console.log('Starting interval (fires every 100ms)...\n');

// Run for 600ms to see 5 executions + cancellation
time.tick(600);

console.log(`\nTotal time elapsed: ${time.now()}ms`);
console.log(`Total events: ${events.length}`);

// Try to run more - should not fire
console.log('\nAdvancing 200ms more (should not fire)...');
time.tick(200);
console.log(`Final time: ${time.now()}ms`);
console.log(`Final event count: ${events.length}`);
