# @servicejs/server-cloudflare-workers

Comprehensive Cloudflare Workers server adapter for ServiceJS with support for HTTP/fetch handlers, Durable Objects, RPC, scheduled events, and queue consumers.

## Installation

```bash
npm install @servicejs/server-cloudflare-workers
```

## Features

- 🌐 **HTTP/Fetch Handler** - Request/Response abstraction with environment bindings
- 🔒 **Durable Objects** - Stateful edge objects with lifecycle management
- 📡 **Workers RPC** - Type-safe RPC between workers via service bindings
- ⏰ **Scheduled Events** - Cron trigger handlers for background jobs
- 📬 **Queue Consumers** - Batch message processing with automatic acknowledgment
- 🛡️ **Type Safety** - Full TypeScript support with generics
- ✨ **ServiceJS Patterns** - Result types and capability-based design

## Quick Start

### HTTP/Fetch Handler

```typescript
import { createFetchHandler } from '@servicejs/server-cloudflare-workers';

interface Env {
  KV: KVNamespace;
  DB: D1Database;
}

const handler = createFetchHandler<Env>();
await handler.init();

handler.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  if (url.pathname === '/api/users') {
    const users = await env.DB.prepare('SELECT * FROM users').all();

    return {
      statusCode: 200,
      body: JSON.stringify(users),
      headers: { 'Content-Type': 'application/json' },
    };
  }

  return {
    statusCode: 404,
    body: 'Not found',
  };
});

export default {
  fetch: (req, env, ctx) => handler.handleFetch(req, env, ctx),
};
```

### Durable Objects

```typescript
import { ServiceDurableObject } from '@servicejs/server-cloudflare-workers';

export class Counter extends ServiceDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    // Initialize on first request
    this.onInit(async (state) => {
      const count = await state.storage.get<number>('count') || 0;
      console.log('Counter initialized:', count);
    });

    // Handle requests
    this.onFetch(async (request, env, ctx) => {
      const url = new URL(request.url);

      if (url.pathname === '/increment') {
        const count = await this.state.storage.get<number>('count') || 0;
        const newCount = count + 1;
        await this.state.storage.put('count', newCount);

        return {
          statusCode: 200,
          body: JSON.stringify({ count: newCount }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      if (url.pathname === '/get') {
        const count = await this.state.storage.get<number>('count') || 0;
        return {
          statusCode: 200,
          body: JSON.stringify({ count }),
          headers: { 'Content-Type': 'application/json' },
        };
      }

      return {
        statusCode: 404,
        body: 'Not found',
      };
    });

    // Handle alarms
    this.onAlarm(async (env) => {
      console.log('Alarm triggered, resetting counter');
      await this.state.storage.put('count', 0);
    });
  }
}
```

### Workers RPC

```typescript
// Define your RPC service interface
interface UserService {
  getUser(id: string): Promise<User>;
  createUser(name: string, email: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

// In the worker that provides the service:
import { createRPCService } from '@servicejs/server-cloudflare-workers';

const userService: UserService = {
  async getUser(id: string) {
    return await db.getUser(id);
  },

  async createUser(name: string, email: string) {
    return await db.createUser({ name, email });
  },

  async deleteUser(id: string) {
    await db.deleteUser(id);
  },
};

const rpcHandler = createRPCService(userService);

export default {
  fetch: (req, env, ctx) => rpcHandler.handleRPC(req, env, ctx),
};

// In the worker that calls the service:
import { createRPCClient } from '@servicejs/server-cloudflare-workers';
import { isOk } from '@servicejs/result';

interface Env {
  USER_SERVICE: Service<UserService>;
}

const client = createRPCClient<UserService>(env.USER_SERVICE);

const userResult = await client.call('getUser', '123');
if (isOk(userResult)) {
  console.log('User:', userResult.value);
}
```

### Scheduled Events (Cron)

```typescript
import { createScheduledHandler } from '@servicejs/server-cloudflare-workers';

const handler = createScheduledHandler<Env>();
await handler.init();

handler.onScheduled(async (event, env, ctx) => {
  console.log(`Cron job triggered at ${new Date(event.scheduledTime)}`);
  console.log(`Cron pattern: ${event.cron}`);

  // Perform cleanup, send reports, etc.
  await cleanupOldData(env);
});

export default {
  scheduled: (controller, env, ctx) => handler.handleScheduled(controller, env, ctx),
};
```

In your `wrangler.toml`:

```toml
[triggers]
crons = ["0 0 * * *"]  # Daily at midnight
```

### Queue Consumers

```typescript
import { createQueueHandler } from '@servicejs/server-cloudflare-workers';

interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

const handler = createQueueHandler<Env, EmailMessage>();
await handler.init({ maxRetries: 3 });

handler.onQueue(async (batch, env, ctx) => {
  console.log(`Processing ${batch.messages.length} messages from ${batch.queue}`);

  for (const message of batch.messages) {
    try {
      await sendEmail(message.body, env);
      console.log(`Sent email to ${message.body.to}`);
    } catch (error) {
      console.error(`Failed to send email:`, error);
      throw error; // Will trigger retry
    }
  }
});

export default {
  queue: (batch, env, ctx) => handler.handleQueue(batch, env, ctx),
};
```

In your `wrangler.toml`:

```toml
[[queues.consumers]]
queue = "email-queue"
max_batch_size = 10
max_batch_timeout = 5
```

## Complete Example: All Features Combined

```typescript
import {
  createFetchHandler,
  createScheduledHandler,
  createQueueHandler,
  ServiceDurableObject,
  createRPCClient,
  isOk,
} from '@servicejs/server-cloudflare-workers';

interface Env {
  COUNTER: DurableObjectNamespace;
  EMAIL_QUEUE: Queue<EmailMessage>;
  USER_SERVICE: Service<UserService>;
  KV: KVNamespace;
}

// HTTP Handler
const fetchHandler = createFetchHandler<Env>();
fetchHandler.onFetch(async (request, env, ctx) => {
  const url = new URL(request.url);

  if (url.pathname === '/counter') {
    const id = env.COUNTER.idFromName('global');
    const stub = env.COUNTER.get(id);
    return await stub.fetch(request);
  }

  if (url.pathname === '/user') {
    const userId = url.searchParams.get('id');
    const userClient = createRPCClient<UserService>(env.USER_SERVICE);
    const result = await userClient.call('getUser', userId);

    if (isOk(result)) {
      return {
        statusCode: 200,
        body: JSON.stringify(result.value),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    return {
      statusCode: 500,
      body: result.error.message,
    };
  }

  return { statusCode: 404, body: 'Not found' };
});

// Scheduled Handler
const scheduledHandler = createScheduledHandler<Env>();
scheduledHandler.onScheduled(async (event, env, ctx) => {
  console.log('Daily cleanup job running');
  await performCleanup(env);
});

// Queue Handler
const queueHandler = createQueueHandler<Env, EmailMessage>();
queueHandler.onQueue(async (batch, env, ctx) => {
  for (const msg of batch.messages) {
    await sendEmail(msg.body);
  }
});

// Durable Object
export class Counter extends ServiceDurableObject<Env> {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);

    this.onFetch(async (request) => {
      const count = await this.state.storage.get<number>('count') || 0;
      const newCount = count + 1;
      await this.state.storage.put('count', newCount);

      return {
        statusCode: 200,
        body: JSON.stringify({ count: newCount }),
        headers: { 'Content-Type': 'application/json' },
      };
    });
  }
}

// Export handlers
export default {
  fetch: (req, env, ctx) => fetchHandler.handleFetch(req, env, ctx),
  scheduled: (controller, env, ctx) => scheduledHandler.handleScheduled(controller, env, ctx),
  queue: (batch, env, ctx) => queueHandler.handleQueue(batch, env, ctx),
};

export { Counter };
```

## API Reference

### Fetch Handler

#### `createFetchHandler<Env>()`

Creates an HTTP/fetch event handler.

**Methods:**
- `init(config?)` - Initialize with optional config
- `onFetch(handler)` - Register request handler
- `onError(handler)` - Register error handler
- `handleFetch(request, env, ctx)` - Handle fetch event

### Durable Objects

#### `ServiceDurableObject<Env>`

Base class for Durable Objects with ServiceJS patterns.

**Protected Methods:**
- `onInit(handler)` - Register initialization handler
- `onFetch(handler)` - Register fetch handler
- `onAlarm(handler)` - Register alarm handler
- `onError(handler)` - Register error handler

**Public Methods:**
- `scheduleAlarm(time)` - Schedule an alarm
- `getAlarm()` - Get current alarm time
- `deleteAlarm()` - Delete scheduled alarm

### RPC

#### `createRPCClient<T>(binding)`

Create a type-safe RPC client for service bindings.

**Methods:**
- `call(method, ...args)` - Call remote method, returns `Result<T, Error>`

#### `createRPCService<T>(service)`

Create an RPC service handler.

**Methods:**
- `handleRPC(request, env, ctx)` - Handle RPC requests

### Scheduled Events

#### `createScheduledHandler<Env>()`

Create a cron trigger handler.

**Methods:**
- `init(config?)` - Initialize with optional config
- `onScheduled(handler)` - Register scheduled event handler
- `onError(handler)` - Register error handler
- `handleScheduled(controller, env, ctx)` - Handle scheduled event

### Queue Consumers

#### `createQueueHandler<Env, Body>()`

Create a queue consumer handler.

**Methods:**
- `init(config?)` - Initialize with optional config (maxRetries, autoRetry)
- `onQueue(handler)` - Register queue batch handler
- `onError(handler)` - Register error handler
- `handleQueue(batch, env, ctx)` - Handle queue batch

## Integration with Existing Adapters

This package works seamlessly with existing Cloudflare adapters:

- `@servicejs/adapter-cloudflare-kv` - Key-Value storage
- `@servicejs/adapter-cloudflare-queues` - Message queues
- `@servicejs/adapter-r2` - Object storage
- `@servicejs/adapter-cloudflare-d1` - SQL database
- `@servicejs/adapter-cloudflare-ai` - AI models

## Testing

Use Wrangler or Miniflare for local testing:

```bash
npm install -D wrangler
wrangler dev
```

## License

MIT
