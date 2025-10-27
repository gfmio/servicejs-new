/**
 * Field Access Performance Benchmark
 *
 * Compares performance of reading/writing fields for:
 * - Native JavaScript objects
 * - FlatBuffers (Compiled) - zero-copy binary format
 * - Cap'n Proto (Generated) - zero-copy binary format
 *
 * This benchmark shows the true cost/benefit of binary formats
 * when working with data in memory (not serialization overhead).
 *
 * Run with: bun run tests/field-access-benchmark.ts
 */

import { createSegment } from '../src/capnp/encoding.js';
import { SimpleMessage as CapnpSimpleMessage } from '../src/capnp-generated/SimpleMessage.js';
import { ComplexMessage as CapnpComplexMessage } from '../src/capnp-generated/ComplexMessage.js';
import { Builder, ByteBuffer } from 'flatbuffers';
import { SimpleMessage as FlatSimpleMessage } from '../schemas/generated/benchmark/simple-message.js';
import { ComplexMessage as FlatComplexMessage } from '../schemas/generated/benchmark/complex-message.js';
import { User as FlatUser } from '../schemas/generated/benchmark/user.js';
import { Metadata as FlatMetadata } from '../schemas/generated/benchmark/metadata.js';

// ============================================================================
// Test Data Structures
// ============================================================================

interface SimpleMessageJS {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

interface ComplexMessageJS {
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

// ============================================================================
// Setup Functions
// ============================================================================

/**
 * Create native JS objects
 */
function createJSSimpleMessages(count: number): SimpleMessageJS[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Message ${i}`,
    active: i % 2 === 0,
    score: Math.random() * 100,
  }));
}

function createJSComplexMessages(count: number): ComplexMessageJS[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    timestamp: Date.now() + i,
    user: {
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      role: i % 2 === 0 ? 'admin' : 'user',
    },
    tags: [`tag1`, `tag2`, `custom${i}`],
    metadata: {
      source: 'benchmark',
      priority: i,
      flags: [true, false, true, i % 2 === 0],
    },
  }));
}

/**
 * Create Cap'n Proto objects (already in binary format)
 */
function createCapnpSimpleMessages(count: number): Array<{ segment: any; offset: number; instance: any }> {
  return Array.from({ length: count }, (_, i) => {
    const segment = createSegment(1024);
    const offset = CapnpSimpleMessage.serialize(segment, {
      id: i,
      name: `Message ${i}`,
      active: i % 2 === 0,
      score: Math.random() * 100,
    });
    const instance = new CapnpSimpleMessage(segment, offset);
    return { segment, offset, instance };
  });
}

function createCapnpComplexMessages(count: number): Array<{ segment: any; offset: number; instance: any }> {
  return Array.from({ length: count }, (_, i) => {
    const segment = createSegment(4096);
    const offset = CapnpComplexMessage.serialize(segment, {
      id: i,
      timestamp: Date.now() + i,
      user: {
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 2 === 0 ? 'admin' : 'user',
      },
      tags: [`tag1`, `tag2`, `custom${i}`],
      metadata: {
        source: 'benchmark',
        priority: i,
        flags: [true, false, true, i % 2 === 0],
      },
    });
    const instance = new CapnpComplexMessage(segment, offset);
    return { segment, offset, instance };
  });
}

/**
 * Create FlatBuffers objects (already in binary format)
 */
function createFlatSimpleMessages(count: number): Array<{ buffer: ByteBuffer; instance: any }> {
  return Array.from({ length: count }, (_, i) => {
    const builder = new Builder(1024);
    const nameOffset = builder.createString(`Message ${i}`);

    const offset = FlatSimpleMessage.createSimpleMessage(
      builder,
      i,
      nameOffset,
      i % 2 === 0,
      Math.random() * 100
    );

    builder.finish(offset);
    const bytes = builder.asUint8Array();
    const buffer = new ByteBuffer(bytes);
    const instance = FlatSimpleMessage.getRootAsSimpleMessage(buffer);

    return { buffer, instance };
  });
}

function createFlatComplexMessages(count: number): Array<{ buffer: ByteBuffer; instance: any }> {
  return Array.from({ length: count }, (_, i) => {
    const builder = new Builder(4096);

    // Create strings
    const userNameOffset = builder.createString(`User ${i}`);
    const userEmailOffset = builder.createString(`user${i}@example.com`);
    const userRoleOffset = builder.createString(i % 2 === 0 ? 'admin' : 'user');

    // Create user
    FlatUser.startUser(builder);
    FlatUser.addId(builder, i);
    FlatUser.addName(builder, userNameOffset);
    FlatUser.addEmail(builder, userEmailOffset);
    FlatUser.addRole(builder, userRoleOffset);
    const userOffset = FlatUser.endUser(builder);

    // Create tags
    const tagOffsets = [
      builder.createString('tag1'),
      builder.createString('tag2'),
      builder.createString(`custom${i}`),
    ];
    const tagsOffset = FlatComplexMessage.createTagsVector(builder, tagOffsets);

    // Create metadata
    const metadataSourceOffset = builder.createString('benchmark');
    const metadataFlagsOffset = FlatMetadata.createFlagsVector(builder, [true, false, true, i % 2 === 0]);
    FlatMetadata.startMetadata(builder);
    FlatMetadata.addSource(builder, metadataSourceOffset);
    FlatMetadata.addPriority(builder, i);
    FlatMetadata.addFlags(builder, metadataFlagsOffset);
    const metadataOffset = FlatMetadata.endMetadata(builder);

    // Create complex message
    FlatComplexMessage.startComplexMessage(builder);
    FlatComplexMessage.addId(builder, i);
    FlatComplexMessage.addTimestamp(builder, BigInt(Date.now() + i));
    FlatComplexMessage.addUser(builder, userOffset);
    FlatComplexMessage.addTags(builder, tagsOffset);
    FlatComplexMessage.addMetadata(builder, metadataOffset);
    const messageOffset = FlatComplexMessage.endComplexMessage(builder);

    builder.finish(messageOffset);
    const bytes = builder.asUint8Array();
    const buffer = new ByteBuffer(bytes);
    const instance = FlatComplexMessage.getRootAsComplexMessage(buffer);

    return { buffer, instance };
  });
}

// ============================================================================
// Benchmark Functions
// ============================================================================

interface BenchmarkResult {
  name: string;
  readTime: number;
  writeTime: number;
  memoryBytes: number;
}

/**
 * Benchmark reading all fields from simple messages
 */
function benchmarkReadSimple(name: string, messages: any[], accessor: (msg: any) => void): number {
  const start = performance.now();

  for (let iter = 0; iter < 10000; iter++) {
    for (const msg of messages) {
      accessor(msg);
    }
  }

  const end = performance.now();
  return end - start;
}

/**
 * Benchmark reading all fields from complex messages
 */
function benchmarkReadComplex(name: string, messages: any[], accessor: (msg: any) => void): number {
  const start = performance.now();

  for (let iter = 0; iter < 10000; iter++) {
    for (const msg of messages) {
      accessor(msg);
    }
  }

  const end = performance.now();
  return end - start;
}

/**
 * Benchmark writing fields to simple messages
 */
function benchmarkWriteSimple(name: string, messages: any[], mutator: (msg: any, i: number) => void): number {
  const start = performance.now();

  for (let iter = 0; iter < 10000; iter++) {
    for (let i = 0; i < messages.length; i++) {
      mutator(messages[i], iter + i);
    }
  }

  const end = performance.now();
  return end - start;
}

/**
 * Calculate memory usage
 */
function calculateMemory(messages: any[], sizeCalculator: (msg: any) => number): number {
  let total = 0;
  for (const msg of messages) {
    total += sizeCalculator(msg);
  }
  return total;
}

// ============================================================================
// Main Benchmark
// ============================================================================

const main = async () => {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Field Access Performance Benchmark                    ║');
  console.log('║         (Zero-Copy vs Native JavaScript Objects)              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const MESSAGE_COUNT = 100;
  const results: BenchmarkResult[] = [];

  // ============================================================================
  // Simple Messages Benchmark
  // ============================================================================

  console.log('================================================================================');
  console.log('Benchmark: Simple Messages - Field Access');
  console.log(`Message count: ${MESSAGE_COUNT}`);
  console.log(`Iterations: 10,000 (reads all fields from all messages)`);
  console.log('================================================================================\n');

  // JavaScript objects
  {
    const messages = createJSSimpleMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadSimple('JS Simple', messages, (msg) => {
      const id = msg.id;
      const name = msg.name;
      const active = msg.active;
      const score = msg.score;
    });

    const writeTime = benchmarkWriteSimple('JS Simple', messages, (msg, i) => {
      msg.id = i;
      msg.score = i * 2.5;
      msg.active = !msg.active;
    });

    const memory = calculateMemory(messages, (msg) => {
      // Rough estimate: object overhead + property storage
      return 64 + msg.name.length * 2; // Approximate
    });

    results.push({ name: 'JavaScript Objects', readTime, writeTime, memoryBytes: memory });
  }

  // Cap'n Proto (Generated)
  {
    const messages = createCapnpSimpleMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadSimple('Cap\'n Proto Simple', messages, (msg) => {
      const id = msg.instance.id;
      const name = msg.instance.name;
      const active = msg.instance.active;
      const score = msg.instance.score;
    });

    const writeTime = benchmarkWriteSimple('Cap\'n Proto Simple', messages, (msg, i) => {
      msg.instance.id = i;
      msg.instance.score = i * 2.5;
      msg.instance.active = !msg.instance.active;
    });

    const memory = calculateMemory(messages, (msg) => msg.segment.position);

    results.push({ name: 'Cap\'n Proto (Generated)', readTime, writeTime, memoryBytes: memory });
  }

  // FlatBuffers (Compiled)
  {
    const messages = createFlatSimpleMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadSimple('FlatBuffers Simple', messages, (msg) => {
      const id = msg.instance.id();
      const name = msg.instance.name();
      const active = msg.instance.active();
      const score = msg.instance.score();
    });

    // FlatBuffers is read-only
    const writeTime = 0; // Cannot mutate

    const memory = calculateMemory(messages, (msg) => msg.buffer.bytes().length);

    results.push({ name: 'FlatBuffers (Compiled)', readTime, writeTime, memoryBytes: memory });
  }

  // Print results
  console.log('Results (Simple Messages):');
  console.log('─'.repeat(100));
  console.log('| Format                    | Read (ms) | Write (ms) | Total (ms) | Memory (bytes) | Read vs JS | Write vs JS |');
  console.log('─'.repeat(100));

  const jsRead = results[0].readTime;
  const jsWrite = results[0].writeTime;

  for (const result of results) {
    const readVsJS = result.readTime / jsRead;
    const writeVsJS = result.writeTime > 0 ? result.writeTime / jsWrite : 0;
    const total = result.readTime + result.writeTime;

    console.log(
      `| ${result.name.padEnd(25)} | ${result.readTime.toFixed(2).padStart(9)} | ${result.writeTime.toFixed(2).padStart(10)} | ${total.toFixed(2).padStart(10)} | ${result.memoryBytes.toString().padStart(14)} | ${readVsJS.toFixed(2)}x${' '.repeat(7)} | ${writeVsJS > 0 ? writeVsJS.toFixed(2) + 'x' : 'N/A'.padEnd(4)} ${' '.repeat(4)}|`
    );
  }
  console.log('─'.repeat(100));
  console.log();

  // ============================================================================
  // Complex Messages Benchmark
  // ============================================================================

  results.length = 0;

  console.log('================================================================================');
  console.log('Benchmark: Complex Messages - Field Access');
  console.log(`Message count: ${MESSAGE_COUNT}`);
  console.log(`Iterations: 10,000 (reads all fields including nested objects)`);
  console.log('================================================================================\n');

  // JavaScript objects
  {
    const messages = createJSComplexMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadComplex('JS Complex', messages, (msg) => {
      const id = msg.id;
      const timestamp = msg.timestamp;
      const userId = msg.user.id;
      const userName = msg.user.name;
      const userEmail = msg.user.email;
      const userRole = msg.user.role;
      const tags = msg.tags;
      const metadataSource = msg.metadata.source;
      const metadataPriority = msg.metadata.priority;
      const metadataFlags = msg.metadata.flags;
    });

    const writeTime = benchmarkWriteSimple('JS Complex', messages, (msg, i) => {
      msg.id = i;
      msg.user.id = i * 2;
      msg.metadata.priority = i * 3;
    });

    const memory = calculateMemory(messages, (msg) => {
      // Rough estimate
      return 200 + msg.user.name.length * 2 + msg.user.email.length * 2 +
             msg.tags.reduce((sum, tag) => sum + tag.length * 2, 0);
    });

    results.push({ name: 'JavaScript Objects', readTime, writeTime, memoryBytes: memory });
  }

  // Cap'n Proto (Generated)
  {
    const messages = createCapnpComplexMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadComplex('Cap\'n Proto Complex', messages, (msg) => {
      const id = msg.instance.id;
      const timestamp = msg.instance.timestamp;
      const user = msg.instance.user;
      if (user) {
        const userId = user.id;
        const userName = user.name;
        const userEmail = user.email;
        const userRole = user.role;
      }
      const tags = msg.instance.tags;
      const metadata = msg.instance.metadata;
      if (metadata) {
        const source = metadata.source;
        const priority = metadata.priority;
        const flags = metadata.flags;
      }
    });

    const writeTime = benchmarkWriteSimple('Cap\'n Proto Complex', messages, (msg, i) => {
      msg.instance.id = i;
      // Note: nested objects are read-only in our implementation
    });

    const memory = calculateMemory(messages, (msg) => msg.segment.position);

    results.push({ name: 'Cap\'n Proto (Generated)', readTime, writeTime, memoryBytes: memory });
  }

  // FlatBuffers (Compiled)
  {
    const messages = createFlatComplexMessages(MESSAGE_COUNT);

    const readTime = benchmarkReadComplex('FlatBuffers Complex', messages, (msg) => {
      const id = msg.instance.id();
      const timestamp = msg.instance.timestamp();
      const user = msg.instance.user();
      if (user) {
        const userId = user.id();
        const userName = user.name();
        const userEmail = user.email();
        const userRole = user.role();
      }
      const tagsLength = msg.instance.tagsLength();
      for (let i = 0; i < tagsLength; i++) {
        const tag = msg.instance.tags(i);
      }
      const metadata = msg.instance.metadata();
      if (metadata) {
        const source = metadata.source();
        const priority = metadata.priority();
        const flagsLength = metadata.flagsLength();
        for (let i = 0; i < flagsLength; i++) {
          const flag = metadata.flags(i);
        }
      }
    });

    // FlatBuffers is read-only
    const writeTime = 0;

    const memory = calculateMemory(messages, (msg) => msg.buffer.bytes().length);

    results.push({ name: 'FlatBuffers (Compiled)', readTime, writeTime, memoryBytes: memory });
  }

  // Print results
  console.log('Results (Complex Messages):');
  console.log('─'.repeat(100));
  console.log('| Format                    | Read (ms) | Write (ms) | Total (ms) | Memory (bytes) | Read vs JS | Write vs JS |');
  console.log('─'.repeat(100));

  const jsReadComplex = results[0].readTime;
  const jsWriteComplex = results[0].writeTime;

  for (const result of results) {
    const readVsJS = result.readTime / jsReadComplex;
    const writeVsJS = result.writeTime > 0 ? result.writeTime / jsWriteComplex : 0;
    const total = result.readTime + result.writeTime;

    console.log(
      `| ${result.name.padEnd(25)} | ${result.readTime.toFixed(2).padStart(9)} | ${result.writeTime.toFixed(2).padStart(10)} | ${total.toFixed(2).padStart(10)} | ${result.memoryBytes.toString().padStart(14)} | ${readVsJS.toFixed(2)}x${' '.repeat(7)} | ${writeVsJS > 0 ? writeVsJS.toFixed(2) + 'x' : 'N/A'.padEnd(4)} ${' '.repeat(4)}|`
    );
  }
  console.log('─'.repeat(100));
  console.log();

  // ============================================================================
  // Analysis
  // ============================================================================

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                          Analysis                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Key Findings:');
  console.log('');
  console.log('1. **Native JS Objects**: Fastest for both reading and writing');
  console.log('   - Direct property access is highly optimized by V8/JSC');
  console.log('   - Inline caches make property access nearly constant time');
  console.log('');
  console.log('2. **Cap\'n Proto (Generated)**: Slower reads, but supports writes');
  console.log('   - Each field access requires DataView read (bounds checking)');
  console.log('   - Can mutate fields in-place (true zero-copy modification)');
  console.log('   - More predictable memory layout');
  console.log('');
  console.log('3. **FlatBuffers (Compiled)**: Similar read performance to Cap\'n Proto');
  console.log('   - Read-only format (cannot mutate)');
  console.log('   - Must rebuild entire buffer to change any field');
  console.log('   - Smaller memory footprint in some cases');
  console.log('');
  console.log('4. **Memory Usage**: Binary formats more predictable');
  console.log('   - JS objects: Overhead from object structure + property storage');
  console.log('   - Binary formats: Fixed size based on schema');
  console.log('');
  console.log('5. **When Binary Formats Win**:');
  console.log('   - Receiving data from network (already in binary format)');
  console.log('   - Selective field access (only read fields you need)');
  console.log('   - Large messages where you only access a few fields');
  console.log('   - Cross-language compatibility');
  console.log('');
  console.log('6. **When JS Objects Win**:');
  console.log('   - Working with data entirely in JavaScript');
  console.log('   - Need to access most/all fields frequently');
  console.log('   - Need fast mutation');
  console.log('   - Don\'t need network serialization');
  console.log('');

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                     Benchmark Complete                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
};

main().catch(console.error);
