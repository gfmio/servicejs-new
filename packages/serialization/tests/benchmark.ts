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
const simpleCapnpSchema = createCapnpSchema({
  name: 'SimpleMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'name', type: 'text', slot: 0 },
    { name: 'active', type: 'bool', slot: 1 },
    { name: 'score', type: 'float64', slot: 2 },
  ],
});

const simpleFlatBuffersSchema = createDynamicFlatBuffersSchema({
  name: 'SimpleMessage',
  fields: [
    { name: 'id', type: 'uint32' },
    { name: 'name', type: 'string' },
    { name: 'active', type: 'bool' },
    { name: 'score', type: 'float64' },
  ],
});

// Complex Message Schemas
const complexCapnpSchema = createCapnpSchema({
  name: 'ComplexMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'timestamp', type: 'uint64', slot: 1 },
    { name: 'user', type: {
      kind: 'struct',
      schema: createCapnpSchema({
        name: 'User',
        fields: [
          { name: 'id', type: 'uint32', slot: 0 },
          { name: 'name', type: 'text', slot: 0 },
          { name: 'email', type: 'text', slot: 1 },
          { name: 'role', type: 'text', slot: 2 },
        ],
      }),
    }, slot: 0 },
    { name: 'tags', type: { kind: 'list', elementType: 'text' }, slot: 1 },
    { name: 'metadata', type: {
      kind: 'struct',
      schema: createCapnpSchema({
        name: 'Metadata',
        fields: [
          { name: 'source', type: 'text', slot: 0 },
          { name: 'priority', type: 'uint32', slot: 0 },
          { name: 'flags', type: { kind: 'list', elementType: 'bool' }, slot: 1 },
        ],
      }),
    }, slot: 2 },
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
const largeCapnpSchema = createCapnpSchema({
  name: 'LargeMessage',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'coordinates', type: { kind: 'list', elementType: 'float64' }, slot: 0 },
    { name: 'labels', type: { kind: 'list', elementType: 'text' }, slot: 1 },
    { name: 'matrix', type: { kind: 'list', elementType: { kind: 'list', elementType: 'float64' } }, slot: 2 },
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
  flatbuffersSchema: any
): SerializerSetup<T>[] => {
  return [
    {
      name: 'JSON',
      serializer: createJsonSerializer<T>(),
    },
    {
      name: 'MessagePack',
      serializer: createMessagePackSerializer<T>(),
    },
    {
      name: 'FlatBuffers',
      serializer: createFlatBuffersSerializer<T>(flatbuffersSchema),
    },
    {
      name: 'Cap\'n Proto',
      serializer: createCapnpSerializer<T>(capnpSchema, { packed: false }),
    },
    {
      name: 'Cap\'n Proto (Packed)',
      serializer: createCapnpSerializer<T>(capnpSchema, { packed: true }),
    },
  ];
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
  {
    const simpleMessages = Array.from({ length: 100 }, (_, i) => generateSimpleMessage(i));
    const serializers = setupSerializers<SimpleMessage>(simpleCapnpSchema, simpleFlatBuffersSchema);
    runBenchmark('Simple Messages (primitives only)', simpleMessages, serializers, ITERATIONS);
  }

  // Benchmark 2: Complex Messages
  {
    const complexMessages = Array.from({ length: 100 }, (_, i) => generateComplexMessage(i));
    const serializers = setupSerializers<ComplexMessage>(complexCapnpSchema, complexFlatBuffersSchema);
    runBenchmark('Complex Messages (nested structures)', complexMessages, serializers, ITERATIONS);
  }

  // Benchmark 3: Large Messages (100 elements)
  {
    const largeMessages = Array.from({ length: 50 }, (_, i) => generateLargeMessage(i, 100));
    const serializers = setupSerializers<LargeMessage>(largeCapnpSchema, largeFlatBuffersSchema);
    runBenchmark('Large Messages (100 elements)', largeMessages, serializers, ITERATIONS / 2);
  }

  // Benchmark 4: Large Messages (1000 elements)
  {
    const veryLargeMessages = Array.from({ length: 10 }, (_, i) => generateLargeMessage(i, 1000));
    const serializers = setupSerializers<LargeMessage>(largeCapnpSchema, largeFlatBuffersSchema);
    runBenchmark('Very Large Messages (1000 elements)', veryLargeMessages, serializers, ITERATIONS / 10);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     Benchmark Complete                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
};

// Run benchmark
main().catch(console.error);
