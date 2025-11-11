# @servicejs/adapter-thrift

Apache Thrift RPC adapter for ServiceJS, providing type-safe RPC communication with automatic serialization/deserialization and Result-based error handling.

## Features

- 🔒 **Type-Safe** - Full TypeScript support with generated types
- 📦 **Result-Based** - Integrate with ServiceJS Result types for error handling
- 🚀 **Fast** - Binary protocol for efficient serialization
- 🔌 **Multiple Protocols** - Binary, JSON, and Compact protocols
- 🌐 **Cross-Language** - Interoperate with services in other languages
- 📝 **IDL Support** - Define services with Thrift IDL

## Installation

```bash
bun add @servicejs/adapter-thrift thrift
```

You'll also need the Thrift compiler to generate code from IDL files:

```bash
# macOS
brew install thrift

# Ubuntu/Debian
apt-get install thrift-compiler

# Or download from https://thrift.apache.org/
```

## Quick Start

### 1. Define Your Service (calculator.thrift)

```thrift
namespace js calculator

exception DivisionByZero {
  1: string message
}

service Calculator {
  i32 add(1: i32 a, 2: i32 b)
  i32 subtract(1: i32 a, 2: i32 b)
  i32 multiply(1: i32 a, 2: i32 b)
  i32 divide(1: i32 a, 2: i32 b) throws (1: DivisionByZero error)
}
```

### 2. Generate Code

```bash
thrift --gen js:node calculator.thrift
```

This generates code in `gen-nodejs/` directory.

### 3. Implement the Server

```typescript
import { createThriftServer } from '@servicejs/adapter-thrift';
import { Calculator } from './gen-nodejs/Calculator';

const calculatorService = {
  add: async (a: number, b: number) => a + b,
  subtract: async (a: number, b: number) => a - b,
  multiply: async (a: number, b: number) => a * b,
  divide: async (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  },
};

const server = createThriftServer({
  port: 9090,
  serviceClass: Calculator.Processor,
  service: calculatorService,
  logging: true,
});

await server.listen();
console.log('Calculator server running on port 9090');
```

### 4. Create a Client

```typescript
import { createThriftClient } from '@servicejs/adapter-thrift';
import { Calculator } from './gen-nodejs/Calculator';
import { isOk } from '@servicejs/result';

const client = createThriftClient<Calculator>({
  host: 'localhost',
  port: 9090,
  serviceClass: Calculator.Client,
});

// Call methods with Result-based error handling
const result = await client.call('add', 10, 5);

if (isOk(result)) {
  console.log('10 + 5 =', result.value); // 15
} else {
  console.error('Error:', result.error);
}

await client.close();
```

## Configuration

### Client Configuration

```typescript
interface ThriftClientConfig {
  /**
   * Server host
   */
  host: string;

  /**
   * Server port
   */
  port: number;

  /**
   * Transport type
   * @default 'buffered'
   */
  transport?: 'buffered' | 'framed';

  /**
   * Protocol type
   * @default 'binary'
   */
  protocol?: 'binary' | 'json' | 'compact';

  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;

  /**
   * Generated service class
   */
  serviceClass: any;
}
```

### Server Configuration

```typescript
interface ThriftServerConfig {
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
   * Transport type
   * @default 'buffered'
   */
  transport?: 'buffered' | 'framed';

  /**
   * Protocol type
   * @default 'binary'
   */
  protocol?: 'binary' | 'json' | 'compact';

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;

  /**
   * Generated service class
   */
  serviceClass: any;

  /**
   * Service implementation
   */
  service: ThriftService;
}
```

## Protocols and Transports

### Protocols

**Binary Protocol** (default, recommended for performance):
```typescript
const client = createThriftClient({
  protocol: 'binary',
  // ...
});
```

**JSON Protocol** (human-readable, debugging):
```typescript
const client = createThriftClient({
  protocol: 'json',
  // ...
});
```

**Compact Protocol** (smaller messages):
```typescript
const client = createThriftClient({
  protocol: 'compact',
  // ...
});
```

### Transports

**Buffered Transport** (default):
```typescript
const client = createThriftClient({
  transport: 'buffered',
  // ...
});
```

**Framed Transport** (for non-blocking servers):
```typescript
const client = createThriftClient({
  transport: 'framed',
  // ...
});
```

## Error Handling

All client calls return Result types for safe error handling:

```typescript
const result = await client.call('divide', 10, 0);

if (isOk(result)) {
  console.log('Result:', result.value);
} else {
  // Handle error
  console.error('Error:', result.error.message);
}
```

Server-side errors are automatically propagated:

```typescript
const service = {
  divide: async (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Division by zero'); // Propagated to client
    }
    return a / b;
  },
};
```

## Advanced Usage

### Custom Exception Types

```thrift
exception InvalidOperation {
  1: i32 code
  2: string message
}

service MyService {
  void doSomething() throws (1: InvalidOperation error)
}
```

```typescript
const service = {
  doSomething: async () => {
    throw new InvalidOperation({
      code: 1,
      message: 'Something went wrong',
    });
  },
};
```

### Struct Types

```thrift
struct User {
  1: string id
  2: string name
  3: string email
}

service UserService {
  User getUser(1: string id)
  list<User> listUsers()
}
```

```typescript
const userService = {
  getUser: async (id: string) => ({
    id,
    name: 'John Doe',
    email: 'john@example.com',
  }),

  listUsers: async () => [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ],
};
```

### Service Inheritance

```thrift
service BaseService {
  string ping()
}

service ExtendedService extends BaseService {
  string echo(1: string message)
}
```

### Async/Promise Support

Both sync and async handlers are supported:

```typescript
const service = {
  // Synchronous
  add: (a: number, b: number) => a + b,

  // Asynchronous
  fetchData: async (id: string) => {
    const data = await database.query(id);
    return data;
  },
};
```

## Complete Example

See `examples/basic-rpc.ts` for a complete working example with:
- Service definition (IDL)
- Code generation
- Server implementation
- Client usage
- Error handling
- Different data types

## Comparison with Other Protocols

| Feature | Thrift | gRPC | Cap'n Proto |
|---------|--------|------|-------------|
| Language Support | 25+ | 10+ | 5+ |
| Protocol | Binary/JSON/Compact | Protocol Buffers | Cap'n Proto |
| Streaming | No | Yes | Yes |
| RPC Style | Traditional | Modern | Promise pipelining |
| Performance | Fast | Very Fast | Fastest |
| Maturity | Very Mature | Mature | Growing |

## Best Practices

1. **Use Binary Protocol in Production**
   - Binary is fastest and most compact
   - Use JSON only for debugging

2. **Define Clear Service Boundaries**
   - Keep services focused and cohesive
   - Use separate IDL files for different domains

3. **Version Your Services**
   - Add version numbers to namespaces
   - Plan for backward compatibility

4. **Handle Errors Gracefully**
   - Define custom exception types in IDL
   - Use Result types for error handling

5. **Use Connection Pooling**
   - For high-throughput scenarios
   - Reuse connections when possible

6. **Monitor Performance**
   - Enable logging during development
   - Disable logging in production

## Troubleshooting

### "Module not found: Calculator"

Make sure you've generated code from your IDL:
```bash
thrift --gen js:node your-service.thrift
```

### "Connection refused"

Ensure the server is running and listening on the correct port:
```typescript
const result = await server.listen();
if (!isOk(result)) {
  console.error('Server failed to start:', result.error);
}
```

### "Thrift version mismatch"

Ensure your Thrift compiler version matches the library version:
```bash
thrift --version  # Should match package.json
```

## API Reference

### `createThriftClient(config)`

Creates a Thrift client with Result-based error handling.

**Returns:** `ThriftClient<T>` with methods:
- `call(method, ...args)` - Call a service method
- `close()` - Close the connection
- `getConnection()` - Get the underlying Thrift connection

### `createThriftServer(config)`

Creates a Thrift server with ServiceJS patterns.

**Returns:** `ThriftServer` with methods:
- `listen()` - Start the server
- `close()` - Stop the server
- `getServer()` - Get the underlying Thrift server

### `wrapThriftService(service)`

Wraps a service implementation with automatic error handling.

## Examples

See the `examples/` directory for complete examples:
- `basic-rpc.ts` - Simple calculator service
- `microservices.ts` - Multi-service architecture
- `data-types.ts` - Working with complex data types

## License

MIT
