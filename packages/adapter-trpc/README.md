# @servicejs/adapter-trpc

tRPC client adapter for ServiceJS - provides end-to-end type-safe RPC with query, mutation, and subscription support.

## Features

- **Type-Safe RPC**: End-to-end type safety for procedures
- **Queries**: Execute queries with automatic type inference
- **Mutations**: Perform mutations with type-safe inputs
- **Subscriptions**: Real-time subscriptions (mock implementation)
- **Error Handling**: Comprehensive error handling with Result types
- **Custom Headers**: Support for authentication and custom headers

## Installation

```bash
npm install @servicejs/adapter-trpc
```

## Usage

### Basic Queries

```typescript
import { createTRPCAdapter } from '@servicejs/adapter-trpc';
import { isOk } from '@servicejs/result';

const adapter = createTRPCAdapter();

await adapter.init({
  url: 'http://localhost:3000/trpc',
  headers: {
    'Authorization': 'Bearer token',
  },
});

const result = await adapter.query('user.getById', { id: '123' });

if (isOk(result)) {
  console.log(result.value);
}
```

### Mutations

```typescript
const result = await adapter.mutate('user.create', {
  name: 'John Doe',
  email: 'john@example.com',
});

if (isOk(result)) {
  console.log('User created:', result.value);
}
```

### Subscriptions

```typescript
const subscribeResult = await adapter.subscribe(
  'user.onChange',
  { userId: '123' },
  (data) => {
    console.log('User changed:', data);
  }
);

if (isOk(subscribeResult)) {
  const unsubscribe = subscribeResult.value;
  // Later: unsubscribe();
}
```

## API Reference

### `createTRPCAdapter()`

Creates a new tRPC adapter instance.

### Methods

#### `init(config: TRPCConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config options:**
- `url`: tRPC endpoint URL
- `headers?`: Optional headers for requests
- `fetchOptions?`: Additional fetch options

#### `query<T>(path: string, input?: any): Promise<Result<T, Error>>`

Execute a tRPC query procedure.

#### `mutate<T>(path: string, input?: any): Promise<Result<T, Error>>`

Execute a tRPC mutation procedure.

#### `subscribe<T>(path: string, input: any, callback: (data: T) => void): Promise<Result<() => void, Error>>`

Subscribe to tRPC updates. Returns an unsubscribe function.

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic queries
- `mutations.ts` - Creating, updating, and deleting data
- `subscriptions.ts` - Real-time subscriptions

## Notes

- This is a simplified implementation suitable for basic tRPC operations
- Uses JSON-RPC 2.0 format for procedure calls
- Subscriptions use a mock implementation; production use should implement WebSocket support
- For full tRPC features, consider using the official @trpc/client
- All operations return `Result<T, Error>` for type-safe error handling

## License

MIT
