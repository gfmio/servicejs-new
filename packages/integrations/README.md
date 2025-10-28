# @servicejs/integrations

Base integration framework for ServiceJS.

## Overview

This package provides the foundational framework for creating ServiceJS integrations with external services. It defines standard lifecycle management, state tracking, and health monitoring patterns that all adapters implement.

## Features

- **Standard Lifecycle Management**: init, start, stop, destroy
- **State Machine**: Validated state transitions with error tracking
- **Health Monitoring**: Built-in health checks (healthy/degraded/unhealthy)
- **Type Safety**: Fully typed with TypeScript

## Related Packages

Specific adapter types are in separate packages:

- **[@servicejs/integration-server](../integration-server)**: HTTP/WebSocket/TCP server adapters
- **[@servicejs/integration-database](../integration-database)**: SQL/NoSQL database adapters
- **[@servicejs/integration-mq](../integration-mq)**: Message queue adapters (RabbitMQ/Kafka/NATS)

## Installation

```bash
bun add @servicejs/integrations
```

## Usage

### Creating a Custom Integration

```typescript
import { createIntegration } from '@servicejs/integrations';

const myIntegration = createIntegration(
  {
    name: 'my-service',
    version: '1.0.0',
    type: 'other',
    platforms: ['node', 'bun']
  },
  {
    onInit: async (config) => {
      // Initialize resources
      console.log('Initializing with config:', config);
      return ok(undefined);
    },

    onStart: async () => {
      // Start service
      console.log('Service started');
      return ok(undefined);
    },

    onStop: async () => {
      // Stop service
      console.log('Service stopped');
      return ok(undefined);
    },

    onDestroy: async () => {
      // Cleanup resources
      console.log('Cleaned up');
      return ok(undefined);
    },

    onHealth: async () => {
      // Custom health check
      return ok({ status: 'healthy' });
    }
  }
);

// Use the integration
await myIntegration.init({ /* config */ });
await myIntegration.start();

// Check health
const health = await myIntegration.health();
console.log('Health:', health);

// Clean shutdown
await myIntegration.stop();
await myIntegration.destroy();
```

## Using with Adapters

This package provides the base framework. Use it with specific adapter packages:

```typescript
// Server adapters
import { type ServerAdapter } from '@servicejs/integration-server';

// Database adapters
import { type DatabaseAdapter } from '@servicejs/integration-database';

// Message queue adapters
import { type MessageQueueAdapter } from '@servicejs/integration-mq';
```

See the respective package READMEs for usage examples.

## Integration State Machine

All integrations follow this lifecycle:

```
uninitialized → initializing → initialized → starting → started
                                    ↓           ↓          ↓
                                stopping ← stopped    (running)
                                    ↓
                              uninitialized
```

Error states are tracked separately and can occur at any point.

## Health Checks

All integrations support health checks:

```typescript
const health = await integration.health();

// Returns one of:
// { status: 'healthy' }
// { status: 'degraded', reason: string }
// { status: 'unhealthy', error: Error }
```

## Type Safety

All adapters are fully typed with TypeScript for excellent IDE support and compile-time safety.

## Testing

Run tests:

```bash
bun test
```

## License

MIT
