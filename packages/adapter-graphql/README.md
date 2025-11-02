# @servicejs/adapter-graphql

GraphQL client adapter for ServiceJS - provides query, mutation, and subscription capabilities for GraphQL APIs.

## Features

- **Query Execution**: Execute GraphQL queries with variables
- **Mutations**: Perform mutations with type safety
- **Subscriptions**: Subscribe to real-time updates (mock implementation)
- **Error Handling**: Comprehensive error handling with Result types
- **Type Safety**: Full TypeScript support with generics
- **Headers Support**: Custom headers for authentication

## Installation

```bash
npm install @servicejs/adapter-graphql
```

## Usage

### Basic Query

```typescript
import { createGraphQLAdapter } from '@servicejs/adapter-graphql';
import { isOk } from '@servicejs/result';

const adapter = createGraphQLAdapter();

await adapter.init({
  endpoint: 'https://api.example.com/graphql',
  headers: {
    'Authorization': 'Bearer token',
  },
});

const result = await adapter.query(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`, { id: '123' });

if (isOk(result)) {
  console.log(result.value.user);
}
```

### Mutations

```typescript
const result = await adapter.mutate(`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`, {
  input: {
    name: 'John Doe',
    email: 'john@example.com',
  },
});
```

### Subscriptions

```typescript
const subscribeResult = await adapter.subscribe(
  `
  subscription OnUserUpdated($userId: ID!) {
    userUpdated(userId: $userId) {
      id
      name
    }
  }
  `,
  { userId: '123' },
  (data) => {
    console.log('User updated:', data.userUpdated);
  }
);

if (isOk(subscribeResult)) {
  const unsubscribe = subscribeResult.value;
  // Later: unsubscribe();
}
```

## API Reference

### `createGraphQLAdapter()`

Creates a new GraphQL adapter instance.

### Methods

#### `init(config: GraphQLConfig): Promise<Result<void, Error>>`

Initialize the adapter with configuration.

**Config options:**
- `endpoint`: GraphQL endpoint URL
- `headers?`: Optional headers for requests
- `fetchOptions?`: Additional fetch options

#### `query<T>(query: string, variables?: Variables): Promise<Result<T, Error>>`

Execute a GraphQL query.

#### `mutate<T>(mutation: string, variables?: Variables): Promise<Result<T, Error>>`

Execute a GraphQL mutation.

#### `subscribe<T>(subscription: string, variables: Variables, callback: (data: T) => void): Promise<Result<() => void, Error>>`

Subscribe to GraphQL updates. Returns an unsubscribe function.

## Examples

See the `examples/` directory for more examples:
- `basic.ts` - Basic queries
- `mutations.ts` - Creating, updating, and deleting data
- `subscriptions.ts` - Real-time subscriptions

## Notes

- This is a simplified implementation suitable for basic GraphQL operations
- Subscriptions use a mock implementation; production use should implement WebSocket support
- For advanced features, consider using dedicated GraphQL clients like Apollo or URQL
- All operations return `Result<T, Error>` for type-safe error handling

## License

MIT
