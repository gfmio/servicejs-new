# @servicejs/integration-server

Server adapter interfaces for ServiceJS - HTTP, WebSocket, and TCP server integrations.

## Overview

This package provides interfaces for creating server adapters in ServiceJS. It defines standard patterns for HTTP servers, WebSocket servers, and TCP servers with lifecycle management, request/response handling, and health monitoring.

## Features

- **HTTP Server Support**: Request/response pattern for HTTP servers
- **WebSocket Support**: Bidirectional connection handling
- **TCP Server Support**: Low-level TCP connection management
- **Standard Lifecycle**: init, start, stop, destroy
- **Health Monitoring**: Built-in health checks
- **Type Safety**: Fully typed with TypeScript

## Installation

```bash
bun add @servicejs/integration-server
```

## Usage

### Creating an HTTP Server Adapter

```typescript
import { createServerAdapter, type ServerAdapter } from '@servicejs/integration-server';
import { ok, err } from '@servicejs/result';

const server = createServerAdapter(
  {
    name: 'my-http-server',
    version: '1.0.0',
    type: 'server',
    platforms: ['node', 'bun'],
    description: 'My HTTP server',
  },
  {
    onInit: async (config) => {
      // Initialize server
      return ok(undefined);
    },
    onStart: async () => {
      // Start listening
      return ok(undefined);
    },
    onStop: async () => {
      // Stop server
      return ok(undefined);
    },
    onHealth: async () => {
      return ok({ status: 'healthy' });
    },
  }
);

// Register request handler
server.onRequest?.(async (req) => {
  return {
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    body: { message: 'Hello World' },
  };
});

// Use the server
await server.init({ port: 3000 });
await server.start();
```

### Example HTTP Server with Routing

```typescript
import { createSimpleHttpServer } from '@servicejs/integration-server';

const server = createSimpleHttpServer();

await server.init({ port: 3000 });
await server.start();

server.onRequest?.(async (req) => {
  // Simple routing
  if (req.url === '/' && req.method === 'GET') {
    return {
      status: 200,
      headers: new Map([['content-type', 'text/plain']]),
      body: 'Hello World',
    };
  }

  if (req.url === '/api/users' && req.method === 'GET') {
    return {
      status: 200,
      headers: new Map([['content-type', 'application/json']]),
      body: { users: ['alice', 'bob'] },
    };
  }

  // 404 Not Found
  return {
    status: 404,
    headers: new Map([['content-type', 'text/plain']]),
    body: 'Not Found',
  };
});

// Later...
await server.stop();
await server.destroy();
```

## API Reference

### ServerRequest

```typescript
interface ServerRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: ReadonlyMap<string, string>;
  readonly body?: unknown;
}
```

### ServerResponse

```typescript
interface ServerResponse {
  status: number;
  headers: Map<string, string>;
  body?: unknown;
}
```

### ServerConnection

```typescript
interface ServerConnection {
  readonly id: string;
  readonly remoteAddress: string;
  send(data: unknown): Promise<Result<void, Error>>;
  close(): Promise<Result<void, Error>>;
  onMessage?(handler: (data: unknown) => Promise<void>): void;
  onClose?(handler: () => Promise<void>): void;
}
```

### ServerAdapter

```typescript
interface ServerAdapter extends Integration {
  onRequest?(handler: (request: ServerRequest) => Promise<ServerResponse>): void;
  onConnection?(handler: (connection: ServerConnection) => Promise<void>): void;
}
```

## Creating Custom Adapters

To create a custom server adapter, implement the lifecycle handlers and server-specific methods:

```typescript
import { createServerAdapter } from '@servicejs/integration-server';
import { ok, err } from '@servicejs/result';
import * as http from 'node:http';

export const createNodeHttpAdapter = (): ServerAdapter => {
  let httpServer: http.Server | null = null;
  let requestHandler: ((req: ServerRequest) => Promise<ServerResponse>) | null = null;

  const adapter = createServerAdapter(
    {
      name: 'node-http',
      version: '1.0.0',
      type: 'server',
      platforms: ['node'],
      description: 'Node.js HTTP server adapter',
    },
    {
      onInit: async (config) => {
        const port = (config as { port: number }).port;

        httpServer = http.createServer(async (req, res) => {
          if (!requestHandler) {
            res.writeHead(500);
            res.end('No request handler');
            return;
          }

          const headers = new Map<string, string>();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
          }

          const response = await requestHandler({
            method: req.method || 'GET',
            url: req.url || '/',
            headers,
          });

          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(JSON.stringify(response.body));
        });

        return ok(undefined);
      },

      onStart: async () => {
        const port = 3000; // Get from config
        return new Promise((resolve) => {
          httpServer?.listen(port, () => {
            resolve(ok(undefined));
          });
        });
      },

      onStop: async () => {
        return new Promise((resolve) => {
          httpServer?.close(() => {
            resolve(ok(undefined));
          });
        });
      },

      onDestroy: async () => {
        httpServer = null;
        requestHandler = null;
        return ok(undefined);
      },

      onHealth: async () => {
        if (!httpServer) {
          return ok({ status: 'unhealthy', error: new Error('Server not initialized') });
        }
        if (!requestHandler) {
          return ok({ status: 'degraded', reason: 'No request handler' });
        }
        return ok({ status: 'healthy' });
      },
    }
  );

  const serverAdapter = adapter as ServerAdapter;
  serverAdapter.onRequest = (handler) => {
    requestHandler = handler;
  };

  return serverAdapter;
};
```

## Related Packages

- **[@servicejs/integrations](../integrations)**: Base integration framework
- **[@servicejs/integration-database](../integration-database)**: Database adapters
- **[@servicejs/integration-mq](../integration-mq)**: Message queue adapters

## Testing

Run tests:

```bash
bun test
```

## License

MIT
