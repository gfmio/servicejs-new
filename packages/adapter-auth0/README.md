# @servicejs/adapter-auth0

Auth0 adapter for ServiceJS providing authentication and authorization via Auth0's OAuth 2.0/OIDC platform.

## Features

- 🔐 **OAuth 2.0 / OIDC Support**: Complete authorization code flow implementation
- 👤 **User Management**: Create, read, update, and delete user profiles
- 🔑 **Multiple Auth Flows**: Password grant, authorization code, refresh token
- 🎫 **Token Management**: Verify, refresh, and revoke tokens
- 🌐 **Management API**: Full access to Auth0 Management API operations
- 📧 **Password Reset**: Built-in password reset functionality
- 🔄 **Token Caching**: Automatic Management API token caching
- ✅ **Type-Safe**: Full TypeScript support with comprehensive types

## Installation

```bash
bun add @servicejs/adapter-auth0
# or
npm install @servicejs/adapter-auth0
```

## Quick Start

```typescript
import { createAuth0Adapter } from '@servicejs/adapter-auth0';
import { isOk } from '@servicejs/result';

// Create adapter
const auth0 = createAuth0Adapter();

// Initialize with your Auth0 configuration
await auth0.init({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret', // Optional for client-side
  audience: 'https://your-api.example.com', // Optional
  scope: 'openid profile email',
});

// Start adapter
await auth0.start();

// Sign up a new user
const signupResult = await auth0.signup({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe',
});

if (isOk(signupResult)) {
  console.log('User created:', signupResult.value.user_id);
}

// Log in
const loginResult = await auth0.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

if (isOk(loginResult)) {
  console.log('Access token:', loginResult.value.access_token);
  console.log('ID token:', loginResult.value.id_token);
}
```

## Configuration

### Auth0AdapterConfig

```typescript
interface Auth0AdapterConfig {
  /** Auth0 domain (e.g., "your-tenant.auth0.com") */
  domain: string;

  /** Client ID for your Auth0 application */
  clientId: string;

  /** Client secret (required for server-side operations) */
  clientSecret?: string;

  /** Audience for API authorization */
  audience?: string;

  /** Scopes to request (default: "openid profile email") */
  scope?: string;

  /** Custom connection name */
  connection?: string;

  /** Token cache TTL in milliseconds (default: 5 minutes) */
  cacheTtl?: number;
}
```

## Authentication

### Sign Up

```typescript
const result = await auth0.signup({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  username: 'johndoe',
  name: 'John Doe',
  user_metadata: {
    preferences: { theme: 'dark' }
  }
});
```

### Login (Password Grant)

```typescript
const result = await auth0.login({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  scope: 'openid profile email offline_access',
  audience: 'https://your-api.example.com',
});

if (isOk(result)) {
  const { access_token, id_token, refresh_token } = result.value;
}
```

### OAuth Authorization Code Flow

```typescript
// 1. Generate authorization URL
const authUrl = auth0.getAuthorizationUrl(
  'http://localhost:3000/callback',
  'random-state-string' // CSRF protection
);

// Redirect user to authUrl

// 2. Handle callback and exchange code for tokens
const result = await auth0.exchangeCode(
  authorizationCode,
  'http://localhost:3000/callback'
);

if (isOk(result)) {
  const { access_token, id_token, refresh_token } = result.value;
}
```

### Password Reset

```typescript
const result = await auth0.resetPassword({
  email: 'user@example.com',
  connection: 'Username-Password-Authentication',
});
```

## Token Management

### Verify Token

```typescript
const result = await auth0.verifyToken({
  token: accessToken,
  audience: 'https://your-api.example.com',
});

if (isOk(result)) {
  console.log('User ID:', result.value.sub);
  console.log('Email:', result.value.email);
}
```

### Refresh Token

```typescript
const result = await auth0.refreshToken(refreshToken);

if (isOk(result)) {
  const newAccessToken = result.value.access_token;
}
```

### Revoke Token

```typescript
await auth0.revokeToken(refreshToken);
```

## User Management

### Get User Profile

```typescript
const result = await auth0.getUser('auth0|123456789');

if (isOk(result)) {
  console.log('User:', result.value.email, result.value.name);
}
```

### Update User

```typescript
const result = await auth0.updateUser({
  userId: 'auth0|123456789',
  name: 'John Updated',
  email_verified: true,
  user_metadata: {
    preferences: { theme: 'light' }
  },
  app_metadata: {
    roles: ['admin']
  },
});
```

### Delete User

```typescript
await auth0.deleteUser('auth0|123456789');
```

## Logout

```typescript
const logoutUrl = auth0.getLogoutUrl('http://localhost:3000/home');
// Redirect user to logoutUrl
```

## Health Check

```typescript
const result = await auth0.health();

if (isOk(result)) {
  console.log('Status:', result.value.status); // 'healthy' | 'unhealthy'
}
```

## Error Handling

All methods return `Result<T, Error>` types for type-safe error handling:

```typescript
const result = await auth0.login({ email, password });

if (isOk(result)) {
  // Success - result.value contains the data
  console.log('Tokens:', result.value);
} else {
  // Error - result.error contains the error
  console.error('Login failed:', result.error.message);
}
```

## Client Secret Requirements

Some operations require a client secret:

- **Required**:
  - User management (getUser, updateUser, deleteUser)
  - Token refresh and revocation
  - Management API operations

- **Optional**:
  - Login (enhances security)
  - Authorization code exchange (server-side apps)
  - Signup and password reset (use public endpoints)

For **client-side applications**, omit the `clientSecret` and use OAuth flows.

For **server-side applications**, always include the `clientSecret` for enhanced security.

## Examples

See the [examples](./examples) directory for:

- [Basic Usage](./examples/basic-usage.ts) - Complete authentication flow
- [OAuth Flow](./examples/oauth-flow.ts) - Authorization code flow implementation

## Testing

```bash
bun test
```

The test suite includes unit tests for all adapter functionality. Integration tests require a real Auth0 tenant and should be run separately with proper credentials.

## Related

- [@servicejs/result](../result) - Result type for error handling
- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Management API](https://auth0.com/docs/api/management/v2)

## License

MIT
