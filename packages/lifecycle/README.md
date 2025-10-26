# @servicejs/lifecycle

Lifecycle and resource management for ServiceJS components.

## Features

- **Lifecycle Hooks**: Initialize and shutdown components with async hooks
- **Shutdown Coordination**: Gracefully shutdown multiple components in order
- **Resource Management**: RAII pattern for automatic cleanup
- **Error Handling**: Comprehensive error types and recovery strategies
- **TypeScript**: Full type safety and inference

## Installation

```bash
bun add @servicejs/lifecycle
```

## Quick Start

```typescript
import { createComponent } from '@servicejs/core';
import { withLifecycle } from '@servicejs/lifecycle';

// Create a component
const { component, capability } = createComponent(
  'urn:example:database',
  { connected: false },
  (state, message) => ({ state, reducer: (s) => ({ state: s, effects: [] }), effects: [] })
);

// Wrap with lifecycle hooks
const managed = withLifecycle(component, capability, {
  onInit: async () => {
    console.log('Connecting to database...');
    await connectDatabase();
  },
  onShutdown: async () => {
    console.log('Disconnecting from database...');
    await disconnectDatabase();
  },
});

// Initialize and use
await managed.init();
capability.send({ type: 'query', sql: 'SELECT * FROM users' });
await managed.shutdown();
```

## Core Concepts

### Lifecycle Hooks

Components often need to perform initialization and cleanup. Lifecycle hooks provide a structured way to manage these operations.

```typescript
interface LifecycleHooks {
  onInit?: () => Promise<void>;
  onShutdown?: () => Promise<void>;
}
```

### Managed Components

A `ManagedComponent` wraps a regular component with lifecycle management:

```typescript
interface ManagedComponent<TState, TMsg extends Message> {
  readonly component: Component<TState, TMsg>;
  readonly capability: Capability<TMsg>;
  init(): Promise<Result<void, LifecycleError>>;
  shutdown(): Promise<Result<void, LifecycleError>>;
  isInitialized(): boolean;
  isShutdown(): boolean;
}
```

### Shutdown Coordinator

Coordinates shutdown of multiple components in reverse order (LIFO):

```typescript
const coordinator = createShutdownCoordinator();

coordinator.register(database);
coordinator.register(cache);
coordinator.register(httpServer);

// Shuts down: httpServer → cache → database
await coordinator.shutdown();
```

### Resource Owner

Manages multiple resources with automatic cleanup:

```typescript
const owner = createResourceOwner();

const file = await owner.acquire(
  async () => await openFile('data.txt'),
  async (f) => await f.close()
);

// Cleanup all resources (LIFO)
await owner.cleanup();
```

### RAII Pattern

Use resources with automatic cleanup (Resource Acquisition Is Initialization):

```typescript
const result = await withResource(
  async () => await openFile('data.txt'),
  async (file) => await file.close(),
  async (file) => {
    const content = await file.read();
    return content.length;
  }
);

// File is automatically closed even if an error occurs
```

## API Reference

### withLifecycle

Create a managed component with lifecycle hooks.

```typescript
function withLifecycle<TState, TMsg extends Message>(
  component: Component<TState, TMsg>,
  capability: Capability<TMsg>,
  hooks?: LifecycleHooks
): ManagedComponent<TState, TMsg>
```

**Example:**

```typescript
const managed = withLifecycle(component, capability, {
  onInit: async () => {
    await initializeResources();
  },
  onShutdown: async () => {
    await cleanupResources();
  },
});

const initResult = await managed.init();
if (initResult.isErr()) {
  console.error('Initialization failed:', initResult.error);
}
```

### createShutdownCoordinator

Create a coordinator for managing multiple component shutdowns.

```typescript
function createShutdownCoordinator(): ShutdownCoordinator

interface ShutdownCoordinator {
  register<TState, TMsg extends Message>(
    component: ManagedComponent<TState, TMsg>
  ): void;
  shutdown(options?: ShutdownOptions): Promise<Result<void, ShutdownError>>;
  isShutdown(): boolean;
  size(): number;
}
```

**Options:**

```typescript
interface ShutdownOptions {
  continueOnError?: boolean; // Default: true
  timeout?: number;          // Default: 5000ms
}
```

**Example:**

```typescript
const coordinator = createShutdownCoordinator();

coordinator.register(componentA);
coordinator.register(componentB);

// Shutdown with custom timeout
const result = await coordinator.shutdown({ timeout: 10000 });

if (result.isErr()) {
  console.error('Shutdown error:', result.error);
}
```

### createResourceOwner

Create an owner that manages multiple resources.

```typescript
function createResourceOwner(): ResourceOwner

interface ResourceOwner {
  acquire<T>(
    acquire: () => Promise<T>,
    cleanup: (resource: T) => Promise<void>
  ): Promise<Result<Resource<T>, ResourceError>>;
  cleanup(): Promise<Result<void, ResourceError>>;
  isCleanedUp(): boolean;
  size(): number;
}
```

**Example:**

```typescript
const owner = createResourceOwner();

const dbResult = await owner.acquire(
  async () => await connectToDatabase(),
  async (conn) => await conn.close()
);

const cacheResult = await owner.acquire(
  async () => await connectToCache(),
  async (conn) => await conn.disconnect()
);

// Cleanup all resources in reverse order
await owner.cleanup();
```

### withResource

Execute a function with a resource that is automatically cleaned up.

```typescript
function withResource<T, R>(
  acquire: () => Promise<T>,
  cleanup: (resource: T) => Promise<void>,
  use: (resource: T) => Promise<R>
): Promise<Result<R, ResourceError>>
```

**Example:**

```typescript
const result = await withResource(
  async () => await openFile('config.json'),
  async (file) => await file.close(),
  async (file) => {
    const content = await file.read();
    return JSON.parse(content);
  }
);

if (result.isOk()) {
  console.log('Config:', result.value);
}
```

## Error Types

### LifecycleError

```typescript
type LifecycleError =
  | { type: 'INIT_ERROR'; error: unknown }
  | { type: 'SHUTDOWN_ERROR'; error: unknown }
  | { type: 'ALREADY_INITIALIZED' }
  | { type: 'ALREADY_SHUTDOWN' }
  | { type: 'NOT_INITIALIZED' };
```

### ShutdownError

```typescript
type ShutdownError =
  | { type: 'ALREADY_SHUTDOWN' }
  | { type: 'COMPONENT_SHUTDOWN_ERROR'; componentIndex: number; error: LifecycleError }
  | { type: 'PARTIAL_SHUTDOWN'; errors: Array<{ componentIndex: number; error: LifecycleError }> };
```

### ResourceError

```typescript
type ResourceError =
  | { type: 'ACQUIRE_ERROR'; error: unknown }
  | { type: 'CLEANUP_ERROR'; error: unknown }
  | { type: 'ALREADY_CLEANED_UP' }
  | { type: 'PARTIAL_CLEANUP'; errors: Array<{ resourceIndex: number; error: unknown }> };
```

## Usage Patterns

### Application Startup/Shutdown

```typescript
import { createShutdownCoordinator } from '@servicejs/lifecycle';

const coordinator = createShutdownCoordinator();

// Create and initialize components
const database = withLifecycle(dbComponent, dbCapability, {
  onInit: async () => await db.connect(),
  onShutdown: async () => await db.disconnect(),
});

const cache = withLifecycle(cacheComponent, cacheCapability, {
  onInit: async () => await cache.connect(),
  onShutdown: async () => await cache.disconnect(),
});

// Initialize all
await database.init();
await cache.init();

// Register for coordinated shutdown
coordinator.register(database);
coordinator.register(cache);

// Handle shutdown signals
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await coordinator.shutdown();
  process.exit(0);
});
```

### Database Transaction Pattern

```typescript
import { withResource } from '@servicejs/lifecycle';

async function updateUserAccount(userId: string, data: UserData) {
  return await withResource(
    async () => await db.beginTransaction(),
    async (txn) => await txn.commit(),
    async (txn) => {
      await txn.query('UPDATE users SET ... WHERE id = ?', [userId]);
      await txn.query('INSERT INTO audit_log ...');
      return { success: true };
    }
  );
}

// Transaction is automatically committed on success
// or rolled back on error (by not calling commit)
```

### Multiple Resource Management

```typescript
import { createResourceOwner } from '@servicejs/lifecycle';

async function processData() {
  const owner = createResourceOwner();

  // Acquire multiple resources
  const input = await owner.acquire(
    async () => await openFile('input.txt'),
    async (f) => await f.close()
  );

  const output = await owner.acquire(
    async () => await openFile('output.txt'),
    async (f) => await f.close()
  );

  const lock = await owner.acquire(
    async () => await acquireLock('process'),
    async (l) => await l.release()
  );

  if (input.isOk() && output.isOk() && lock.isOk()) {
    // Process data...
  }

  // Cleanup all resources in reverse order
  await owner.cleanup();
}
```

### Nested Resources

```typescript
const result = await withResource(
  async () => await openDatabase(),
  async (db) => await db.close(),
  async (db) => {
    return await withResource(
      async () => await db.beginTransaction(),
      async (txn) => await txn.commit(),
      async (txn) => {
        // Perform operations...
        return results;
      }
    );
  }
);

// Both transaction and database are cleaned up properly
```

### Error Recovery

```typescript
const coordinator = createShutdownCoordinator();

// Register components...

// Shutdown with error handling
const result = await coordinator.shutdown({
  continueOnError: true,
  timeout: 10000,
});

if (result.isErr()) {
  switch (result.error.type) {
    case 'PARTIAL_SHUTDOWN':
      console.error(`${result.error.errors.length} components failed to shutdown`);
      for (const { componentIndex, error } of result.error.errors) {
        console.error(`Component ${componentIndex}:`, error);
      }
      break;

    case 'COMPONENT_SHUTDOWN_ERROR':
      console.error(`Component ${result.error.componentIndex} failed:`, result.error.error);
      break;
  }
}
```

## Examples

The package includes comprehensive examples:

- **lifecycle.ts**: Basic lifecycle hooks with initialization and shutdown
- **shutdown.ts**: Coordinated shutdown of multiple components
- **resources.ts**: Resource management with RAII pattern

Run examples:

```bash
cd packages/lifecycle
bun run examples/lifecycle.ts
bun run examples/shutdown.ts
bun run examples/resources.ts
```

## Best Practices

### 1. Always Handle Init/Shutdown Errors

```typescript
const initResult = await managed.init();
if (initResult.isErr()) {
  // Handle error appropriately
  console.error('Failed to initialize:', initResult.error);
  return;
}
```

### 2. Register Components in Dependency Order

```typescript
coordinator.register(database);  // First to start
coordinator.register(cache);     // Depends on database
coordinator.register(api);       // Depends on both

// Shutdown happens in reverse: api → cache → database
```

### 3. Use RAII for Short-Lived Resources

```typescript
// Prefer withResource for scoped resources
await withResource(
  async () => await acquire(),
  async (r) => await cleanup(r),
  async (r) => await use(r)
);

// Use ResourceOwner for long-lived or multiple resources
const owner = createResourceOwner();
await owner.acquire(...);
```

### 4. Set Appropriate Timeouts

```typescript
// For fast services
await coordinator.shutdown({ timeout: 5000 });

// For services with long shutdown
await coordinator.shutdown({ timeout: 30000 });
```

### 5. Decide on Error Strategy

```typescript
// Continue on error (default) - for best-effort shutdown
await coordinator.shutdown({ continueOnError: true });

// Stop on error - for critical failures
await coordinator.shutdown({ continueOnError: false });
```

### 6. Clean Up in Reverse Order (LIFO)

Both `ShutdownCoordinator` and `ResourceOwner` clean up in reverse order automatically. This ensures dependencies are respected.

### 7. Avoid Direct Component Access

Always use capabilities to interact with components, even after initialization.

## Performance Characteristics

- **Lifecycle Hooks**: O(1) initialization and shutdown
- **Shutdown Coordinator**: O(n) where n is the number of components
- **Resource Owner**: O(n) where n is the number of resources
- **withResource**: O(1) overhead for resource management

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
const managed: ManagedComponent<MyState, MyMessage> = withLifecycle(
  component,
  capability,
  hooks
);

const coordinator: ShutdownCoordinator = createShutdownCoordinator();

const owner: ResourceOwner = createResourceOwner();

const result: Result<string, ResourceError> = await withResource(
  async () => await acquire(),
  async (r) => await cleanup(r),
  async (r) => await use(r)
);
```

## Testing

Run tests:

```bash
cd packages/lifecycle
bun test
```

The package includes 42 comprehensive tests covering:
- Lifecycle hook execution
- Error handling
- State management
- Shutdown coordination
- Resource management
- RAII pattern
- Timeout handling
- Error recovery

## License

MIT

## Related Packages

- **@servicejs/core**: Core component system
- **@servicejs/result**: Result type for error handling
- **@servicejs/mailbox**: Message queue implementations

## Contributing

See the main [ServiceJS repository](https://github.com/servicejs/servicejs) for contribution guidelines.
