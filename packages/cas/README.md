# @servicejs/cas

Content-Addressed Storage (CAS) for ServiceJS - Immutable storage with content-based addressing.

## Features

- **Content-Based Addressing**: Data is addressed by its cryptographic hash
- **Immutability**: Content cannot change without changing its address
- **Automatic Deduplication**: Identical content is stored only once
- **Multiple Storage Backends**: In-memory (dev/testing) and file-based (production)
- **Type-Safe**: Full TypeScript support with branded types
- **Multiple Hash Algorithms**: SHA-256, SHA-1, or BLAKE3
- **Custom Serialization**: Pluggable serializers for any data format

## Installation

```bash
bun add @servicejs/cas
```

## Quick Start

```typescript
import { createInMemoryCAS } from '@servicejs/cas';

// Create CAS instance
const cas = createInMemoryCAS<User>();

// Store content
const user = { name: 'Alice', age: 30 };
const result = await cas.put(user);

if (result.success) {
  const address = result.value; // ContentAddress (hash of content)

  // Retrieve content
  const retrieved = await cas.get(address);
  if (retrieved.success) {
    console.log(retrieved.value); // { name: 'Alice', age: 30 }
  }
}
```

## Core Concepts

### Content Address

A **content address** is a cryptographic hash that uniquely identifies content. It's a branded type to prevent accidentally using raw strings:

```typescript
type ContentAddress = string & { readonly __brand: 'ContentAddress' };
```

Content addresses have the format: `algorithm:hash`

Examples:
- `sha256:a1b2c3d4...`
- `sha1:e5f6g7h8...`

### Immutability

Once content is stored, it cannot be modified without changing its address. This guarantees:
- **Integrity**: Content matches its address
- **Verifiability**: Hash can be recomputed to verify content
- **Consistency**: Same content always has same address

### Deduplication

CAS automatically deduplicates content - storing identical data only once:

```typescript
const cas = createInMemoryCAS<string>();

await cas.put('hello'); // Stored
await cas.put('hello'); // Not stored again (same hash)
await cas.put('world'); // Stored (different hash)

const stats = await cas.stats();
console.log(stats.count); // 2 (not 3)
```

## Storage Backends

### In-Memory CAS

Ideal for development, testing, and caching:

```typescript
import { createInMemoryCAS } from '@servicejs/cas';

const cas = createInMemoryCAS<MyType>({
  algorithm: 'sha256', // Default
});

// All data stored in memory (lost on restart)
await cas.put(data);
```

**Pros:**
- Fast (no I/O)
- Simple (no configuration needed)
- Perfect for tests

**Cons:**
- Not persistent
- Limited by available memory

### File-Based CAS

For persistent storage in production:

```typescript
import { createFileCAS } from '@servicejs/cas';

const cas = createFileCAS<MyType>({
  baseDir: './data/cas',
  algorithm: 'sha256',
  createDir: true, // Create directory if missing
});

// Data persists across restarts
await cas.put(data);
```

**Pros:**
- Persistent
- Scalable
- Simple file system layout

**Cons:**
- Slower than memory (I/O overhead)
- Requires Node.js (not browser-compatible)

File layout:
```
data/cas/
  ab/
    cd123456... (file containing content)
  ef/
    gh789012... (file containing content)
```

## API Reference

### CAS Interface

```typescript
interface CAS<T> {
  /**
   * Store content and return its address
   */
  put(content: T): Promise<Result<ContentAddress, CASError>>;

  /**
   * Retrieve content by address
   */
  get(address: ContentAddress): Promise<Result<T, CASError>>;

  /**
   * Check if content exists
   */
  has(address: ContentAddress): Promise<boolean>;

  /**
   * Delete content (optional)
   */
  delete?(address: ContentAddress): Promise<Result<void, CASError>>;

  /**
   * Get hash algorithm
   */
  readonly algorithm: HashAlgorithm;

  /**
   * Get storage statistics
   */
  stats?(): Promise<{
    count: number;
    totalSize: number;
    algorithm: HashAlgorithm;
  }>;
}
```

### Configuration

```typescript
interface CASConfig {
  /**
   * Hash algorithm to use
   * @default 'sha256'
   */
  algorithm?: 'sha256' | 'sha1' | 'blake3';

  /**
   * Custom serializer
   * @default JSON.stringify/parse
   */
  serializer?: {
    serialize: (value: unknown) => string | Uint8Array;
    deserialize: (data: string | Uint8Array) => unknown;
  };
}
```

## Usage Examples

### Basic Usage

```typescript
import { createInMemoryCAS } from '@servicejs/cas';

const cas = createInMemoryCAS<{ title: string; body: string }>();

// Store a blog post
const post = {
  title: 'Hello World',
  body: 'This is my first post'
};

const result = await cas.put(post);

if (result.success) {
  const address = result.value;
  console.log(`Stored at: ${address}`);

  // Retrieve it later
  const retrieved = await cas.get(address);
  if (retrieved.success) {
    console.log(retrieved.value.title); // 'Hello World'
  }
}
```

### Deduplication

```typescript
const cas = createInMemoryCAS<string>();

const addr1 = await cas.put('hello world');
const addr2 = await cas.put('hello world');
const addr3 = await cas.put('goodbye');

// addr1 and addr2 are identical
console.log(addr1.value === addr2.value); // true
console.log(addr1.value === addr3.value); // false

const stats = await cas.stats();
console.log(stats.count); // 2 (not 3)
```

### Large Data Optimization

Store large message payloads in CAS:

```typescript
import { createFileCAS, type ContentAddress } from '@servicejs/cas';

const cas = createFileCAS<Uint8Array>({
  baseDir: './data/attachments'
});

// Instead of sending large data directly
type MessageWithAttachment = {
  type: 'upload';
  filename: string;
  dataAddress: ContentAddress; // Reference, not data
};

// Store large file
const fileData = await readFile('large-file.bin');
const result = await cas.put(fileData);

if (result.success) {
  // Send lightweight message with reference
  const message: MessageWithAttachment = {
    type: 'upload',
    filename: 'large-file.bin',
    dataAddress: result.value
  };

  // Receiver can fetch the data
  const data = await cas.get(message.dataAddress);
}
```

### Custom Serializer

```typescript
import { createInMemoryCAS } from '@servicejs/cas';
import { encode, decode } from '@msgpack/msgpack';

const cas = createInMemoryCAS<MyType>({
  algorithm: 'sha256',
  serializer: {
    serialize: (value) => encode(value),
    deserialize: (data) => decode(data as Uint8Array) as MyType
  }
});
```

### Hash Verification

```typescript
import { computeHash, verifyHash } from '@servicejs/cas';

const content = 'hello world';

// Compute hash
const hashResult = await computeHash(content, 'sha256');

if (hashResult.success) {
  const address = hashResult.value;

  // Verify content matches hash
  const isValid = await verifyHash(content, address);
  console.log(isValid); // true

  const isTampered = await verifyHash('tampered', address);
  console.log(isTampered); // false
}
```

### Statistics

```typescript
const cas = createInMemoryCAS<string>();

await cas.put('hello');
await cas.put('world');
await cas.put('foo');

const stats = await cas.stats();

console.log(`Items: ${stats.count}`);
console.log(`Total size: ${stats.totalSize} bytes`);
console.log(`Algorithm: ${stats.algorithm}`);
```

## Error Handling

All CAS operations return `Result<T, CASError>`:

```typescript
const result = await cas.get(address);

if (result.success) {
  console.log('Got data:', result.value);
} else {
  switch (result.error.type) {
    case 'NOT_FOUND':
      console.error('Content not found:', result.error.address);
      break;
    case 'SERIALIZATION_ERROR':
      console.error('Serialization failed:', result.error.message);
      break;
    case 'STORAGE_ERROR':
      console.error('Storage operation failed:', result.error.message);
      break;
    case 'HASH_ERROR':
      console.error('Hashing failed:', result.error.message);
      break;
  }
}
```

## Use Cases

### 1. Large Message Payloads

Instead of sending large data in messages, store in CAS and send references:

```typescript
// Bad: Large message
capability.send({
  type: 'processImage',
  imageData: largeImageBuffer // 10MB!
});

// Good: Reference in message
const address = await cas.put(largeImageBuffer);
capability.send({
  type: 'processImage',
  imageAddress: address // Just a hash string
});
```

### 2. Event Sourcing

Store immutable events:

```typescript
const eventStore = createFileCAS<Event>({
  baseDir: './data/events'
});

const event = {
  type: 'UserCreated',
  userId: '123',
  timestamp: Date.now(),
  data: { name: 'Alice' }
};

const addr = await eventStore.put(event);
// Event is immutable and can be referenced by address
```

### 3. Caching

Deduplicated cache for computed results:

```typescript
const cache = createInMemoryCAS<ComputedResult>();

async function compute(input: Input): Promise<Result> {
  // Compute hash of input
  const inputHash = await computeHash(JSON.stringify(input));

  // Check cache
  const cached = await cache.get(inputHash.value);
  if (cached.success) {
    return cached.value;
  }

  // Compute result
  const result = expensiveComputation(input);

  // Cache it
  await cache.put(result);

  return result;
}
```

### 4. Data Deduplication

Store large datasets with automatic deduplication:

```typescript
const dataStore = createFileCAS<Document>({
  baseDir: './data/documents'
});

// Many users might upload the same document
const addresses = await Promise.all(
  documents.map(doc => dataStore.put(doc))
);

// Identical documents share same address
// Only stored once on disk
```

## Performance Considerations

### Hash Algorithm Choice

- **SHA-256**: Secure, widely supported, good balance
- **SHA-1**: Faster but less secure (avoid for new projects)
- **BLAKE3**: Fastest, most secure, but less widely supported

### File CAS Directory Structure

File CAS uses 2-character subdirectories to avoid putting too many files in one directory:

```
ab/cd12... (hash starts with ab, cd, 12, ...)
ab/cd34...
ef/gh56...
```

This keeps directories manageable even with millions of files.

### Memory Usage

In-memory CAS stores all content in RAM. For large datasets, use file CAS.

## Testing

```typescript
import { createInMemoryCAS } from '@servicejs/cas';

test('should store and retrieve', async () => {
  const cas = createInMemoryCAS<string>();

  const result = await cas.put('test');
  expect(result.success).toBe(true);

  const retrieved = await cas.get(result.value);
  expect(retrieved.success).toBe(true);
  expect(retrieved.value).toBe('test');
});
```

## Resources

- [ServiceJS Documentation](https://github.com/servicejs/servicejs)
- [Result Type Documentation](../result/README.md)
- [Content Addressing](https://en.wikipedia.org/wiki/Content-addressable_storage)

## License

MIT
