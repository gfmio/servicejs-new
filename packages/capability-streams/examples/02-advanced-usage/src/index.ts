/**
 * Stream pipe demonstration
 */

import {
  createInMemoryReadable,
  createInMemoryWritable,
  createTransformStream,
} from '@servicejs/capability-streams';
import { isOk } from '@servicejs/result';

console.log('Stream Pipe Example\n');

// Create a readable stream with numbers
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const readable = createInMemoryReadable(numbers);

// Create a transform that doubles each number
const doubleTransform = createTransformStream<number, number>((chunk) => chunk * 2);

// Create a writable stream
const writable = createInMemoryWritable<number>();

console.log('Processing pipeline: read → double → write\n');

// Pipe: readable → transform → writable
const pipeResult = await readable.pipe(doubleTransform);
if (isOk(pipeResult)) {
  const transformResult = await pipeResult.value.pipe(writable);
  if (isOk(transformResult)) {
    console.log('✓ Pipeline complete\n');
  }
}

// Get results
const results = writable.getWrittenData();
console.log('Input:', numbers);
console.log('Output:', results);
console.log(`\nProcessed ${results.length} items`);

// Verify transformation
const allDoubled = results.every((val, i) => val === numbers[i] * 2);
console.log(`All values doubled correctly: ${allDoubled ? '✓' : '✗'}`);
