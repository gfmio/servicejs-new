/**
 * Debug Cap'n Proto Packed Encoding Issues
 */

import { createCapnpSchema, createCapnpSerializer } from '../src/index.js';

// Simple test message
interface SimpleMessage {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

const schema = createCapnpSchema({
  name: 'SimpleMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'name', type: 'text', slot: 0 },
    { name: 'active', type: 'bool', slot: 4 },
    { name: 'score', type: 'float64', slot: 8 },
  ],
});

const testMessage: SimpleMessage = {
  id: 42,
  name: 'Test User',
  active: true,
  score: 99.5,
};

console.log('Original message:', testMessage);
console.log('');

// Test unpacked
const unpackedSerializer = createCapnpSerializer<SimpleMessage>(schema, { packed: false });
const unpackedResult = unpackedSerializer.serialize(testMessage);

if (unpackedResult._tag === 'Ok') {
  console.log('Unpacked serialized:', unpackedResult.value.length, 'bytes');
  console.log('Unpacked bytes:', Array.from(unpackedResult.value).map(b => b.toString(16).padStart(2, '0')).join(' '));
  console.log('Unpacked bytes array format:');
  const chunks: string[] = [];
  for (let i = 0; i < unpackedResult.value.length; i += 8) {
    const chunk = Array.from(unpackedResult.value.slice(i, i + 8)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ');
    chunks.push(`  ${chunk},`);
  }
  console.log(chunks.join('\n'));

  const unpackedDeserialized = unpackedSerializer.deserialize(unpackedResult.value);
  if (unpackedDeserialized._tag === 'Ok') {
    console.log('Unpacked deserialized:', unpackedDeserialized.value);
    console.log('Unpacked matches:', JSON.stringify(testMessage) === JSON.stringify(unpackedDeserialized.value) ? '✓' : '✗');
  } else {
    console.log('Unpacked deserialization failed:', unpackedDeserialized.error);
  }
} else {
  console.log('Unpacked serialization failed:', unpackedResult.error);
}

console.log('');

// Test packed
const packedSerializer = createCapnpSerializer<SimpleMessage>(schema, { packed: true });
const packedResult = packedSerializer.serialize(testMessage);

if (packedResult._tag === 'Ok') {
  console.log('Packed serialized:', packedResult.value.length, 'bytes');
  console.log('Packed bytes:', Array.from(packedResult.value).map(b => b.toString(16).padStart(2, '0')).join(' '));

  const packedDeserialized = packedSerializer.deserialize(packedResult.value);
  if (packedDeserialized._tag === 'Ok') {
    console.log('Packed deserialized:', packedDeserialized.value);
    console.log('Packed matches:', JSON.stringify(testMessage) === JSON.stringify(packedDeserialized.value) ? '✓' : '✗');
  } else {
    console.log('Packed deserialization failed:', packedDeserialized.error);
  }
} else {
  console.log('Packed serialization failed:', packedResult.error);
}
