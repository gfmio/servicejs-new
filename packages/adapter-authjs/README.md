# @servicejs/adapter-authjs

Auth.js (NextAuth) adapter for ServiceJS providing authentication for Next.js applications.

## Features

- 👤 **User Management**: In-memory user storage with email indexing
- 🔐 **Session Management**: Create, verify, and revoke sessions
- 🔗 **Account Linking**: Link OAuth providers to users
- ⏰ **Session Expiry**: Automatic session expiration handling
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-authjs
```

## Quick Start

```typescript
import { createAuthJSAdapter } from '@servicejs/adapter-authjs';

const authjs = createAuthJSAdapter();

await authjs.init({
  baseUrl: 'http://localhost:3000',
  secret: 'your-secret-key',
});

// Create user
const user = await authjs.createUser({
  email: 'user@example.com',
  name: 'John Doe',
});

// Create session
const session = await authjs.createSession({
  userId: user.value.id,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
});
```

## User Management

```typescript
// Create user
const user = await authjs.createUser({
  email: 'user@example.com',
  name: 'John Doe',
  image: 'https://example.com/avatar.jpg',
});

// Get user
const user = await authjs.getUser('user-id');

// Get by email
const user = await authjs.getUserByEmail('user@example.com');

// Update user
await authjs.updateUser('user-id', {
  name: 'Jane Doe',
  emailVerified: new Date(),
});

// Delete user
await authjs.deleteUser('user-id');
```

## Session Management

```typescript
// Create session
const session = await authjs.createSession({
  userId: 'user-id',
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
});

// Get session and user
const result = await authjs.getSessionAndUser('session-token');

// Update session
await authjs.updateSession('session-token', {
  expires: new Date(Date.now() + 48 * 60 * 60 * 1000),
});

// Delete session
await authjs.deleteSession('session-token');
```

## Account Linking

```typescript
// Link OAuth account
await authjs.linkAccount({
  userId: 'user-id',
  type: 'oauth',
  provider: 'google',
  providerAccountId: 'google-user-id',
  access_token: 'token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

// Unlink account
await authjs.unlinkAccount('google', 'google-user-id');
```

## Testing

```bash
bun test
```

## Note

This adapter uses in-memory storage for demonstration purposes. In production, use this with a database adapter (Prisma, Kysely, etc.) for persistent storage.

## License

MIT
