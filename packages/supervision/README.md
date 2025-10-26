# @servicejs/supervision

Erlang/Akka-style supervision for fault-tolerant ServiceJS components.

## Features

- **Three Supervision Strategies**: Restart, stop, and escalate
- **Automatic Retry**: Configurable retry limits and delays
- **Hierarchical Supervision**: Parent-child supervisor relationships
- **Error Notifications**: Optional error notification callbacks
- **Per-Child Overrides**: Child-specific strategy configuration
- **TypeScript**: Full type safety and inference

## Installation

```bash
bun add @servicejs/supervision
```

## Quick Start

```typescript
import { createSupervisor } from '@servicejs/supervision';

const supervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 1000,
});

supervisor.registerChild({
  urn: 'urn:example:worker',
  restart: async () => createWorker(),
});

// When worker fails
await supervisor.notifyError('urn:example:worker', new Error('Worker failed'));
```

## Core Concepts

### Supervision Strategies

**Restart**: Attempt to restart the failed child component
- Tracks retry count
- Respects max retries limit
- Applies configurable delay between attempts
- Resets retry count on successful restart

**Stop**: Stop and unregister the failed child
- Immediately removes child from supervision
- No restart attempts
- Sends error notification (if configured)

**Escalate**: Notify parent supervisor and stop the child
- Delegates error handling to parent supervisor
- Stops the child locally
- Enables hierarchical fault tolerance

### Supervisor Interface

```typescript
interface Supervisor {
  registerChild<T>(childInfo: ChildInfo<T>): Result<void, SupervisionError>;
  unregisterChild(childUrn: URN): Result<void, SupervisionError>;
  notifyError(childUrn: URN, error: unknown): Promise<Result<void, SupervisionError>>;
  size(): number;
  getRetryCount(childUrn: URN): number | undefined;
  isRestarting(childUrn: URN): boolean;
}
```

### Child Registration

```typescript
interface ChildInfo<T> {
  readonly urn: URN;
  readonly restart: () => Promise<T> | T;
  readonly strategy?: SupervisionStrategy; // Override default
}
```

## API Reference

### createSupervisor

Create a supervisor to manage child components.

```typescript
function createSupervisor(config?: SupervisorConfig): Supervisor
```

**Configuration:**

```typescript
interface SupervisorConfig {
  strategy?: SupervisionStrategy;           // Default: 'restart'
  maxRetries?: number;                      // Default: 3
  retryDelay?: number;                      // Default: 1000ms
  errorNotificationCapability?: Capability<ErrorNotification>;
  parentSupervisor?: Supervisor;
}
```

**Example:**

```typescript
const supervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 5,
  retryDelay: 2000,
  errorNotificationCapability: errorCap,
});
```

### registerChild

Register a child component with the supervisor.

```typescript
registerChild<T>(childInfo: ChildInfo<T>): Result<void, SupervisionError>
```

**Example:**

```typescript
const result = supervisor.registerChild({
  urn: 'urn:example:database',
  restart: async () => {
    const db = await connectDatabase();
    return db;
  },
  strategy: 'restart', // Optional override
});

if (result.isErr()) {
  console.error('Registration failed:', result.error);
}
```

### notifyError

Notify the supervisor of a child error.

```typescript
notifyError(childUrn: URN, error: unknown): Promise<Result<void, SupervisionError>>
```

**Example:**

```typescript
try {
  await worker.doWork();
} catch (error) {
  const result = await supervisor.notifyError('urn:example:worker', error);

  if (result.isErr()) {
    console.log('Supervision failed:', result.error.type);
  }
}
```

### unregisterChild

Remove a child from supervision.

```typescript
unregisterChild(childUrn: URN): Result<void, SupervisionError>
```

**Example:**

```typescript
supervisor.unregisterChild('urn:example:worker');
```

## Error Types

```typescript
type SupervisionError =
  | { type: 'CHILD_NOT_FOUND'; urn: URN }
  | { type: 'CHILD_ALREADY_REGISTERED'; urn: URN }
  | { type: 'RESTART_FAILED'; urn: URN; error: unknown }
  | { type: 'MAX_RETRIES_EXCEEDED'; urn: URN; retryCount: number }
  | { type: 'NO_PARENT_SUPERVISOR'; urn: URN };
```

## Error Notification

```typescript
interface ErrorNotification extends Message {
  readonly type: 'error-notification';
  readonly childUrn: URN;
  readonly error: unknown;
  readonly strategy: SupervisionStrategy;
  readonly retryCount: number;
}
```

## Usage Patterns

### Basic Restart Strategy

```typescript
const supervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  retryDelay: 1000,
});

supervisor.registerChild({
  urn: 'urn:app:api-client',
  restart: async () => {
    console.log('Recreating API client...');
    return createAPIClient();
  },
});

// When client fails
await supervisor.notifyError('urn:app:api-client', new Error('Connection lost'));
```

### Hierarchical Supervision

```typescript
const topSupervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 2,
});

const childSupervisor = createSupervisor({
  strategy: 'escalate',
  parentSupervisor: topSupervisor,
});

// Register at top level
topSupervisor.registerChild({
  urn: 'urn:app:critical-service',
  restart: async () => createCriticalService(),
});

// Register at child level (for escalation)
childSupervisor.registerChild({
  urn: 'urn:app:critical-service',
  restart: async () => createCriticalService(),
});

// Error at child level escalates to top
await childSupervisor.notifyError(
  'urn:app:critical-service',
  new Error('Failed')
);
```

### Database Connection Pool

```typescript
const dbSupervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 5,
  retryDelay: 2000,
});

// Register multiple connections
for (let i = 0; i < 10; i++) {
  dbSupervisor.registerChild({
    urn: `urn:db:connection-${i}`,
    restart: async () => await createConnection(i),
  });
}

// Monitor and restart failed connections
connections.forEach((conn, urn) => {
  conn.on('error', async (error) => {
    await dbSupervisor.notifyError(urn, error);
  });
});
```

### Error Monitoring

```typescript
const errorLog: ErrorNotification[] = [];

const supervisor = createSupervisor({
  strategy: 'restart',
  maxRetries: 3,
  errorNotificationCapability: createCapability((msg) => {
    errorLog.push(msg);
    console.error(`Child ${msg.childUrn} failed:`, msg.error);
    console.log(`Strategy: ${msg.strategy}, Retries: ${msg.retryCount}`);
  }),
});
```

### Per-Child Strategy Override

```typescript
const supervisor = createSupervisor({
  strategy: 'stop', // Default
});

// Critical service: restart
supervisor.registerChild({
  urn: 'urn:app:critical',
  restart: async () => createCriticalService(),
  strategy: 'restart', // Override
});

// Disposable worker: use default (stop)
supervisor.registerChild({
  urn: 'urn:app:worker',
  restart: async () => createWorker(),
  // Uses default 'stop' strategy
});
```

### Worker Pool with Supervision

```typescript
class WorkerPool {
  private supervisor: Supervisor;
  private workers = new Map<string, Worker>();

  constructor(size: number) {
    this.supervisor = createSupervisor({
      strategy: 'restart',
      maxRetries: 3,
      retryDelay: 500,
    });

    for (let i = 0; i < size; i++) {
      const urn = `urn:pool:worker-${i}`;
      this.createWorker(urn);
    }
  }

  private createWorker(urn: string): void {
    const worker = new Worker(urn);
    this.workers.set(urn, worker);

    this.supervisor.registerChild({
      urn,
      restart: () => {
        const newWorker = new Worker(urn);
        this.workers.set(urn, newWorker);
        return newWorker;
      },
    });

    worker.on('error', async (error) => {
      await this.supervisor.notifyError(urn, error);
    });
  }

  getWorker(urn: string): Worker | undefined {
    return this.workers.get(urn);
  }

  getPoolSize(): number {
    return this.supervisor.size();
  }
}
```

## Best Practices

### 1. Choose Appropriate Strategies

```typescript
// Critical services: restart
supervisor.registerChild({
  urn: 'urn:app:auth-service',
  restart: async () => createAuthService(),
  strategy: 'restart',
});

// Temporary workers: stop
supervisor.registerChild({
  urn: 'urn:app:batch-job',
  restart: async () => createBatchJob(),
  strategy: 'stop',
});

// Hierarchical components: escalate
supervisor.registerChild({
  urn: 'urn:app:subsystem',
  restart: async () => createSubsystem(),
  strategy: 'escalate',
});
```

### 2. Set Realistic Retry Limits

```typescript
// For transient failures (network issues)
const networkSupervisor = createSupervisor({
  maxRetries: 5,
  retryDelay: 2000,
});

// For critical failures (configuration errors)
const criticalSupervisor = createSupervisor({
  maxRetries: 1,
  retryDelay: 5000,
});
```

### 3. Use Error Notifications

```typescript
const supervisor = createSupervisor({
  errorNotificationCapability: createCapability((msg) => {
    // Log to monitoring system
    monitoring.logError({
      service: msg.childUrn,
      error: msg.error,
      retryCount: msg.retryCount,
      strategy: msg.strategy,
    });

    // Alert if too many retries
    if (msg.retryCount > 2) {
      alerting.sendAlert(`Service ${msg.childUrn} failing repeatedly`);
    }
  }),
});
```

### 4. Monitor Restart Status

```typescript
// Check if worker is being restarted before sending work
if (!supervisor.isRestarting('urn:app:worker')) {
  worker.send(message);
} else {
  console.log('Worker is restarting, queuing message...');
  queue.push(message);
}
```

### 5. Implement Graceful Degradation

```typescript
const result = await supervisor.notifyError('urn:app:service', error);

if (result.isErr() && result.error.type === 'MAX_RETRIES_EXCEEDED') {
  // Fall back to degraded mode
  console.log('Service unavailable, using fallback...');
  return fallbackService.handle(request);
}
```

## Examples

The package includes comprehensive examples:

- **supervision.ts**: Comprehensive supervision patterns (9 examples)

Run examples:

```bash
cd packages/supervision
bun run examples/supervision.ts
```

## Testing

Run tests:

```bash
cd packages/supervision
bun test
```

The package includes 23 comprehensive tests covering:
- Child registration and unregistration
- Restart strategy with retry limits
- Stop strategy
- Escalate strategy with parent supervisors
- Error notifications
- Concurrent restart prevention
- Edge cases and error handling

## Performance Characteristics

- **Registration**: O(1)
- **Unregistration**: O(1)
- **Error Notification**: O(1) + restart overhead
- **Restart**: Depends on child restart function
- **Retry Delay**: Configurable sleep between attempts

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
const supervisor: Supervisor = createSupervisor({...});

const childInfo: ChildInfo<DatabaseConnection> = {
  urn: 'urn:db:connection',
  restart: async (): Promise<DatabaseConnection> => createConnection(),
};

const result: Result<void, SupervisionError> = supervisor.registerChild(childInfo);
```

## Comparison with Other Patterns

### vs Manual Error Handling

**Supervision:**
- ✅ Automatic retry logic
- ✅ Centralized error handling
- ✅ Hierarchical fault tolerance
- ✅ Declarative configuration

**Manual:**
- ❌ Boilerplate in every component
- ❌ Inconsistent error handling
- ❌ Hard to compose
- ✅ Fine-grained control

### vs Circuit Breaker

**Supervision**: For managing component lifecycle
**Circuit Breaker**: For preventing cascading failures

Use both together for comprehensive resilience!

## License

MIT

## Related Packages

- **@servicejs/core**: Core component system
- **@servicejs/flow-control**: Circuit breaker and backpressure
- **@servicejs/lifecycle**: Lifecycle hooks and shutdown

## Contributing

See the main [ServiceJS repository](https://github.com/servicejs/servicejs) for contribution guidelines.
