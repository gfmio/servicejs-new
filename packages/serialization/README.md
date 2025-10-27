# @servicejs/serialization

Message serialization for ServiceJS transport layer.

## Features

- **Generic Serializer Interface**: Format-agnostic abstraction
- **JSON Serializer**: Built-in JSON-based serialization
- **Type-Safe**: Full TypeScript support with generics
- **Result-Based API**: Safe error handling with Result<T, E>
- **Pluggable**: Easy to add custom serialization formats
- **Zero Dependencies**: Core package has minimal dependencies

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

## Custom Serializers

You can implement custom serializers for other formats:

### Example: MessagePack Serializer

```typescript
import { ok, err } from '@servicejs/result';
import { encode, decode } from '@msgpack/msgpack';
import type { Serializer } from '@servicejs/serialization';
import { serializationError } from '@servicejs/serialization';

export const createMessagePackSerializer = <T>(): Serializer<T> => ({
  format: 'messagepack',

  serialize(value: T) {
    try {
      const bytes = encode(value);
      return ok(bytes);
    } catch (error) {
      return err(
        serializationError(
          `MessagePack serialization failed: ${error}`,
          'SERIALIZE_FAILED',
          error
        )
      );
    }
  },

  deserialize(data: Uint8Array) {
    try {
      const value = decode(data) as T;
      return ok(value);
    } catch (error) {
      return err(
        serializationError(
          `MessagePack deserialization failed: ${error}`,
          'DESERIALIZE_FAILED',
          error
        )
      );
    }
  },
});
```

### Example: Custom Binary Format

```typescript
import type { Serializer } from '@servicejs/serialization';

interface Point {
  x: number;
  y: number;
}

export const pointSerializer: Serializer<Point> = {
  format: 'point-binary',

  serialize(value: Point) {
    try {
      const buffer = new ArrayBuffer(16); // 2 x float64
      const view = new DataView(buffer);
      view.setFloat64(0, value.x, true);
      view.setFloat64(8, value.y, true);
      return ok(new Uint8Array(buffer));
    } catch (error) {
      return err(serializationError('Failed to serialize point', 'SERIALIZE_FAILED', error));
    }
  },

  deserialize(data: Uint8Array) {
    try {
      if (data.length !== 16) {
        return err(serializationError('Invalid point data', 'INVALID_DATA'));
      }
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const x = view.getFloat64(0, true);
      const y = view.getFloat64(8, true);
      return ok({ x, y });
    } catch (error) {
      return err(serializationError('Failed to deserialize point', 'DESERIALIZE_FAILED', error));
    }
  },
};
```

---

## Performance Considerations

### JSON Serializer

**Size:**
```typescript
const message = { type: 'test', value: 42 };
const encoded = jsonSerializer.serialize(message);
// Typical size: ~30-40 bytes (depends on content)
```

**Speed:**
- Serialize: ~100-200ns for small objects
- Deserialize: ~200-400ns for small objects
- Suitable for most use cases

### Optimization Tips

1. **Minimize Object Size:**
```typescript
// Good: Short keys
{ t: 'test', v: 42 }

// Less optimal: Long keys
{ messageType: 'test', messageValue: 42 }
```

2. **Pre-allocate Buffers:**
```typescript
// For repeated serialization, reuse serializer instance
const serializer = createJsonSerializer<Message>();

for (const msg of messages) {
  const encoded = serializer.serialize(msg);
  // ...
}
```

3. **Consider Binary Formats for Large Data:**
```typescript
// For large arrays of numbers, binary formats are 3-5x smaller
// Consider MessagePack, Protocol Buffers, or Cap'n Proto
```

---

## Future: Cap'n Proto Support

Cap'n Proto support is planned but deferred until the TypeScript ecosystem matures:

**Current Status:**
- `capnp-ts`: Last updated 4 years ago (alpha quality)
- `capnp-es`: Newer fork, but still experimental
- Both require external `capnpc` binary

**Why Defer:**
- JSON serializer works well for most use cases
- Cap'n Proto adds significant complexity
- TypeScript tooling is not production-ready yet

**When to Add:**
- When a mature, well-maintained library emerges
- When zero-copy performance becomes critical
- When interop with other Cap'n Proto systems is needed

The `Serializer<T>` interface already supports it, so adding Cap'n Proto later is straightforward:

```typescript
// Future API (not yet implemented)
import { createCapnpSerializer } from '@servicejs/serialization/capnp';
import { MyMessageSchema } from './schema.capnp.js';

const serializer = createCapnpSerializer(MyMessageSchema);
```

---

## API Reference

### Types

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

interface JsonSerializerOptions {
  replacer?: (key: string, value: unknown) => unknown;
  reviver?: (key: string, value: unknown) => unknown;
  space?: string | number;
}
```

### Functions

```typescript
// Create JSON serializer
function createJsonSerializer<T>(options?: JsonSerializerOptions): Serializer<T>;

// Default JSON serializer instance
const jsonSerializer: Serializer<unknown>;

// Create serialization error
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
// Encoded size is very large
```

**Solution:** Consider binary serialization format (MessagePack, Protocol Buffers) for large data.

---

## License

MIT
