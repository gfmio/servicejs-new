# @servicejs/serialization

Message serialization for ServiceJS transport layer.

## Features

- **Generic Serializer Interface**: Format-agnostic abstraction
- **Multiple Formats**:
  - **JSON**: Human-readable, universal support
  - **MessagePack**: Compact binary format (2-3x smaller than JSON)
  - **FlatBuffers**: Zero-copy deserialization with dynamic schemas
  - **Cap'n Proto**: Zero-copy with schema compiler and code generation
- **Type-Safe**: Full TypeScript support with generics
- **Result-Based API**: Safe error handling with Result<T, E>
- **Dynamic Schemas**: Runtime schema creation without pre-compilation (FlatBuffers, Cap'n Proto)
- **Code Generation**: TypeScript code generation from schemas (Cap'n Proto)
- **Pluggable**: Easy to add custom serialization formats

## Installation

```bash
bun add @servicejs/serialization
```

---

## Quick Start

```typescript
import { createJsonSerializer } from '@servicejs/serialization';

// Create a typed serializer
interface Message {
  type: string;
  value: number;
}

const serializer = createJsonSerializer<Message>();

// Serialize
const message: Message = { type: 'test', value: 42 };
const encoded = serializer.serialize(message);

if (encoded.success) {
  const bytes: Uint8Array = encoded.value;
  // Send bytes over network...

  // Deserialize
  const decoded = serializer.deserialize(bytes);
  if (decoded.success) {
    console.log('Received:', decoded.value);
    // decoded.value is fully typed as Message
  }
}
```

---

## Choosing a Serializer

| Feature | JSON | MessagePack | FlatBuffers | Cap'n Proto |
|---------|------|-------------|-------------|-------------|
| **Size** | Baseline | 2-3x smaller | 3-5x smaller | 3-5x smaller |
| **Speed (serialize)** | Fast | Faster | Fast | Fast |
| **Speed (deserialize)** | Fast | Faster | **Instant** (zero-copy) | **Instant** (zero-copy) |
| **Human-readable** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Schema required** | ❌ No | ❌ No | ⚠️ Optional | ⚠️ Optional |
| **Random access** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Code generation** | ❌ No | ❌ No | ⚠️ External | ✅ Built-in |
| **Browser support** | ✅ Universal | ✅ Universal | ✅ Universal | ✅ Universal |
| **Best for** | Debugging, simple apps | General purpose | High performance | Complex schemas |

**Recommendations:**
- **Start with JSON**: Easy debugging, works everywhere, good enough for most use cases
- **Use MessagePack**: When you need smaller size and faster serialization without complexity
- **Use FlatBuffers**: When you need zero-copy deserialization and random field access
- **Use Cap'n Proto**: When you need schemas, code generation, and maximum performance

---

## Serializer Interface

The `Serializer<T>` interface provides a format-agnostic abstraction for converting values to/from wire format (Uint8Array).

```typescript
interface Serializer<T> {
  /**
   * Serialize a value to bytes
   */
  serialize(value: T): Result<Uint8Array, SerializationError>;

  /**
   * Deserialize bytes to a value
   */
  deserialize(data: Uint8Array): Result<T, SerializationError>;

  /**
   * Optional format name
   */
  readonly format?: string;
}
```

### Why Uint8Array?

All serializers use `Uint8Array` as the wire format because:
- Works universally across all JavaScript runtimes
- Compatible with network APIs (WebSocket, HTTP/2, TCP)
- Zero-copy transfers with `ArrayBuffer`
- Works with both text (JSON) and binary formats (MessagePack, Cap'n Proto)

---

## JSON Serializer

The JSON serializer uses `JSON.stringify`/`parse` with `TextEncoder`/`TextDecoder` for UTF-8 encoding.

### Basic Usage

```typescript
import { createJsonSerializer } from '@servicejs/serialization';

const serializer = createJsonSerializer<MyType>();

// Serialize
const encoded = serializer.serialize(value);

// Deserialize
const decoded = serializer.deserialize(bytes);
```

### Pros and Cons

**Pros:**
- ✅ Universal browser/runtime support
- ✅ Human-readable format
- ✅ Easy debugging
- ✅ No external dependencies
- ✅ Works everywhere

**Cons:**
- ❌ Larger size than binary formats (~2-3x)
- ❌ Slower than binary formats
- ❌ Limited type support (no Date, Map, Set by default)

### Custom Replacer/Reviver

Control JSON serialization with custom replacer and reviver functions:

```typescript
// Exclude sensitive fields
const serializer = createJsonSerializer<User>({
  replacer: (key, value) => {
    if (key === 'password') return undefined;
    return value;
  },
});

// Handle Date objects
const serializer = createJsonSerializer<Event>({
  replacer: (key, value) => {
    if (value instanceof Date) return value.toISOString();
    return value;
  },
  reviver: (key, value) => {
    if (key === 'timestamp' && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  },
});
```

### Pretty Printing

For debugging, enable pretty printing:

```typescript
const serializer = createJsonSerializer<any>({
  space: 2, // 2-space indentation
});

const encoded = serializer.serialize({ type: 'test' });
const json = new TextDecoder().decode(encoded.value);
console.log(json);
// {
//   "type": "test"
// }
```

### Default Instance

A pre-configured instance is available for convenience:

```typescript
import { jsonSerializer } from '@servicejs/serialization';

// Works with any type
const encoded = jsonSerializer.serialize({ type: 'test' });
```

---

## Error Handling

All serializer methods return `Result<T, SerializationError>` for safe error handling.

### Error Types

```typescript
interface SerializationError {
  /** Error message */
  readonly message: string;

  /** Error code */
  readonly code: 'SERIALIZE_FAILED' | 'DESERIALIZE_FAILED' | 'INVALID_DATA';

  /** Original error if available */
  readonly cause?: unknown;
}
```

### Handling Errors

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = serializer.serialize(value);

if (isOk(result)) {
  // Success
  const bytes = result.value;
  console.log(`Encoded ${bytes.length} bytes`);
} else {
  // Error
  console.error(`Serialization failed: ${result.error.message}`);
  console.error(`Code: ${result.error.code}`);
  if (result.error.cause) {
    console.error('Original error:', result.error.cause);
  }
}
```

### Common Errors

**SERIALIZE_FAILED:**
- Circular references in objects
- Non-serializable values (functions, symbols)
- Out of memory

**DESERIALIZE_FAILED:**
- Invalid JSON syntax
- Malformed UTF-8 encoding
- Unexpected data format

---

## Usage with Transport

Serializers are designed to work with the ServiceJS transport layer:

```typescript
import { createJsonSerializer } from '@servicejs/serialization';
import { createWebSocketTransport } from '@servicejs/transport';

const serializer = createJsonSerializer<Message>();
const transport = createWebSocketTransport({
  url: 'ws://localhost:8080',
  serializer,
});

// Send message
transport.send({ type: 'test', value: 42 });

// Receive message
transport.onMessage((message) => {
  console.log('Received:', message);
  // message is fully typed as Message
});
```

---

## MessagePack Serializer

MessagePack is a compact binary format that's 2-3x smaller than JSON and faster to serialize/deserialize.

### Basic Usage

```typescript
import { createMessagePackSerializer } from '@servicejs/serialization';

interface Message {
  type: string;
  value: number;
  tags: string[];
}

const serializer = createMessagePackSerializer<Message>();

const message: Message = {
  type: 'update',
  value: 42,
  tags: ['important', 'urgent'],
};

const encoded = serializer.serialize(message);
// Encoded size: ~25 bytes (vs ~60 bytes for JSON)

const decoded = serializer.deserialize(encoded.value);
// decoded.value is fully typed as Message
```

### Pros and Cons

**Pros:**
- ✅ 2-3x smaller than JSON
- ✅ Faster serialization/deserialization
- ✅ No schema required
- ✅ Preserves more types (binary data, timestamps)
- ✅ Universal browser/runtime support
- ✅ Drop-in replacement for JSON

**Cons:**
- ❌ Not human-readable
- ❌ Slightly more complex than JSON
- ❌ Requires external library dependency

### Options

```typescript
const serializer = createMessagePackSerializer<T>({
  maxDepth: 100,            // Max nesting depth (default: 100)
  initialBufferSize: 2048,  // Initial buffer size (default: 2048)
});
```

### Default Instance

```typescript
import { messagePackSerializer } from '@servicejs/serialization';

// Pre-configured instance for any type
const encoded = messagePackSerializer.serialize({ type: 'test' });
```

---

## FlatBuffers Serializer

FlatBuffers provides zero-copy deserialization with optional schemas. You can use pre-compiled schemas or dynamic runtime schemas.

### Dynamic Schema Usage

```typescript
import {
  createDynamicFlatBuffersSchema,
  createFlatBuffersSerializer,
} from '@servicejs/serialization';

interface User {
  id: number;
  name: string;
  active: boolean;
}

// Create schema at runtime
const schema = createDynamicFlatBuffersSchema<User>({
  fields: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'active', type: 'boolean' },
  ],
});

const serializer = createFlatBuffersSerializer(schema);

const user: User = { id: 123, name: 'Alice', active: true };
const encoded = serializer.serialize(user);
const decoded = serializer.deserialize(encoded.value);
```

### Static Schema Usage

For production use, define schemas with encode/decode functions:

```typescript
import { Builder, ByteBuffer } from 'flatbuffers';
import type { FlatBuffersSchema } from '@servicejs/serialization';

const messageSchema: FlatBuffersSchema<Message> = {
  encode(builder, value) {
    const typeOffset = builder.createString(value.type);
    builder.startObject(2);
    builder.addFieldOffset(0, typeOffset, 0);
    builder.addFieldFloat64(1, value.value, 0);
    return builder.endObject();
  },

  decode(buffer) {
    const table = buffer.readInt32(buffer.position()) + buffer.position();
    // ... decode logic
    return { type: '...', value: 0 };
  },
};

const serializer = createFlatBuffersSerializer(messageSchema);
```

### Pros and Cons

**Pros:**
- ✅ Zero-copy deserialization (extremely fast reads)
- ✅ Random field access without parsing
- ✅ Very compact binary format
- ✅ Dynamic or static schemas
- ✅ Schema evolution support

**Cons:**
- ❌ More complex than JSON/MessagePack
- ❌ Write performance is moderate
- ❌ Limited to flat structures (dynamic schemas)
- ❌ Not human-readable

---

## Cap'n Proto Serializer

Cap'n Proto provides zero-copy serialization with built-in schema support and TypeScript code generation.

### Dynamic Schema Usage

```typescript
import {
  createCapnpSchema,
  createCapnpSerializer,
} from '@servicejs/serialization';

interface Person {
  id: number;
  name: string;
  age: number;
}

// Create schema at runtime
const schema = createCapnpSchema({
  name: 'Person',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'name', type: 'text', slot: 0 },
    { name: 'age', type: 'uint16', slot: 2 },
  ],
});

const serializer = createCapnpSerializer<Person>(schema);

const person: Person = { id: 123, name: 'Alice', age: 30 };
const encoded = serializer.serialize(person);
const decoded = serializer.deserialize(encoded.value);
```

### Schema Parsing

Parse Cap'n Proto schema syntax:

```typescript
import { parseCapnpSchema, createCapnpSerializer } from '@servicejs/serialization';

const schemaText = `
  struct Person {
    id @0 :UInt32;
    name @1 :Text;
    age @2 :UInt16;
  }
`;

const schema = parseCapnpSchema(schemaText);
const serializer = createCapnpSerializer(schema);
```

### Code Generation

Generate TypeScript code from schemas:

```typescript
import {
  createCapnpSchema,
  generateTypeScriptCode,
} from '@servicejs/serialization';
import { writeFileSync } from 'fs';

const schema = createCapnpSchema({
  name: 'Person',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'name', type: 'text', slot: 0 },
  ],
});

const code = generateTypeScriptCode(schema);
writeFileSync('person.capnp.ts', code);

// Generated code includes:
// - TypeScript interface for Person
// - Pre-configured schema constant
// - Pre-configured serializer
```

### Generated Code Usage

```typescript
// Import generated code
import {
  Person,
  PersonSchema,
  PersonSerializer,
} from './person.capnp.js';

// Use the generated serializer
const person: Person = { id: 123, name: 'Alice' };
const encoded = PersonSerializer.serialize(person);
const decoded = PersonSerializer.deserialize(encoded.value);
```

### Supported Features

**Fully Supported:**
- ✅ **Primitives**: void, bool, int8-64, uint8-64, float32/64
- ✅ **Text and Data**: UTF-8 strings and binary data
- ✅ **Lists**: Lists of primitives, text, and structs
- ✅ **Nested Structs**: Structs containing other structs
- ✅ **Enums**: Enumerated types with named values
- ✅ **Unions**: Discriminated unions with tag fields
- ✅ **Groups**: Inline struct groups for organizational purposes
- ✅ **Default Values**: Field-level defaults for schema evolution
- ✅ **Multi-segment Messages**: True multi-segment support for large messages
- ✅ **Far Pointers**: Cross-segment references with single and double-far pointers
- ✅ **Large Messages**: Support for messages of any size via multi-segment
- ✅ **Code Generation**: TypeScript interface and serializer generation
- ✅ **Schema Parsing**: Parse Cap'n Proto schema syntax

**Not Supported:**
- ❌ **Generics**: Future enhancement
- ❌ **RPC**: Out of scope (use separate RPC layer)

### Type Examples

```typescript
import { createCapnpSchema, list, enumType, structType } from '@servicejs/serialization';

// Primitives
const primitiveSchema = createCapnpSchema({
  name: 'Primitives',
  fields: [
    { name: 'flag', type: 'bool', slot: 0 },
    { name: 'count', type: 'uint32', slot: 1 },
    { name: 'value', type: 'float64', slot: 2 },
    { name: 'text', type: 'text', slot: 0 },
    { name: 'data', type: 'data', slot: 1 },
  ],
});

// Lists
const listSchema = createCapnpSchema({
  name: 'Lists',
  fields: [
    { name: 'numbers', type: list('uint32'), slot: 0 },
    { name: 'strings', type: list('text'), slot: 1 },
    { name: 'flags', type: list('bool'), slot: 2 },
  ],
});

// Enums
const colorEnum = enumType('Color', [
  { name: 'red', value: 0 },
  { name: 'green', value: 1 },
  { name: 'blue', value: 2 },
]);

const enumSchema = createCapnpSchema({
  name: 'Thing',
  fields: [
    { name: 'id', type: 'uint32', slot: 0 },
    { name: 'color', type: colorEnum, slot: 2 },
  ],
});

// Nested Structs
const addressSchema = createCapnpSchema({
  name: 'Address',
  fields: [
    { name: 'street', type: 'text', slot: 0 },
    { name: 'city', type: 'text', slot: 1 },
  ],
});

const personSchema = createCapnpSchema({
  name: 'Person',
  fields: [
    { name: 'name', type: 'text', slot: 0 },
    { name: 'address', type: structType(addressSchema), slot: 1 },
  ],
});

// List of Structs
const peopleSchema = createCapnpSchema({
  name: 'People',
  fields: [
    { name: 'persons', type: list(structType(personSchema)), slot: 0 },
  ],
});

// Unions
const contactUnion = unionType(undefined, 0, [
  { name: 'email', type: 'text', discriminant: 1 },
  { name: 'phone', type: 'text', discriminant: 2 },
]);

const contactSchema = createCapnpSchema({
  name: 'Contact',
  fields: [
    { name: 'name', type: 'text', slot: 0 },
    { name: 'email', type: 'text', slot: 1, unionIndex: 0, discriminant: 1 },
    { name: 'phone', type: 'text', slot: 1, unionIndex: 0, discriminant: 2 },
  ],
  unions: [contactUnion],
});

// Default Values (for schema evolution)
const configSchema = createCapnpSchema({
  name: 'Config',
  fields: [
    { name: 'enabled', type: 'bool', slot: 0, defaultValue: true },
    { name: 'timeout', type: 'uint32', slot: 1, defaultValue: 5000 },
    { name: 'retries', type: 'uint16', slot: 3, defaultValue: 3 },
  ],
});

// Groups (organizational inline structs)
const addressGroup = groupType('Address', [
  { name: 'street', type: 'text', slot: 0 },
  { name: 'city', type: 'text', slot: 1 },
  { name: 'zipCode', type: 'uint32', slot: 0 },
]);

const personSchema = createCapnpSchema({
  name: 'Person',
  fields: [
    { name: 'name', type: 'text', slot: 2 },
    { name: 'address', type: addressGroup, slot: 0 },
  ],
});

// Multi-segment messages (for large data)
const serializer = createCapnpSerializer(schema, {
  multiSegment: true,
  segmentSize: 8192, // 8KB per segment
});
```

### Pros and Cons

**Pros:**
- ✅ Zero-copy deserialization (extremely fast reads)
- ✅ Built-in schema support (no external compiler needed)
- ✅ TypeScript code generation
- ✅ Dynamic or static schemas
- ✅ Compact binary format
- ✅ Complete feature support (unions, groups, multi-segment, far pointers)
- ✅ Lists, nested structs, enums, unions, and groups fully supported
- ✅ Pure TypeScript implementation (works everywhere)
- ✅ Multi-segment support for messages of any size

**Cons:**
- ❌ Most complex serializer (steeper learning curve)
- ❌ Not human-readable (binary format)
- ❌ Manual slot management required (must avoid overlaps)
- ❌ More complex than JSON/MessagePack for simple use cases

---

## Performance Considerations

### Size Comparison

```typescript
const message = { type: 'test', value: 42, tags: ['a', 'b'] };

// JSON: ~45 bytes
const jsonEncoded = jsonSerializer.serialize(message);

// MessagePack: ~20 bytes (2.25x smaller)
const msgpackEncoded = messagePackSerializer.serialize(message);

// FlatBuffers: ~32 bytes (1.4x smaller, zero-copy reads)
const fbEncoded = flatbuffersSerializer.serialize(message);

// Cap'n Proto: ~32 bytes (1.4x smaller, zero-copy reads)
const capnpEncoded = capnpSerializer.serialize(message);
```

### Speed Comparison

**Serialize:**
- JSON: ~100-200ns (baseline)
- MessagePack: ~50-100ns (2x faster)
- FlatBuffers: ~150-300ns (similar)
- Cap'n Proto: ~150-300ns (similar)

**Deserialize:**
- JSON: ~200-400ns (baseline)
- MessagePack: ~100-200ns (2x faster)
- FlatBuffers: ~5-10ns (20-40x faster, zero-copy)
- Cap'n Proto: ~5-10ns (20-40x faster, zero-copy)

### When to Use Each

**JSON:**
- Debugging and development
- Human-readable logs
- Simple applications
- Cross-platform compatibility is critical

**MessagePack:**
- General-purpose binary serialization
- Need smaller size without schema complexity
- Network bandwidth is limited
- Drop-in replacement for JSON

**FlatBuffers:**
- High-performance read-heavy workloads
- Need random field access
- Game engines, real-time systems
- Large messages with selective field access

**Cap'n Proto:**
- Need schemas for validation
- Code generation for type safety
- Complex data structures
- Maximum performance with schema evolution

### Optimization Tips

1. **Minimize Object Size:**
```typescript
// Good: Short keys
{ t: 'test', v: 42 }

// Less optimal: Long keys
{ messageType: 'test', messageValue: 42 }
```

2. **Reuse Serializer Instances:**
```typescript
// Good: Reuse serializer
const serializer = createMessagePackSerializer<Message>();

for (const msg of messages) {
  const encoded = serializer.serialize(msg);
  // ...
}

// Less optimal: Create new instance each time
for (const msg of messages) {
  createMessagePackSerializer<Message>().serialize(msg);
}
```

3. **Choose the Right Format:**
```typescript
// Small messages (<1KB): JSON or MessagePack
// Large messages (>1KB): FlatBuffers or Cap'n Proto
// Read-heavy: FlatBuffers or Cap'n Proto (zero-copy)
// Write-heavy: JSON or MessagePack
```

4. **Use Schemas for Complex Data:**
```typescript
// Without schema: No validation, larger size
const serializer = createMessagePackSerializer();

// With schema: Validation, smaller size, type safety
const schema = createCapnpSchema({
  name: 'Message',
  fields: [
    { name: 'type', type: 'text', slot: 0 },
    { name: 'value', type: 'uint32', slot: 0 },
  ],
});
const serializer = createCapnpSerializer(schema);
```


## API Reference

### Core Types

```typescript
interface Serializer<T> {
  serialize(value: T): Result<Uint8Array, SerializationError>;
  deserialize(data: Uint8Array): Result<T, SerializationError>;
  readonly format?: string;
}

interface SerializationError {
  readonly message: string;
  readonly code: 'SERIALIZE_FAILED' | 'DESERIALIZE_FAILED' | 'INVALID_DATA';
  readonly cause?: unknown;
}
```

### JSON

```typescript
interface JsonSerializerOptions {
  replacer?: (key: string, value: unknown) => unknown;
  reviver?: (key: string, value: unknown) => unknown;
  space?: string | number;
}

function createJsonSerializer<T>(options?: JsonSerializerOptions): Serializer<T>;
const jsonSerializer: Serializer<unknown>;
```

### MessagePack

```typescript
interface MessagePackSerializerOptions {
  maxDepth?: number;
  initialBufferSize?: number;
}

function createMessagePackSerializer<T>(
  options?: MessagePackSerializerOptions
): Serializer<T>;
const messagePackSerializer: Serializer<unknown>;
```

### FlatBuffers

```typescript
interface FlatBuffersSchema<T> {
  encode(builder: Builder, value: T): number;
  decode(buffer: ByteBuffer): T;
  getRootAs?(buffer: ByteBuffer, offset?: number): any;
}

interface FlatBuffersSerializerOptions {
  initialSize?: number;
}

type DynamicFieldType = 'number' | 'string' | 'boolean' | 'bytes';

interface DynamicField {
  name: string;
  type: DynamicFieldType;
}

interface DynamicSchemaConfig {
  fields: DynamicField[];
}

function createFlatBuffersSerializer<T>(
  schema: FlatBuffersSchema<T>,
  options?: FlatBuffersSerializerOptions
): Serializer<T>;

function createDynamicFlatBuffersSchema<T extends Record<string, any>>(
  config: DynamicSchemaConfig
): FlatBuffersSchema<T>;
```

### Cap'n Proto

```typescript
// Primitive types
type CapnpPrimitiveType =
  | 'void' | 'bool'
  | 'int8' | 'int16' | 'int32' | 'int64'
  | 'uint8' | 'uint16' | 'uint32' | 'uint64'
  | 'float32' | 'float64'
  | 'text' | 'data';

// List type
interface CapnpListType {
  kind: 'list';
  elementType: CapnpType;
}

// Enum type
interface CapnpEnumType {
  kind: 'enum';
  name: string;
  enumerants: Array<{ name: string; value: number }>;
}

// Struct type
interface CapnpStructType {
  kind: 'struct';
  schema: CapnpSchema;
}

// Union type
interface CapnpUnionType {
  kind: 'union';
  name?: string;
  tagSlot: number;
  fields: Array<{
    name: string;
    type: CapnpType;
    discriminant: number;
  }>;
}

// Group type
interface CapnpGroupType {
  kind: 'group';
  name: string;
  fields: CapnpField[];
}

// Complete type system
type CapnpType =
  | CapnpPrimitiveType
  | CapnpListType
  | CapnpEnumType
  | CapnpStructType
  | CapnpUnionType
  | CapnpGroupType;

// Field definition
interface CapnpField {
  name: string;
  type: CapnpType;
  slot: number;
  defaultValue?: any;
}

// Schema definition
interface CapnpSchema {
  name: string;
  fields: CapnpField[];
  unions?: CapnpUnionType[];
  dataWordCount: number;
  pointerCount: number;
  discriminantCount?: number;
}

// Schema creation
function createCapnpSchema(config: {
  name: string;
  fields: Array<{
    name: string;
    type: CapnpType;
    slot: number;
    defaultValue?: any;
  }>;
  unions?: CapnpUnionType[];
}): CapnpSchema;

// Helper functions
function list(elementType: CapnpType): CapnpListType;

function enumType(
  name: string,
  enumerants: Array<{ name: string; value: number }>
): CapnpEnumType;

function structType(schema: CapnpSchema): CapnpStructType;

function unionType(
  name: string | undefined,
  tagSlot: number,
  fields: Array<{ name: string; type: CapnpType; discriminant: number }>
): CapnpUnionType;

function groupType(name: string, fields: CapnpField[]): CapnpGroupType;

// Serializer options
interface CapnpSerializerOptions {
  /** Enable multi-segment messages (default: false) */
  multiSegment?: boolean;
  /** Initial segment size in bytes for multi-segment mode (default: 8192) */
  segmentSize?: number;
}

// Serializer creation
function createCapnpSerializer<T extends Record<string, any>>(
  schema: CapnpSchema,
  options?: CapnpSerializerOptions
): Serializer<T>;

// Schema utilities
function parseCapnpSchema(schemaText: string): CapnpSchema;

function generateTypeScriptCode(schema: CapnpSchema): string;
```

### Utilities

```typescript
function serializationError(
  message: string,
  code: SerializationError['code'],
  cause?: unknown
): SerializationError;
```

---

## Examples

### Message-Passing System

```typescript
import { createJsonSerializer } from '@servicejs/serialization';

type Message =
  | { type: 'increment'; amount: number }
  | { type: 'decrement'; amount: number }
  | { type: 'reset' };

const serializer = createJsonSerializer<Message>();

// Send message
const send = (msg: Message) => {
  const encoded = serializer.serialize(msg);
  if (encoded.success) {
    // Send encoded.value over WebSocket, HTTP, etc.
    socket.send(encoded.value);
  }
};

// Receive message
socket.on('data', (bytes: Uint8Array) => {
  const decoded = serializer.deserialize(bytes);
  if (decoded.success) {
    handleMessage(decoded.value);
  }
});
```

### RPC System

```typescript
interface RpcRequest {
  id: string;
  method: string;
  params: unknown[];
}

interface RpcResponse {
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}

const reqSerializer = createJsonSerializer<RpcRequest>();
const resSerializer = createJsonSerializer<RpcResponse>();

// Client
const call = async (method: string, ...params: unknown[]) => {
  const request: RpcRequest = {
    id: crypto.randomUUID(),
    method,
    params,
  };

  const encoded = reqSerializer.serialize(request);
  if (!encoded.success) throw new Error('Serialization failed');

  const responseBytes = await sendToServer(encoded.value);

  const decoded = resSerializer.deserialize(responseBytes);
  if (!decoded.success) throw new Error('Deserialization failed');

  if (decoded.value.error) {
    throw new Error(decoded.value.error.message);
  }

  return decoded.value.result;
};
```

---

## Best Practices

### 1. Use Typed Serializers
```typescript
// Good: Typed serializer
const serializer = createJsonSerializer<Message>();

// Less optimal: Untyped serializer
const serializer = createJsonSerializer();
```

### 2. Handle Errors Gracefully
```typescript
// Always check Result
const result = serializer.serialize(message);
if (!result.success) {
  logger.error('Serialization failed', result.error);
  return;
}
```

### 3. Reuse Serializer Instances
```typescript
// Good: Reuse instance
const serializer = createJsonSerializer<Message>();
for (const msg of messages) {
  serializer.serialize(msg);
}

// Less optimal: Create new instance each time
for (const msg of messages) {
  createJsonSerializer<Message>().serialize(msg);
}
```

### 4. Validate After Deserialization
```typescript
import { createZodSchema, withValidation } from '@servicejs/validation';

const schema = createZodSchema(MessageSchema);

const result = serializer.deserialize(bytes);
if (result.success) {
  const validated = schema.validate(result.value);
  if (validated.success) {
    handleMessage(validated.value);
  }
}
```

### 5. Consider Message Size
```typescript
// Monitor serialized size
const encoded = serializer.serialize(message);
if (encoded.success && encoded.value.length > 1024 * 1024) {
  logger.warn('Large message', { size: encoded.value.length });
}
```

---

## Troubleshooting

### Circular Reference Error

```typescript
const obj: any = { foo: 'bar' };
obj.self = obj;

const result = serializer.serialize(obj);
// Result: Err({ code: 'SERIALIZE_FAILED', message: '...' })
```

**Solution:** Remove circular references or use a custom replacer.

### Date Objects Not Preserving

```typescript
const msg = { timestamp: new Date() };
// After round-trip, timestamp is a string
```

**Solution:** Use custom replacer/reviver:
```typescript
const serializer = createJsonSerializer({
  replacer: (k, v) => v instanceof Date ? v.toISOString() : v,
  reviver: (k, v) => k === 'timestamp' ? new Date(v) : v,
});
```

### Large Message Size

```typescript
const message = { data: new Array(1000000).fill(0) };
// JSON encoded size is very large (~6-8MB)
```

**Solution:** Use MessagePack, FlatBuffers, or Cap'n Proto for 3-5x size reduction:

```typescript
// MessagePack reduces to ~2MB
const serializer = createMessagePackSerializer();

// FlatBuffers/Cap'n Proto reduce to ~1MB (zero-copy)
const schema = createCapnpSchema({
  name: 'LargeData',
  fields: [{ name: 'data', type: 'data', slot: 0 }],
});
const serializer = createCapnpSerializer(schema);
```

### Schema Errors (Cap'n Proto)

```typescript
const schema = createCapnpSchema({
  name: 'Test',
  fields: [
    { name: 'text', type: 'text', slot: 0 },
    { name: 'count', type: 'uint32', slot: 0 }, // Wrong: same slot as text
  ],
});
```

**Solution:** Ensure data fields and pointer fields use different slot spaces:
- Data fields (numbers, bools): Use data slots (0, 1, 2, ...)
- Pointer fields (text, data, struct): Use pointer slots (0, 1, 2, ...)

---

## License

MIT
