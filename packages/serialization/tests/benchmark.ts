/**
 * Serialization Performance Benchmark
 *
 * Compares performance of all serializers:
 * - JSON
 * - MessagePack
 * - FlatBuffers
 * - Cap'n Proto (with and without packed encoding)
 *
 * Run with: bun run tests/benchmark.ts
 */

import {
  createJsonSerializer,
  createMessagePackSerializer,
  createFlatBuffersSerializer,
  createCapnpSerializer,
  createCapnpSchema,
  createDynamicFlatBuffersSchema,
} from '../src/index.js';
import type { Serializer } from '../src/serializer.js';

// ============================================================================
// Test Message Types
// ============================================================================

/**
 * Simple message with primitives
 */
interface SimpleMessage {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

/**
 * Complex message with nested structures
 */
interface ComplexMessage {
  id: number;
  timestamp: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  tags: string[];
  metadata: {
    source: string;
    priority: number;
    flags: boolean[];
  };
}

/**
 * Large message with arrays
 */
interface LargeMessage {
  id: number;
  coordinates: number[];
  labels: string[];
  matrix: number[][];
}

// ============================================================================
// Test Data Generation
// ============================================================================

const generateSimpleMessage = (id: number): SimpleMessage => ({
  id,
  name: `User ${id}`,
  active: id % 2 === 0,
  score: Math.random() * 100,
});

const generateComplexMessage = (id: number): ComplexMessage => ({
  id,
  timestamp: Date.now(),
  user: {
    id: id * 10,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    role: id % 3 === 0 ? 'admin' : 'user',
  },
  tags: ['tag1', 'tag2', 'tag3', `custom${id}`],
  metadata: {
    source: 'benchmark',
    priority: id % 5,
    flags: [true, false, true, id % 2 === 0],
  },
});

const generateLargeMessage = (id: number, size: number): LargeMessage => ({
  id,
  coordinates: Array.from({ length: size }, (_, i) => i * Math.random()),
  labels: Array.from({ length: size }, (_, i) => `label_${i}`),
  matrix: Array.from({ length: 10 }, (_, i) =>
    Array.from({ length: 10 }, (_, j) => i * 10 + j)
  ),
});

// ============================================================================
// Schema Definitions
// ============================================================================

// Simple Message Schemas
// NOTE: slot values are byte offsets in the data section (not multipliers!)
// Data layout: id(0-3), active(4), padding(5-7), score(8-15)
const simpleCapnpSchema = createCapnpSchema({
  name: 'SimpleMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },      // bytes 0-3
    { name: 'name', type: 'text', slot: 0 },       // pointer slot 0
    { name: 'active', type: 'bool', slot: 4 },    // byte 4
    { name: 'score', type: 'float64', slot: 8 },   // bytes 8-15 (8-byte aligned)
  ],
});

const simpleFlatBuffersSchema = createDynamicFlatBuffersSchema({
  name: 'SimpleMessage',
  fields: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'active', type: 'boolean' },
    { name: 'score', type: 'number' },
  ],
});

// Complex Message Schemas
// Data layout: id(0-3), padding(4-7), timestamp(8-15)
// Pointers: user(0), tags(1), metadata(2)
const complexCapnpSchema = createCapnpSchema({
  name: 'ComplexMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },        // bytes 0-3
    { name: 'timestamp', type: 'uint64', slot: 8 },  // bytes 8-15 (8-byte aligned)
    { name: 'user', type: {
      kind: 'struct',
      schema: createCapnpSchema({
        name: 'User',
        fields: [
          { name: 'id', type: 'uint32', slot: 0 },    // bytes 0-3
          { name: 'name', type: 'text', slot: 0 },     // pointer 0
          { name: 'email', type: 'text', slot: 1 },    // pointer 1
          { name: 'role', type: 'text', slot: 2 },     // pointer 2
        ],
      }),
    }, slot: 0 },                                      // pointer 0
    { name: 'tags', type: { kind: 'list', elementType: 'text' }, slot: 1 },  // pointer 1
    { name: 'metadata', type: {
      kind: 'struct',
      schema: createCapnpSchema({
        name: 'Metadata',
        fields: [
          { name: 'source', type: 'text', slot: 0 },     // pointer 0
          { name: 'priority', type: 'uint32', slot: 0 }, // bytes 0-3
          { name: 'flags', type: { kind: 'list', elementType: 'bool' }, slot: 1 }, // pointer 1
        ],
      }),
    }, slot: 2 },                                       // pointer 2
  ],
});

const complexFlatBuffersSchema = createDynamicFlatBuffersSchema({
  name: 'ComplexMessage',
  fields: [
    { name: 'id', type: 'uint32' },
    { name: 'timestamp', type: 'uint64' },
    { name: 'userName', type: 'string' },
    { name: 'userEmail', type: 'string' },
    { name: 'userRole', type: 'string' },
    { name: 'tags', type: 'string' }, // JSON-encoded array
    { name: 'metadataSource', type: 'string' },
    { name: 'metadataPriority', type: 'uint32' },
  ],
});

// Large Message Schemas
// Data layout: id(0-3)
// Pointers: coordinates(0), labels(1), matrix(2)
const largeCapnpSchema = createCapnpSchema({
  name: 'LargeMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },                                           // bytes 0-3
    { name: 'coordinates', type: { kind: 'list', elementType: 'float64' }, slot: 0 },  // pointer 0
    { name: 'labels', type: { kind: 'list', elementType: 'text' }, slot: 1 },          // pointer 1
    { name: 'matrix', type: { kind: 'list', elementType: { kind: 'list', elementType: 'float64' } }, slot: 2 }, // pointer 2
  ],
});

const largeFlatBuffersSchema = createDynamicFlatBuffersSchema({
  name: 'LargeMessage',
  fields: [
    { name: 'id', type: 'uint32' },
    { name: 'coordinates', type: 'string' }, // JSON-encoded
    { name: 'labels', type: 'string' }, // JSON-encoded
    { name: 'matrix', type: 'string' }, // JSON-encoded
  ],
});

// ============================================================================
// Serializer Setup
// ============================================================================

interface SerializerSetup<T> {
  name: string;
  serializer: Serializer<T>;
  prepareData?: (data: T) => T;
}

const setupSerializers = <T>(
  capnpSchema: any,
  flatbuffersSchema: any | null,
  includeFlatBuffers = true
): SerializerSetup<T>[] => {
  const serializers: SerializerSetup<T>[] = [
    {
      name: 'JSON',
      serializer: createJsonSerializer<T>(),
    },
    {
      name: 'MessagePack',
      serializer: createMessagePackSerializer<T>(),
    },
  ];

  if (includeFlatBuffers && flatbuffersSchema) {
    serializers.push({
      name: 'FlatBuffers',
      serializer: createFlatBuffersSerializer<T>(flatbuffersSchema),
    });
  }

  serializers.push(
    {
      name: 'Cap\'n Proto',
      serializer: createCapnpSerializer<T>(capnpSchema, { packed: false }),
    },
    {
      name: 'Cap\'n Proto (Packed)',
      serializer: createCapnpSerializer<T>(capnpSchema, { packed: true }),
    }
  );

  return serializers;
};

// ============================================================================
// Data Integrity Validation
// ============================================================================

/**
 * Deep equality check for messages
 */
const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((val, i) => deepEqual(val, b[i]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
};

/**
 * Validate that serialization round-trip preserves data
 */
const validateIntegrity = <T>(
  serializer: Serializer<T>,
  original: T,
  serializerName: string
): void => {
  const serialized = serializer.serialize(original);
  if (serialized._tag === 'Err') {
    throw new Error(`${serializerName}: Serialization failed: ${JSON.stringify(serialized.error)}`);
  }

  const deserialized = serializer.deserialize(serialized.value);
  if (deserialized._tag === 'Err') {
    throw new Error(`${serializerName}: Deserialization failed: ${JSON.stringify(deserialized.error)}`);
  }

  if (!deepEqual(original, deserialized.value)) {
    console.error('Original:', JSON.stringify(original, null, 2));
    console.error('Deserialized:', JSON.stringify(deserialized.value, null, 2));
    throw new Error(`${serializerName}: Data integrity check failed - deserialized data does not match original`);
  }
};

// ============================================================================
// Benchmark Runner
// ============================================================================

interface BenchmarkResult {
  serializer: string;
  iterations: number;
  serializationTime: number; // ms
  deserializationTime: number; // ms
  totalTime: number; // ms
  averageSize: number; // bytes
  throughput: number; // ops/sec
}

const runBenchmark = <T>(
  name: string,
  data: T[],
  serializers: SerializerSetup<T>[],
  iterations: number = 1000
): void => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Benchmark: ${name}`);
  console.log(`Iterations: ${iterations}`);
  console.log(`Data points: ${data.length}`);
  console.log(`${'='.repeat(80)}\n`);

  const results: BenchmarkResult[] = [];

  for (const setup of serializers) {
    try {
      const sizes: number[] = [];
      const preparedData = setup.prepareData ? data.map(setup.prepareData) : data;

      // Warm-up
      for (let i = 0; i < 10; i++) {
        const item = preparedData[i % preparedData.length];
        if (!item) continue;
        const serialized = setup.serializer.serialize(item);
        if (serialized._tag === 'Ok') {
          setup.serializer.deserialize(serialized.value);
        }
      }

      // Validate data integrity on a few samples
      console.log(`  Validating integrity...`);
      for (let i = 0; i < Math.min(5, preparedData.length); i++) {
        validateIntegrity(setup.serializer, preparedData[i]!, setup.name);
      }

      // First, collect serialized data (we'll use this for deserialization benchmark)
      const serializedData: Uint8Array[] = [];
      for (const item of preparedData) {
        const result = setup.serializer.serialize(item);
        if (result._tag === 'Ok') {
          serializedData.push(result.value);
          if (sizes.length < preparedData.length) {
            sizes.push(result.value.byteLength);
          }
        } else {
          console.error(`Failed to serialize with ${setup.name}:`, result.error);
          throw new Error(`Serialization failed: ${JSON.stringify(result.error)}`);
        }
      }

      // Measure serialization
      const serializeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const item = preparedData[i % preparedData.length];
        if (!item) continue;
        setup.serializer.serialize(item);
      }
      const serializeEnd = performance.now();
      const serializationTime = serializeEnd - serializeStart;

      // Measure deserialization
      const deserializeStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        const item = serializedData[i % serializedData.length];
        if (!item) continue;
        setup.serializer.deserialize(item);
      }
      const deserializeEnd = performance.now();
      const deserializationTime = deserializeEnd - deserializeStart;

      const totalTime = serializationTime + deserializationTime;
      const averageSize = sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0;
      const throughput = (iterations * 2 * 1000) / totalTime; // ops/sec (serialize + deserialize)

      // Debug: log sizes info
      if (sizes.length === 0) {
        console.warn(`  Warning: No sizes collected for ${setup.name}`);
      }

      results.push({
        serializer: setup.name,
        iterations,
        serializationTime,
        deserializationTime,
        totalTime,
        averageSize,
        throughput,
      });

      console.log(`✓ ${setup.name}`);
    } catch (error) {
      console.log(`✗ ${setup.name}: ${error}`);
    }
  }

  // Print results table
  printResults(results);
};

const printResults = (results: BenchmarkResult[]): void => {
  console.log('\n' + '-'.repeat(120));
  console.log(
    '| Serializer              | Serialize (ms) | Deserialize (ms) | Total (ms) | Size (bytes) | Throughput (ops/s) |'
  );
  console.log('-'.repeat(120));

  // Sort by total time (fastest first)
  const sorted = [...results].sort((a, b) => a.totalTime - b.totalTime);

  for (const result of sorted) {
    const name = result.serializer.padEnd(23);
    const serTime = result.serializationTime.toFixed(2).padStart(14);
    const deserTime = result.deserializationTime.toFixed(2).padStart(16);
    const totalTime = result.totalTime.toFixed(2).padStart(10);
    const avgSize = result.averageSize.toFixed(0).padStart(12);
    const throughput = result.throughput.toFixed(0).padStart(18);

    console.log(`| ${name} | ${serTime} | ${deserTime} | ${totalTime} | ${avgSize} | ${throughput} |`);
  }

  console.log('-'.repeat(120));

  // Print comparison to JSON
  const jsonResult = results.find((r) => r.serializer === 'JSON');
  if (jsonResult) {
    console.log('\nComparison to JSON:');
    for (const result of sorted) {
      if (result.serializer === 'JSON') continue;
      const speedup = jsonResult.totalTime / result.totalTime;
      const sizeRatio = result.averageSize / jsonResult.averageSize;
      const speedupStr = speedup > 1 ? `${speedup.toFixed(2)}x faster` : `${(1 / speedup).toFixed(2)}x slower`;
      const sizeStr = sizeRatio < 1 ? `${((1 - sizeRatio) * 100).toFixed(1)}% smaller` : `${((sizeRatio - 1) * 100).toFixed(1)}% larger`;
      console.log(`  ${result.serializer.padEnd(25)} - ${speedupStr}, ${sizeStr}`);
    }
  }

  console.log('');
};

// ============================================================================
// Main Benchmark Suite
// ============================================================================

const main = async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         ServiceJS Serialization Performance Benchmark         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const ITERATIONS = 10000;

  // Benchmark 1: Simple Messages
  // FlatBuffers works here - flat structure with primitives only
  {
    const simpleMessages = Array.from({ length: 100 }, (_, i) => generateSimpleMessage(i));
    const serializers = setupSerializers<SimpleMessage>(simpleCapnpSchema, simpleFlatBuffersSchema, true);
    runBenchmark('Simple Messages (primitives only)', simpleMessages, serializers, ITERATIONS);
  }

  // Benchmark 2: Complex Messages
  // FlatBuffers excluded - has nested objects (user, metadata)
  {
    const complexMessages = Array.from({ length: 100 }, (_, i) => generateComplexMessage(i));
    const serializers = setupSerializers<ComplexMessage>(complexCapnpSchema, null, false);
    runBenchmark('Complex Messages (nested structures)', complexMessages, serializers, ITERATIONS);
  }

  // Benchmark 3: Large Messages (100 elements)
  // FlatBuffers excluded - has arrays (coordinates, labels, matrix)
  {
    const largeMessages = Array.from({ length: 50 }, (_, i) => generateLargeMessage(i, 100));
    const serializers = setupSerializers<LargeMessage>(largeCapnpSchema, null, false);
    runBenchmark('Large Messages (100 elements)', largeMessages, serializers, ITERATIONS / 2);
  }

  // Benchmark 4: Large Messages (1000 elements)
  // FlatBuffers excluded - has arrays
  {
    const veryLargeMessages = Array.from({ length: 10 }, (_, i) => generateLargeMessage(i, 1000));
    const serializers = setupSerializers<LargeMessage>(largeCapnpSchema, null, false);
    runBenchmark('Very Large Messages (1000 elements)', veryLargeMessages, serializers, ITERATIONS / 10);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     Benchmark Complete                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
};

// Run benchmark
main().catch(console.error);
