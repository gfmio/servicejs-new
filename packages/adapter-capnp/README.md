# @servicejs/adapter-capnp

Cap'n Proto RPC adapter for ServiceJS, providing ultra-fast zero-copy serialization, promise pipelining, and Result-based error handling.

## Features

- 🔒 **Type-Safe** - Full TypeScript support with generated types
- 📦 **Result-Based** - Integrate with ServiceJS Result types for error handling
- ⚡ **Ultra-Fast** - Zero-copy serialization for maximum performance
- 🔗 **Promise Pipelining** - Make calls on promises before they resolve
- 🎯 **Efficient** - Minimal memory allocations and CPU usage
- 🌐 **Cross-Language** - Interoperate with C++, Rust, Go, and more

## Installation

```bash
bun add @servicejs/adapter-capnp capnp-ts
```

You'll also need the Cap'n Proto compiler:

```bash
# macOS
brew install capnp

# Ubuntu/Debian
apt-get install capnproto

# Or download from https://capnproto.org/
```

## What is Cap'n Proto?

Cap'n Proto is an insanely fast data serialization format created by Kenton Varda (original author of Protocol Buffers). It's designed to be:

1. **Zero-Copy**: Data can be read directly from the wire without parsing
2. **Fast**: 1000x faster than Protocol Buffers in many cases
3. **Small**: Comparable or smaller message sizes than Protobuf
4. **Type-Safe**: Strong typing with schema evolution support
5. **Promise Pipelining**: Make RPC calls on promises before they resolve

## Quick Start

### 1. Define Your Service (calculator.capnp)

```capnp
@0x9eb32e19f86ee174;

interface Calculator {
  add @0 (a :Int32, b :Int32) -> (result :Int32);
  subtract @1 (a :Int32, b :Int32) -> (result :Int32);
  multiply @2 (a :Int32, b :Int32) -> (result :Int32);
  divide @3 (a :Int32, b :Int32) -> (result :Int32);
}
```

### 2. Generate TypeScript Code

```bash
capnpc -o ts calculator.capnp
```

This generates TypeScript interfaces in `calculator.capnp.ts`.

### 3. Implement the Server

```typescript
import { createCapnpServer } from '@servicejs/adapter-capnp';
import { Calculator } from './calculator.capnp';

const calculatorService = {
  add: async ({ a, b }: { a: number; b: number }) => ({
    result: a + b,
  }),

  subtract: async ({ a, b }: { a: number; b: number }) => ({
    result: a - b,
  }),

  multiply: async ({ a, b }: { a: number; b: number }) => ({
    result: a * b,
  }),

  divide: async ({ a, b }: { a: number; b: number }) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return { result: a / b };
  },
};

const server = createCapnpServer({
  port: 5000,
  schema: Calculator,
  service: calculatorService,
  logging: true,
});

const result = await server.listen();
if (result.ok) {
  console.log('Calculator server running on port 5000');
}
```

### 4. Create a Client

```typescript
import { createCapnpClient } from '@servicejs/adapter-capnp';
import { Calculator } from './calculator.capnp';
import { isOk } from '@servicejs/result';

const client = createCapnpClient({
  host: 'localhost',
  port: 5000,
  schema: Calculator,
});

// Make RPC calls with Result-based error handling
const result = await client.call('add', { a: 10, b: 5 });

if (isOk(result)) {
  console.log('10 + 5 =', result.value.result); // 15
} else {
  console.error('Error:', result.error);
}

await client.close();
```

## Configuration

### Client Configuration

```typescript
interface CapnpClientConfig {
  /**
   * Server host
   */
  host: string;

  /**
   * Server port
   */
  port: number;

  /**
   * Connection timeout in milliseconds
   * @default 5000
   */
  timeout?: number;

  /**
   * Enable promise pipelining
   * @default true
   */
  pipelining?: boolean;

  /**
   * Schema definition
   */
  schema: any;
}
```

### Server Configuration

```typescript
interface CapnpServerConfig {
  /**
   * Server port
   */
  port: number;

  /**
   * Server host
   * @default '0.0.0.0'
   */
  host?: string;

  /**
   * Service implementation
   */
  service: CapnpService;

  /**
   * Schema definition
   */
  schema: any;

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;

  /**
   * Max concurrent requests per connection
   * @default 100
   */
  maxConcurrentRequests?: number;
}
```

## Promise Pipelining

One of Cap'n Proto's most powerful features is **promise pipelining** - the ability to call methods on promises before they resolve.

### Without Pipelining (3 round trips)

```typescript
// Traditional approach - 3 sequential round trips
const user = await client.call('getUser', { id: '123' });
if (!isOk(user)) return;

const profile = await client.call('getProfile', { userId: user.value.id });
if (!isOk(profile)) return;

const posts = await client.call('getPosts', { userId: user.value.id });
if (!isOk(posts)) return;

console.log(posts.value);
```

**Total latency**: 3 × network_latency

### With Pipelining (1 round trip!)

```typescript
// Cap'n Proto approach - all calls in parallel
const posts = client
  .pipeline('getUser', { id: '123' })
  .then('getProfile')
  .then('getPosts');

const result = await posts;
if (isOk(result)) {
  console.log(result.value);
}
```

**Total latency**: 1 × network_latency

This can dramatically reduce latency in microservice architectures!

## Error Handling

All client calls return Result types for safe error handling:

```typescript
const result = await client.call('divide', { a: 10, b: 0 });

if (isOk(result)) {
  console.log('Result:', result.value.result);
} else {
  // Handle error
  console.error('Error:', result.error.message);

  if (result.error.message.includes('Division by zero')) {
    console.log('Cannot divide by zero');
  }
}
```

Server-side errors are automatically propagated:

```typescript
const service = {
  divide: async ({ a, b }: { a: number; b: number }) => {
    if (b === 0) {
      throw new Error('Division by zero'); // Propagated to client
    }
    return { result: a / b };
  },
};
```

## Advanced Features

### Zero-Copy Serialization

Cap'n Proto's zero-copy design means data can be read directly from the wire:

```typescript
import { serialize, deserialize } from '@servicejs/adapter-capnp';

// Serialize
const buffer = serialize(MySchema, { name: 'Alice', age: 30 });

// Deserialize - no parsing needed, direct memory access!
const data = deserialize(MySchema, buffer);
console.log(data.name); // 'Alice'
```

### Schema Evolution

Cap'n Proto supports schema evolution - you can add fields without breaking compatibility:

```capnp
# Version 1
struct User {
  name @0 :Text;
  email @1 :Text;
}

# Version 2 - added age field
struct User {
  name @0 :Text;
  email @1 :Text;
  age @2 :Int32;  # New field - old clients still work!
}
```

Old clients can read messages from new servers and vice versa.

### Complex Data Types

```capnp
@0x9eb32e19f86ee174;

struct Address {
  street @0 :Text;
  city @1 :Text;
  country @2 :Text;
}

struct User {
  id @0 :Text;
  name @1 :Text;
  email @2 :Text;
  address @3 :Address;  # Nested struct
  tags @4 :List(Text);   # List
}

interface UserService {
  getUser @0 (id :Text) -> (user :User);
  listUsers @1 () -> (users :List(User));
  createUser @2 (user :User) -> (id :Text);
}
```

```typescript
const service = {
  getUser: async ({ id }: { id: string }) => ({
    user: {
      id,
      name: 'Alice',
      email: 'alice@example.com',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        country: 'USA',
      },
      tags: ['developer', 'typescript'],
    },
  }),

  listUsers: async () => ({
    users: [
      // ... array of users
    ],
  }),

  createUser: async ({ user }: { user: User }) => {
    const id = crypto.randomUUID();
    await db.saveUser(id, user);
    return { id };
  },
};
```

### Generic Parameters

```capnp
interface Repository(T) {
  get @0 (id :Text) -> (item :T);
  list @1 () -> (items :List(T));
  save @2 (item :T) -> (id :Text);
}

# Instantiate with specific type
interface UserRepository extends Repository(User) {}
```

## Performance Comparison

Based on official Cap'n Proto benchmarks:

| Operation | Cap'n Proto | Protocol Buffers | JSON |
|-----------|-------------|------------------|------|
| Encoding | **5ns** | 1000ns | 2000ns |
| Decoding | **0ns** | 900ns | 2500ns |
| Message Size | **208 bytes** | 228 bytes | 400 bytes |

Cap'n Proto is:
- **1000x faster** than Protobuf for decoding (zero-copy!)
- **200x faster** than Protobuf for encoding
- **Smaller** message sizes than Protobuf
- **5000x faster** than JSON

## Use Cases

Cap'n Proto is ideal for:

1. **High-Performance Microservices**
   - Ultra-low latency requirements
   - High throughput data processing
   - Real-time systems

2. **Distributed Systems**
   - Promise pipelining reduces round trips
   - Efficient serialization reduces bandwidth
   - Cross-language support

3. **Embedded Systems**
   - Minimal memory allocations
   - Zero-copy reduces CPU usage
   - Small message sizes

4. **Data Storage**
   - Can be used as a database format
   - Schema evolution support
   - Compact binary representation

## Best Practices

1. **Use Promise Pipelining**
   - Chain calls whenever possible
   - Reduces latency in microservices
   - Especially valuable for high-latency networks

2. **Design for Zero-Copy**
   - Keep data structures flat when possible
   - Avoid excessive nesting
   - Use lists efficiently

3. **Plan Schema Evolution**
   - Never reuse field numbers
   - Add new fields at the end
   - Use unions for variants

4. **Monitor Performance**
   - Enable logging during development
   - Profile serialization overhead
   - Benchmark against alternatives

5. **Handle Errors Gracefully**
   - Use Result types consistently
   - Provide meaningful error messages
   - Handle connection failures

## Comparison with Other Protocols

| Feature | Cap'n Proto | gRPC | Thrift |
|---------|-------------|------|--------|
| Serialization | Zero-copy | Protobuf | Binary/JSON |
| Speed | Fastest | Very Fast | Fast |
| Promise Pipelining | ✅ Yes | ❌ No | ❌ No |
| Streaming | ✅ Yes | ✅ Yes | ❌ No |
| Browser Support | ❌ No | ✅ Yes (grpc-web) | ❌ No |
| Languages | 5+ | 10+ | 25+ |
| Maturity | Growing | Mature | Very Mature |

## Troubleshooting

### "Cannot find module 'calculator.capnp.ts'"

Make sure you've generated TypeScript code from your schema:
```bash
capnpc -o ts calculator.capnp
```

### "Connection refused"

Ensure the server is running:
```typescript
const result = await server.listen();
if (!isOk(result)) {
  console.error('Server failed to start:', result.error);
}
```

### "Call timeout"

Increase the timeout in client config:
```typescript
const client = createCapnpClient({
  timeout: 10000, // 10 seconds
  // ...
});
```

## Examples

See the `examples/` directory for complete examples:
- `basic-rpc.ts` - Simple calculator service
- `pipelining.ts` - Promise pipelining demo
- `microservices.ts` - Multi-service architecture
- `streaming.ts` - Streaming data patterns

## API Reference

### `createCapnpClient(config)`

Creates a Cap'n Proto RPC client with Result-based error handling.

**Returns:** `CapnpClient` with methods:
- `call(method, request)` - Make an RPC call
- `pipeline(method, request)` - Make a pipelined call
- `close()` - Close the connection
- `isConnected()` - Check connection status

### `createCapnpServer(config)`

Creates a Cap'n Proto RPC server with ServiceJS patterns.

**Returns:** `CapnpServer` with methods:
- `listen()` - Start the server
- `close()` - Stop the server
- `getServer()` - Get the underlying server
- `getConnectionCount()` - Get active connection count

### `serialize(schema, data)`

Serialize data with Cap'n Proto.

### `deserialize(schema, buffer)`

Deserialize data with Cap'n Proto (zero-copy).

## Resources

- [Cap'n Proto Official Site](https://capnproto.org/)
- [Schema Language Guide](https://capnproto.org/language.html)
- [RPC Protocol Spec](https://capnproto.org/rpc.html)
- [Performance Benchmarks](https://capnproto.org/news/2013-03-22-capnproto-0.1-released.html)

## License

MIT
