/**
 * No-op logger for silent mode
 */

import { createNoOpConsole, createBufferedConsole } from '@servicejs/capability-console';

console.log('No-Op Console Example\n');

// Create a no-op console that discards all messages
const noop = createNoOpConsole();

console.log('Logging to no-op console (nothing will be captured)...');
noop.log('This message is discarded');
noop.info('This message is also discarded');
noop.warn('Even warnings are discarded');
noop.error('Errors too');
noop.debug('And debug messages');

console.log('✓ All messages successfully discarded\n');

// Contrast with buffered console
const buffered = createBufferedConsole();

console.log('Logging to buffered console...');
buffered.log('This message is captured');
buffered.info('This one too');
buffered.warn('And this warning');

console.log(`✓ Captured ${buffered.getLogs().length} messages\n`);

// Use case: conditional logging
function createLogger(verbose: boolean) {
  return verbose ? createBufferedConsole() : createNoOpConsole();
}

const verboseLogger = createLogger(true);
const silentLogger = createLogger(false);

verboseLogger.log('Verbose mode message');
silentLogger.log('Silent mode message (discarded)');

console.log('Verbose logger:', (verboseLogger as any).getLogs ? 'buffered' : 'no-op');
console.log('Silent logger:', (silentLogger as any).getLogs ? 'buffered' : 'no-op');
