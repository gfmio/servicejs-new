# @servicejs/adapter-hono

Hono web framework adapter for ServiceJS, providing a lightweight and fast HTTP server integration with Result-based error handling.

## Features

- 🚀 **Lightweight & Fast** - Built on Hono, one of the fastest web frameworks
- 🔒 **Type-Safe** - Full TypeScript support with generics
- 📦 **Result-Based** - Integrate with ServiceJS Result types for error handling
- 🎯 **Simple API** - Easy-to-use route configuration
- 🔌 **Middleware Support** - CORS, auth, logging, and custom middleware
- 🌐 **Multi-Runtime** - Works with Bun, Cloudflare Workers, Deno, and Node.js

## Installation

```bash
bun add @servicejs/adapter-hono hono
```

## Quick Start

```typescript
import { createHonoAdapter, parsers } from '@servicejs/adapter-hono';
import { ok, err } from '@servicejs/result';

const app = createHonoAdapter({
  autoErrorResponse: true,
  logging: true,
});

// Add routes
app.addRoute({
  method: 'GET',
  path: '/hello',
  handler: async () => ok({ message: 'Hello, World!' }),
});

app.addRoute({
  method: 'POST',
  path: '/users',
  handler: async (data: { name: string; email: string }) => {
    const user = await createUser(data);
    return ok(user);
  },
  parseInput: parsers.json,
});

// Start server
await app.listen(3000);
```

## Route Configuration

### Basic Routes

```typescript
app.addRoute({
  method: 'GET',
  path: '/users/:id',
  handler: async (data: { id: string }) => {
    const user = await getUserById(data.id);
    if (!user) return err(new Error('User not found'));
    return ok(user);
  },
  parseInput: parsers.params,
});
```

### Input Parsing

The adapter provides several built-in parsers:

```typescript
import { parsers } from '@servicejs/adapter-hono';

// Parse JSON body
parseInput: parsers.json

// Parse route parameters
parseInput: parsers.params

// Parse query string
parseInput: parsers.query

// Combine body and params
parseInput: parsers.bodyAndParams

// Combine body, params, and query
parseInput: parsers.all

// Custom parser
parseInput: async (c) => ({
  id: c.req.param('id'),
  data: await c.req.json(),
})
```

### Response Formatting

```typescript
app.addRoute({
  method: 'GET',
  path: '/user',
  handler: async () => ok({ id: 1, name: 'John', password: 'secret' }),
  formatOutput: (data) => ({
    id: data.id,
    name: data.name,
    // Omit sensitive fields
  }),
});
```

## Service Handlers

Create reusable service handlers with automatic error handling:

```typescript
import { createServiceHandler } from '@servicejs/adapter-hono';

const getUser = createServiceHandler(async (input: { id: string }) => {
  const user = await db.users.findById(input.id);
  if (!user) throw new Error('User not found');
  return user;
});

app.addRoute({
  method: 'GET',
  path: '/users/:id',
  handler: getUser,
  parseInput: parsers.params,
});
```

## Middleware

### Built-in Middleware

```typescript
import { middleware } from '@servicejs/adapter-hono';

// CORS
app.useGlobal(middleware.cors({
  origin: 'https://example.com',
  credentials: true,
}));

// Request ID
app.useGlobal(middleware.requestId());

// Timing
app.useGlobal(middleware.timing());
```

### Custom Middleware

```typescript
import type { MiddlewareHandler } from 'hono';

const auth: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('Authorization');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
};

app.use('/admin/*', auth);
```

## Error Handling

### Automatic Error Responses

```typescript
const app = createHonoAdapter({
  autoErrorResponse: true,
  errorStatusCode: 400,
  errorFormatter: (error) => ({
    error: error.message,
    code: 'VALIDATION_ERROR',
    timestamp: new Date().toISOString(),
  }),
});
```

### Manual Error Handling

```typescript
app.addRoute({
  method: 'GET',
  path: '/user/:id',
  handler: async (data: { id: string }) => {
    const user = await getUserById(data.id);

    // Return error result
    if (!user) {
      return err(new Error('User not found'));
    }

    // Return success result
    return ok(user);
  },
  parseInput: parsers.params,
});
```

## Configuration

```typescript
interface HonoAdapterConfig {
  /**
   * Enable automatic error responses
   * @default true
   */
  autoErrorResponse?: boolean;

  /**
   * Default status code for errors
   * @default 500
   */
  errorStatusCode?: number;

  /**
   * Enable request logging
   * @default false
   */
  logging?: boolean;

  /**
   * Custom error formatter
   */
  errorFormatter?: (error: Error) => unknown;
}
```

## Complete Example

```typescript
import { createHonoAdapter, parsers, middleware } from '@servicejs/adapter-hono';
import { ok, err } from '@servicejs/result';

const app = createHonoAdapter({
  autoErrorResponse: true,
  logging: true,
});

// Middleware
app.useGlobal(middleware.cors());
app.useGlobal(middleware.requestId());
app.useGlobal(middleware.timing());

// Routes
app.addRoute({
  method: 'GET',
  path: '/users',
  handler: async () => {
    const users = await db.users.findAll();
    return ok(users);
  },
});

app.addRoute({
  method: 'POST',
  path: '/users',
  handler: async (data: { name: string; email: string }) => {
    // Validation
    if (!data.name || !data.email) {
      return err(new Error('Name and email are required'));
    }

    const user = await db.users.create(data);
    return ok(user);
  },
  parseInput: parsers.json,
});

app.addRoute({
  method: 'GET',
  path: '/users/:id',
  handler: async (data: { id: string }) => {
    const user = await db.users.findById(data.id);
    if (!user) return err(new Error('User not found'));
    return ok(user);
  },
  parseInput: parsers.params,
});

// Start server
await app.listen(3000);
```

## Deployment

### Bun

```typescript
// server.ts
import { createHonoAdapter } from '@servicejs/adapter-hono';

const app = createHonoAdapter();
// ... configure routes

await app.listen(3000);
```

```bash
bun run server.ts
```

### Cloudflare Workers

```typescript
import { createHonoAdapter } from '@servicejs/adapter-hono';

const app = createHonoAdapter();
// ... configure routes

export default app.getApp();
```

### Deno

```typescript
import { createHonoAdapter } from 'npm:@servicejs/adapter-hono';

const app = createHonoAdapter();
// ... configure routes

export default app.getApp();
```

## API Reference

### `createHonoAdapter(config?)`

Creates a new Hono adapter instance.

**Returns:** Adapter with the following methods:
- `addRoute(config)` - Add a route with a service handler
- `use(path, middleware)` - Add path-specific middleware
- `useGlobal(middleware)` - Add global middleware
- `getApp()` - Get the underlying Hono app
- `listen(port)` - Start the server (Bun only)

### `createServiceHandler(fn)`

Wraps a function in automatic error handling with Result types.

### `parsers`

Built-in input parsers:
- `parsers.json` - Parse JSON body
- `parsers.params` - Parse route parameters
- `parsers.query` - Parse query string
- `parsers.bodyAndParams` - Combine body and params
- `parsers.all` - Combine body, params, and query

### `middleware`

Built-in middleware:
- `middleware.cors(options)` - CORS headers
- `middleware.requestId()` - Add request ID
- `middleware.timing()` - Add response time header

## Examples

See the `examples/` directory for complete examples:
- `basic-api.ts` - Simple REST API
- `advanced-patterns.ts` - Advanced patterns with validation, auth, and middleware

## License

MIT
