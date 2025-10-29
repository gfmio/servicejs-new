# @servicejs/adapter-supertokens

SuperTokens adapter for ServiceJS providing open-source authentication with EmailPassword, Passwordless, and multi-tenancy support.

## Features

- 🔐 **EmailPassword Authentication**: Traditional email/password auth
- 📱 **Passwordless**: Email and phone number authentication
- 🏢 **Multi-tenancy**: Built-in tenant support
- 🔑 **Session Management**: Create, verify, and revoke sessions
- 🔄 **Password Reset**: Token-based password reset flow
- 👤 **User Management**: Complete CRUD operations
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-supertokens
```

## Quick Start

```typescript
import { createSuperTokensAdapter } from '@servicejs/adapter-supertokens';
import { isOk } from '@servicejs/result';

const supertokens = createSuperTokensAdapter();

await supertokens.init({
  connectionURI: 'http://localhost:3567',
  apiKey: 'your-api-key',
});

// Create user
const result = await supertokens.createEmailPasswordUser({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

if (isOk(result)) {
  console.log('User ID:', result.value.id);
}
```

## User Management

### Email/Password Users

```typescript
// Create
const user = await supertokens.createEmailPasswordUser({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  tenantId: 'public',
});

// Sign in
const result = await supertokens.signIn({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

// Update
await supertokens.updateUser({
  userId: 'user_123',
  email: 'newemail@example.com',
  password: 'NewPassword123!',
});
```

### Passwordless Users

```typescript
// Email-based
const user = await supertokens.createPasswordlessUser({
  email: 'user@example.com',
});

// Phone-based
const user = await supertokens.createPasswordlessUser({
  phoneNumber: '+1234567890',
});
```

### Get Users

```typescript
// By ID
const user = await supertokens.getUser('user_123');

// By email
const user = await supertokens.getUserByEmail('user@example.com');
```

## Session Management

```typescript
// Create session
const session = await supertokens.createSession({
  userId: 'user_123',
  userDataInAccessToken: { role: 'admin' },
  userDataInDatabase: { lastLogin: Date.now() },
});

// Verify session
const verified = await supertokens.verifySession({
  sessionHandle: session.value.handle,
  enableAntiCsrfCheck: true,
});

// Get all sessions for user
const sessions = await supertokens.getAllSessionsForUser('user_123');

// Revoke session
await supertokens.revokeSession('session_handle');

// Revoke all sessions
await supertokens.revokeAllSessions('user_123');
```

## Password Reset

```typescript
// Create reset token
const tokenResult = await supertokens.createResetPasswordToken('user_123');

if (isOk(tokenResult)) {
  // Send token to user via email
  console.log('Reset token:', tokenResult.value.token);

  // Reset password
  await supertokens.resetPasswordUsingToken(
    tokenResult.value.token,
    'NewPassword123!'
  );
}
```

## Multi-tenancy

```typescript
// Create user in specific tenant
await supertokens.createEmailPasswordUser({
  email: 'user@example.com',
  password: 'password123',
  tenantId: 'tenant1',
});

// Sign in to specific tenant
await supertokens.signIn({
  email: 'user@example.com',
  password: 'password123',
  tenantId: 'tenant1',
});
```

## Testing

```bash
bun test
```

## Related

- [@servicejs/result](../result) - Result type for error handling
- [SuperTokens Documentation](https://supertokens.com/docs)

## License

MIT
