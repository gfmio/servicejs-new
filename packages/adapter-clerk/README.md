# @servicejs/adapter-clerk

Clerk adapter for ServiceJS providing modern authentication with pre-built UI components and comprehensive Backend API support.

## Features

- 👤 **User Management**: Complete CRUD operations for users
- 🔐 **Session Management**: Create, verify, and revoke sessions
- 🎫 **Token Operations**: Create and verify session tokens
- 🚫 **User Moderation**: Ban, unban, lock, and unlock users
- 📋 **Advanced Filtering**: List users with multiple filter options
- 📱 **Multi-factor**: Support for email, phone, and Web3 authentication
- ✅ **Type-Safe**: Full TypeScript support with Clerk's complete type definitions

## Installation

```bash
bun add @servicejs/adapter-clerk
```

## Quick Start

```typescript
import { createClerkAdapter } from '@servicejs/adapter-clerk';
import { isOk } from '@servicejs/result';

const clerk = createClerkAdapter();

await clerk.init({
  secretKey: 'sk_test_...',
});

await clerk.start();

// Create user
const result = await clerk.createUser({
  email_address: ['user@example.com'],
  first_name: 'John',
  last_name: 'Doe',
  password: 'SecurePassword123!',
});

if (isOk(result)) {
  console.log('User ID:', result.value.id);
}
```

## Configuration

```typescript
interface ClerkAdapterConfig {
  secretKey: string;              // Required: Clerk Secret Key (sk_...)
  publishableKey?: string;        // Optional: Clerk Publishable Key (pk_...)
  apiVersion?: string;            // Optional: API version (default: "v1")
  apiUrl?: string;                // Optional: Custom API URL
}
```

## User Management

### Create User

```typescript
const result = await clerk.createUser({
  email_address: ['user@example.com'],
  phone_number: ['+1234567890'],
  username: 'johndoe',
  first_name: 'John',
  last_name: 'Doe',
  password: 'SecurePassword123!',
  public_metadata: { plan: 'pro' },
  private_metadata: { internal_id: '123' },
});
```

### Get User

```typescript
const result = await clerk.getUser('user_abc123');
```

### List Users

```typescript
const result = await clerk.listUsers({
  limit: 20,
  offset: 0,
  email_address: ['user@example.com'],
  query: 'john',
  order_by: '-created_at',
});
```

### Update User

```typescript
const result = await clerk.updateUser({
  userId: 'user_abc123',
  first_name: 'Jane',
  public_metadata: { plan: 'enterprise' },
});
```

### Delete User

```typescript
await clerk.deleteUser('user_abc123');
```

## User Moderation

```typescript
// Ban user
await clerk.banUser('user_abc123');

// Unban user
await clerk.unbanUser('user_abc123');

// Lock user
await clerk.lockUser('user_abc123');

// Unlock user
await clerk.unlockUser('user_abc123');
```

## Session Management

### Get Session

```typescript
const result = await clerk.getSession('sess_abc123');
```

### Get User Sessions

```typescript
const result = await clerk.getUserSessions('user_abc123');
```

### Revoke Session

```typescript
await clerk.revokeSession('sess_abc123');
```

### Verify Token

```typescript
const result = await clerk.verifyToken({
  token: 'session-token',
});

if (isOk(result)) {
  console.log('User ID:', result.value.user_id);
  console.log('Status:', result.value.status);
}
```

### Create Token

```typescript
const result = await clerk.createToken({
  userId: 'user_abc123',
  expiresInSeconds: 3600,
});

if (isOk(result)) {
  console.log('Token:', result.value.token);
}
```

## Error Handling

All methods return `Result<T, Error>` for type-safe error handling:

```typescript
const result = await clerk.getUser('user_123');

if (isOk(result)) {
  console.log('User:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

## Health Check

```typescript
const result = await clerk.health();

if (isOk(result)) {
  console.log('Status:', result.value.status); // 'healthy' | 'unhealthy'
}
```

## Testing

```bash
bun test
```

## Related

- [@servicejs/result](../result) - Result type for error handling
- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Backend API](https://clerk.com/docs/reference/backend-api)

## License

MIT
