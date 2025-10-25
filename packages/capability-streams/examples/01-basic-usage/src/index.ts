/**
 * In-memory stream operations
 */

import { createInMemoryReadable, createInMemoryWritable } from '@servicejs/capability-streams';
import { isOk } from '@servicejs/result';

console.log('In-Memory Streams Example\n');

// Create a readable stream with some data
const data = ['Hello', ' ', 'from', ' ', 'streams!'];
const readable = createInMemoryReadable(data);

console.log('Reading from stream...');
const chunks: string[] = [];

const readResult = await readable.read();
if (isOk(readResult)) {
  for (const chunk of readResult.value) {
    chunks.push(chunk);
    console.log(`  Chunk: "${chunk}"`);
  }
}

console.log(`\nReassembled: "${chunks.join('')}"`);

// Create a writable stream
console.log('\nWriting to writable stream...');
const writable = createInMemoryWritable<string>();

const writes = ['Writing', ' ', 'data', ' ', 'to', ' ', 'stream'];
for (const chunk of writes) {
  const writeResult = await writable.write(chunk);
  if (isOk(writeResult)) {
    console.log(`  Wrote: "${chunk}"`);
  }
}

await writable.end();

// Get all written data
const written = writable.getWrittenData();
console.log(`\nTotal chunks written: ${written.length}`);
console.log(`Combined: "${written.join('')}"`);
