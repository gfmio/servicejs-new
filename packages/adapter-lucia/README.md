# @servicejs/adapter-lucia

Lucia adapter for ServiceJS providing lightweight session-based authentication.

## Features

- 🔐 **Session Management**: Create, validate, and invalidate sessions
- 🔑 **Password Authentication**: Secure password hashing and verification
- ⏰ **Session Expiry**: Configurable session and idle timeouts
- 👤 **User Management**: Flexible user attributes
- 🔗 **Key Management**: Support for multiple authentication providers
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-lucia
```

## Quick Start

```typescript
import { createLuciaAdapter } from '@servicejs/adapter-lucia';

const lucia = createLuciaAdapter();

await lucia.init({
  sessionExpiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
  sessionIdleTimeout: 15 * 60 * 1000, // 15 minutes
});

// Create user with password
const user = await lucia.createUser({
  attributes: { email: 'user@example.com' },
  key: {
    providerId: 'email',
    providerUserId: 'user@example.com',
    password: 'SecurePassword123!',
  },
});

// Create session
const session = await lucia.createSession({
  userId: user.value.id,
});
```

## User Management

```typescript
// Create user
const user = await lucia.createUser({
  attributes: {
    email: 'user@example.com',
    username: 'johndoe',
  },
});

// Get user
const user = await lucia.getUser('user-id');

// Update user
await lucia.updateUser('user-id', {
  email: 'newemail@example.com',
});

// Delete user
await lucia.deleteUser('user-id');
```

## Session Management

```typescript
// Create session
const session = await lucia.createSession({
  userId: 'user-id',
  attributes: { device: 'mobile' },
});

// Validate session
const result = await lucia.validateSession('session-id');
if (isOk(result)) {
  console.log('User:', result.value.user);
  console.log('Session:', result.value.session);
}

// Invalidate session
await lucia.invalidateSession('session-id');

// Invalidate all user sessions
await lucia.invalidateAllUserSessions('user-id');
```

## Password Authentication

```typescript
// Create user with password
const user = await lucia.createUser({
  key: {
    providerId: 'email',
    providerUserId: 'user@example.com',
    password: 'password123',
  },
});

// Verify password
const isValid = await lucia.verifyPassword(
  'email',
  'user@example.com',
  'password123'
);

if (isOk(isValid) && isValid.value) {
  // Password is correct
}
```

## Key Management

```typescript
// Create key (for OAuth providers)
await lucia.createKey('user-id', 'google', 'google-user-id');

// Get key
const key = await lucia.getKey('google', 'google-user-id');

// Delete key
await lucia.deleteKey('google', 'google-user-id');
```

## Configuration

```typescript
await lucia.init({
  // Session expires after 30 days (default)
  sessionExpiresIn: 30 * 24 * 60 * 60 * 1000,

  // Session expires after 15 minutes of inactivity
  sessionIdleTimeout: 15 * 60 * 1000,
});
```

## Testing

```bash
bun test
```

## Note

This adapter uses in-memory storage with SHA-256 password hashing for demonstration. In production:
- Use a proper database adapter
- Use bcrypt or argon2 for password hashing
- Configure appropriate session timeouts

## License

MIT
