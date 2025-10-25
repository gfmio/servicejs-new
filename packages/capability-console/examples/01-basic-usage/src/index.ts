/**
 * Buffered logging for testing
 */

import { createBufferedConsole } from '@servicejs/capability-console';

console.log('Buffered Console Example\n');

// Create a buffered console that captures all log messages
const buffered = createBufferedConsole();

// Log various messages
buffered.log('This is a regular log message');
buffered.info('This is an info message');
buffered.warn('This is a warning message');
buffered.error('This is an error message');
buffered.debug('This is a debug message');

// Get all captured logs
const logs = buffered.getLogs();

console.log(`Captured ${logs.length} log entries:\n`);

for (const entry of logs) {
  const time = new Date(entry.timestamp).toISOString();
  console.log(`[${entry.level.toUpperCase()}] ${time}`);
  console.log(`  Message: ${entry.message}`);
  if (entry.args.length > 0) {
    console.log(`  Args: ${JSON.stringify(entry.args)}`);
  }
  console.log();
}

// Clear the buffer
buffered.clear();

console.log('Buffer cleared');
console.log(`Log entries after clear: ${buffered.getLogs().length}`);
