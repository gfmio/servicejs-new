# @servicejs/adapter-casbin

Casbin adapter for ServiceJS providing authorization and access control with support for ACL, RBAC, and ABAC models.

## Features

- 🔐 **Authorization Models**: Support for ACL, RBAC, and ABAC
- 👥 **Role-Based Access Control**: User-role assignments with inheritance
- 🎯 **Policy Enforcement**: Direct, role-based, and wildcard policy matching
- 🔄 **Batch Operations**: Check multiple permissions at once
- 📊 **Policy Queries**: Get all subjects, objects, and actions
- ✅ **Type-Safe**: Full TypeScript support

## Installation

```bash
bun add @servicejs/adapter-casbin
```

## Quick Start

```typescript
import { createCasbinAdapter } from '@servicejs/adapter-casbin';

const casbin = createCasbinAdapter();

await casbin.init({
  model: 'RBAC',
  policy: [
    ['p', 'admin', 'data1', 'read'],
    ['p', 'admin', 'data1', 'write'],
    ['p', 'user', 'data1', 'read'],
    ['g', 'alice', 'admin'],
  ],
});

// Check permission
const result = await casbin.enforce('alice', 'data1', 'write');
if (isOk(result)) {
  console.log('Allowed:', result.value); // true
}
```

## Policy Enforcement

### Basic Enforcement

```typescript
// Check if alice can read data1
const result = await casbin.enforce('alice', 'data1', 'read');
if (isOk(result)) {
  console.log('Allowed:', result.value);
}
```

### Batch Enforcement

```typescript
const results = await casbin.batchEnforce([
  ['alice', 'data1', 'read'],
  ['bob', 'data2', 'write'],
  ['charlie', 'data3', 'delete'],
]);

if (isOk(results)) {
  console.log('Results:', results.value); // [true, false, true]
}
```

### Wildcard Policies

```typescript
// Allow alice to perform any action on data1
await casbin.addPolicy('alice', 'data1', '*');

// Allow bob to read any object
await casbin.addPolicy('bob', '*', 'read');

// Allow admin to do anything
await casbin.addPolicy('admin', '*', '*');
```

## Policy Management

### Add Policy

```typescript
await casbin.addPolicy('alice', 'data1', 'read');
await casbin.addPolicy('bob', 'data2', 'write');
```

### Remove Policy

```typescript
await casbin.removePolicy('alice', 'data1', 'read');
```

### Get All Policies

```typescript
const policies = await casbin.getPolicy();
if (isOk(policies)) {
  console.log('All policies:', policies.value);
  // [['alice', 'data1', 'read'], ['bob', 'data2', 'write']]
}
```

## Role-Based Access Control

### Add Role for User

```typescript
// Add role in default domain
await casbin.addRoleForUser('alice', 'admin');

// Add role with domain
await casbin.addRoleForUser('alice', 'admin', 'domain1');
```

### Get Roles for User

```typescript
const roles = await casbin.getRolesForUser('alice');
if (isOk(roles)) {
  console.log('Roles:', roles.value); // ['admin', 'user']
}

// Get roles for specific domain
const domainRoles = await casbin.getRolesForUser('alice', 'domain1');
```

### Get Users for Role

```typescript
const users = await casbin.getUsersForRole('admin');
if (isOk(users)) {
  console.log('Admin users:', users.value); // ['alice', 'bob']
}
```

### Check if User Has Role

```typescript
const hasRole = await casbin.hasRoleForUser('alice', 'admin');
if (isOk(hasRole)) {
  console.log('Has role:', hasRole.value); // true
}
```

### Delete Role for User

```typescript
await casbin.deleteRoleForUser('alice', 'admin');
```

### Delete All Roles for User

```typescript
await casbin.deleteRolesForUser('alice');
```

## User and Role Management

### Delete User

```typescript
// Removes all policies and roles for user
await casbin.deleteUser('alice');
```

### Delete Role

```typescript
// Removes role policies and all user assignments
await casbin.deleteRole('admin');
```

## Policy Queries

### Get All Subjects

```typescript
const subjects = await casbin.getAllSubjects();
if (isOk(subjects)) {
  console.log('Subjects:', subjects.value); // ['alice', 'bob', 'admin']
}
```

### Get All Objects

```typescript
const objects = await casbin.getAllObjects();
if (isOk(objects)) {
  console.log('Objects:', objects.value); // ['data1', 'data2', 'data3']
}
```

### Get All Actions

```typescript
const actions = await casbin.getAllActions();
if (isOk(actions)) {
  console.log('Actions:', actions.value); // ['read', 'write', 'delete']
}
```

## Configuration

```typescript
await casbin.init({
  // Model type: ACL, RBAC, ABAC, etc.
  model: 'RBAC',

  // Initial policy rules (optional)
  policy: [
    // Policy rules: [type, subject, object, action, ...]
    ['p', 'alice', 'data1', 'read'],
    ['p', 'admin', 'data1', 'write'],

    // Role inheritance: [type, user, role, domain?]
    ['g', 'alice', 'admin'],
    ['g', 'bob', 'user', 'domain1'],
  ],

  // Enable auto-save (default: false)
  autoSave: false,
});
```

## Examples

### ACL Model

```typescript
const casbin = createCasbinAdapter();

await casbin.init({
  model: 'ACL',
  policy: [
    ['p', 'alice', 'data1', 'read'],
    ['p', 'alice', 'data1', 'write'],
    ['p', 'bob', 'data2', 'read'],
  ],
});

// Alice can access data1
const result1 = await casbin.enforce('alice', 'data1', 'read'); // true

// Bob cannot access data1
const result2 = await casbin.enforce('bob', 'data1', 'read'); // false
```

### RBAC Model

```typescript
const casbin = createCasbinAdapter();

await casbin.init({
  model: 'RBAC',
  policy: [
    // Define role permissions
    ['p', 'admin', 'data1', 'read'],
    ['p', 'admin', 'data1', 'write'],
    ['p', 'user', 'data1', 'read'],

    // Assign roles to users
    ['g', 'alice', 'admin'],
    ['g', 'bob', 'user'],
  ],
});

// Alice (admin) can write
const result1 = await casbin.enforce('alice', 'data1', 'write'); // true

// Bob (user) cannot write
const result2 = await casbin.enforce('bob', 'data1', 'write'); // false
```

### Multi-tenancy with Domains

```typescript
await casbin.init({ model: 'RBAC' });

// Add role for user in domain1
await casbin.addRoleForUser('alice', 'admin', 'domain1');

// Add role for user in domain2
await casbin.addRoleForUser('alice', 'user', 'domain2');

// Add policies for each domain
await casbin.addPolicy('admin', 'data1', 'write');
await casbin.addPolicy('user', 'data1', 'read');

// Get roles for specific domain
const domain1Roles = await casbin.getRolesForUser('alice', 'domain1');
// ['admin']

const domain2Roles = await casbin.getRolesForUser('alice', 'domain2');
// ['user']
```

## Testing

```bash
bun test
```

## Note

This adapter uses in-memory storage for demonstration. In production:
- Use a proper database adapter for policy persistence
- Consider using the official Casbin library for advanced features
- Implement policy caching for better performance
- Add audit logging for policy changes

## License

MIT
