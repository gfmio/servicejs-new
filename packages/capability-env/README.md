# @servicejs/capability-env

Environment capability for ServiceJS - platform-agnostic environment variable access.

## Overview

This package provides type-safe, platform-independent access to environment variables. It follows ServiceJS's capability-based security model: no ambient authority, all access is explicit.

## Features

- ✅ Platform-agnostic interface
- ✅ Never throws exceptions (returns `Option<string>`)
- ✅ In-memory implementation for testing
- ✅ Immutable environment snapshots
- ✅ TypeScript-first with full type safety

## Installation

```bash
bun add @servicejs/capability-env
```

## Usage

### In-Memory Environment (Testing)

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';

const env = createInMemoryEnv({
  NODE_ENV: 'test',
  API_URL: 'http://localhost:3000',
  API_KEY: 'secret',
});

// Get single variable
const apiKey = env.get('API_KEY'); // Some('secret')
const missing = env.get('MISSING'); // None

// Get all variables
const all = env.getAll(); // { NODE_ENV: 'test', API_URL: ..., API_KEY: ... }

// Platform info
console.log(env.platform); // 'test'
console.log(env.version); // 'in-memory'
```

### With Option Helpers

```typescript
import { createInMemoryEnv } from '@servicejs/capability-env';
import { unwrapOr, map } from '@servicejs/option';

const env = createInMemoryEnv({ PORT: '3000' });

// Provide defaults
const port = unwrapOr(env.get('PORT'), '8080'); // '3000'
const missing = unwrapOr(env.get('MISSING'), 'default'); // 'default'

// Transform values
const portNum = map(env.get('PORT'), parseInt); // Some(3000)
```

### Empty Environment

```typescript
import { createEmptyEnv } from '@servicejs/capability-env';

const env = createEmptyEnv();

env.get('ANY_KEY'); // Always None
env.getAll(); // {}
```

## API

### Types

#### `EnvironmentCapability`

```typescript
interface EnvironmentCapability {
  get(key: string): Option<string>;
  getAll(): Readonly<Record<string, string>>;
  readonly platform: Platform;
  readonly version: string;
}
```

#### `Platform`

```typescript
type Platform =
  | 'node'
  | 'node-worker'
  | 'browser'
  | 'web-worker'
  | 'shared-worker'
  | 'service-worker'
  | 'cloudflare-worker'
  | 'deno'
  | 'bun'
  | 'test';
```

### Functions

#### `createInMemoryEnv(vars?, platform?, version?)`

Creates an in-memory environment capability.

- `vars`: Record<string, string> - Initial environment variables (default: `{}`)
- `platform`: Platform - Platform identifier (default: `'test'`)
- `version`: string - Platform version (default: `'in-memory'`)

#### `createEmptyEnv(platform?)`

Creates an empty environment capability (no variables).

- `platform`: Platform - Platform identifier (default: `'test'`)

## Testing

```typescript
import { test } from 'bun:test';
import { createInMemoryEnv } from '@servicejs/capability-env';
import { isSome } from '@servicejs/option';

test('app uses API key from environment', () => {
  const env = createInMemoryEnv({ API_KEY: 'test-key' });

  const app = createApp({ env });

  const apiKey = env.get('API_KEY');
  expect(isSome(apiKey)).toBe(true);
});
```

## Runtime Implementations

For actual runtime environment access, use the runtime-specific packages:

- `@servicejs/runtime-node` - Node.js (wraps `process.env`)
- `@servicejs/runtime-browser` - Browser (no env vars, returns empty)
- `@servicejs/runtime-deno` - Deno (wraps `Deno.env`)
- `@servicejs/runtime-cloudflare` - Cloudflare Workers (wraps `env` bindings)

## Philosophy

This package follows ServiceJS's core principle of **no ambient authority**. Instead of directly accessing `process.env` or other globals, capabilities are explicitly passed to components.

### Before (Ambient Authority)

```typescript
// ❌ Direct global access
const apiKey = process.env.API_KEY;
```

### After (Capability-Based)

```typescript
// ✅ Explicit capability injection
function createApp(env: EnvironmentCapability) {
  const apiKey = env.get('API_KEY').unwrapOr('default');
}
```

## License

MIT
