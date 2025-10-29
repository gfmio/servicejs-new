# @servicejs/adapter-keycloak

Keycloak adapter for ServiceJS providing enterprise SSO with Admin REST API support.

## Features

- 👤 **User Management**: CRUD operations with roles and groups
- 🏢 **Enterprise SSO**: Complete Keycloak Admin API integration
- 🔑 **Role-Based Access**: Assign and manage user roles
- 👥 **Group Management**: Organize users into groups
- 📧 **Email Actions**: Send verification and password reset emails
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-keycloak
```

## Quick Start

```typescript
import { createKeycloakAdapter } from '@servicejs/adapter-keycloak';

const keycloak = createKeycloakAdapter();

await keycloak.init({
  serverUrl: 'http://localhost:8080',
  realm: 'master',
  clientId: 'admin-cli',
  clientSecret: 'your-secret',
});

// Create user
const userId = await keycloak.createUser({
  username: 'johndoe',
  email: 'john@example.com',
  credentials: [{
    type: 'password',
    value: 'password123',
    temporary: false,
  }],
});
```

## User Management

```typescript
// List users
const users = await keycloak.listUsers({ max: 10, search: 'john' });

// Get by username
const user = await keycloak.getUserByUsername('johndoe');

// Update
await keycloak.updateUser({
  userId: 'user-id',
  email: 'newemail@example.com',
});

// Delete
await keycloak.deleteUser('user-id');
```

## Roles & Groups

```typescript
// Get user roles
const roles = await keycloak.getUserRoles('user-id');

// Assign role
await keycloak.assignRole('user-id', 'role-id', 'admin');

// Get user groups
const groups = await keycloak.getUserGroups('user-id');

// Join group
await keycloak.joinGroup('user-id', 'group-id');
```

## Email Actions

```typescript
// Send verification email
await keycloak.sendVerifyEmail('user-id');

// Send password reset
await keycloak.resetPassword('user-id');
```

## Testing

```bash
bun test
```

## License

MIT
