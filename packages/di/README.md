# @servicejs/di

Dependency injection and inversion of control for ServiceJS with capability-based architecture.

## Features

- 🔐 **Type-Safe**: Strongly typed tokens and resolution with full TypeScript support
- 🎯 **Capability-Based**: Designed for ports-and-adapters (hexagonal) architecture
- 🔌 **Easy Adapters**: Simple utilities for creating adapter functions
- ⏱️ **Flexible Scopes**: Transient, singleton, and scoped lifetimes
- 🧩 **Modular**: Compose applications from reusable modules
- ⚡ **Async Support**: Factories can be synchronous or asynchronous
- 🗑️ **Resource Management**: Automatic cleanup and disposal
- 🔄 **No Direct References**: Components interact through capabilities, not direct references

## Installation

```bash
bun add @servicejs/di
```

## Quick Start

```typescript
import { token, createContainer } from '@servicejs/di';

// 1. Define your ports (interfaces)
interface Logger {
  log(message: string): void;
}

interface Database {
  query(sql: string): Promise<any[]>;
}

// 2. Create tokens for your dependencies
const LoggerToken = token<Logger>('Logger');
const DatabaseToken = token<Database>('Database');

// 3. Create a container and register dependencies
const container = createContainer();

container.singleton(LoggerToken, () => ({
  log: (msg) => console.log(`[LOG] ${msg}`),
}));

container.singleton(
  DatabaseToken,
  (deps) => ({
    query: async (sql) => {
      const logger = deps[String(LoggerToken)];
      logger.log(`Executing: ${sql}`);
      // ... actual database logic
      return [];
    },
  }),
  [LoggerToken] // Dependencies
);

// 4. Resolve and use
const result = await container.resolve(DatabaseToken);
if (result._tag === 'Ok') {
  await result.value.query('SELECT * FROM users');
}
```

## Core Concepts

### Tokens

Tokens are type-safe identifiers for dependencies:

```typescript
// Create a token
const LoggerToken = token<Logger>('Logger');

// Tokens are symbols under the hood, ensuring uniqueness
const token1 = token<Logger>('Logger');
const token2 = token<Logger>('Logger');
// token1 !== token2 (different symbols)
```

### Scopes

Three lifetime scopes are supported:

```typescript
// Singleton: Created once, shared across all resolutions
container.singleton(LoggerToken, () => new Logger());

// Transient: Created every time it's resolved
container.transient(RequestToken, () => new Request());

// Scoped: Created once per scope (useful for request-scoped dependencies)
container.scoped(SessionToken, () => new Session());
```

### Dependencies

Declare dependencies explicitly:

```typescript
container.singleton(
  ServiceToken,
  (deps) => {
    const logger = deps[String(LoggerToken)];
    const db = deps[String(DatabaseToken)];
    return new Service(logger, db);
  },
  [LoggerToken, DatabaseToken] // Declared dependencies
);
```

## Adapters

Creating small adapters is easy with the adapter utilities:

### Basic Adapter

```typescript
import { adapt } from '@servicejs/di';

// Adapt console to Logger interface
const logger = adapt(console, (c) => ({
  log: (msg) => c.info(msg),
  error: (msg) => c.error(msg),
}));
```

### Capability Adapter

The primary pattern for ServiceJS - mediate access through capabilities:

```typescript
import { capabilityAdapter } from '@servicejs/di';

interface LoggerCapability {
  send(message: { type: 'log' | 'error'; text: string }): void;
}

const loggerCap = capabilityAdapter(logger, (impl) => ({
  send: (msg) => {
    if (msg.type === 'log') impl.log(msg.text);
    else impl.error(msg.text);
  },
}));
```

### Wrapper Adapter

Add behavior to existing implementations:

```typescript
import { wrap } from '@servicejs/di';

const timedLogger = wrap(logger, (base) => ({
  log: (msg) => {
    const timestamp = new Date().toISOString();
    base.log(`[${timestamp}] ${msg}`);
  },
}));
```

### Lazy Adapter

Defer initialization until first use:

```typescript
import { lazy } from '@servicejs/di';

const lazyDb = lazy(
  () => new ExpensiveDatabase(),
  ['query', 'insert', 'update']
);
```

### Other Adapters

```typescript
import { composite, adaptMethod, asyncAdapter, memoize } from '@servicejs/di';

// Composite: Combine multiple implementations
const storage = composite({
  get: (key) => localStorage.getItem(key),
  set: (key, val) => localStorage.setItem(key, val),
});

// Method adapter: Transform arguments/results
const uppercaseLog = adaptMethod(logger.log, {
  input: (msg: string) => [msg.toUpperCase()],
});

// Async adapter: Convert sync to async
const asyncLogger = asyncAdapter(syncLogger, (sync) => ({
  log: async (msg) => sync.log(msg),
}));

// Memoize: Cache results
const memoizedFetcher = memoize(fetcher, ['fetch']);
```

## Modules

Group related dependencies into modules:

```typescript
import { createModule, composeModules, moduleBuilder } from '@servicejs/di';

// Create a module
const loggingModule = createModule((container) => {
  container.singleton(LoggerToken, () => new Logger());
  container.singleton(MetricsToken, (deps) => new Metrics(deps.logger), [LoggerToken]);
}, {
  name: 'Logging',
  description: 'Provides logging and metrics'
});

// Compose modules
const appModule = composeModules(
  [loggingModule, databaseModule, apiModule],
  { name: 'Application' }
);

// Register all at once
await appModule.register(container);

// Or use the builder pattern
const module = moduleBuilder()
  .name('MyModule')
  .singleton(LoggerToken, () => new Logger())
  .singleton(DbToken, (deps) => new Database(deps.logger), [LoggerToken])
  .build();
```

## Ports and Adapters Architecture

Perfect for hexagonal architecture:

```typescript
// Define your port (core interface)
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

const EmailServiceToken = token<EmailService>('EmailService');

// Create adapters for different implementations
const sendgridAdapter = adapt(sendgridClient, (client) => ({
  send: async (to, subject, body) => {
    await client.sendEmail({ to, subject, text: body });
  },
}));

const smtpAdapter = adapt(smtpClient, (client) => ({
  send: async (to, subject, body) => {
    await client.sendMail({ to, subject, text: body });
  },
}));

// Register the appropriate adapter
container.singleton(EmailServiceToken, () => sendgridAdapter);

// Core business logic depends on the port, not the adapter
container.singleton(
  UserServiceToken,
  (deps) => new UserService(deps.emailService),
  [EmailServiceToken]
);
```

## Capability-Based Security

Components interact through capabilities, not direct references:

```typescript
// Define capability interface
interface LoggerCapability {
  send(msg: { type: 'log'; level: string; text: string }): void;
}

// Create capability from implementation
const loggerCapability = capabilityAdapter(logger, (impl) => ({
  send: (msg) => {
    if (msg.type === 'log') {
      impl[msg.level](msg.text);
    }
  },
}));

// Components only receive capabilities
class UserService {
  constructor(private logger: LoggerCapability) {}

  createUser(name: string) {
    this.logger.send({ type: 'log', level: 'info', text: `Creating user: ${name}` });
    // ...
  }
}
```

## Scoped Dependencies

Useful for request-scoped resources:

```typescript
// Parent container
const appContainer = createContainer();
appContainer.singleton(LoggerToken, () => new Logger());
appContainer.scoped(SessionToken, () => new Session());

// Create scope for each request
app.use(async (req, res) => {
  const requestScope = appContainer.createScope();

  const sessionResult = await requestScope.resolve(SessionToken);
  // Each request gets its own Session instance

  // Clean up after request
  requestScope.clearScope();
});
```

## Resource Cleanup

Automatic disposal of resources:

```typescript
const container = createContainer();

// Register cleanup
container.onDispose(async () => {
  await database.close();
  await cache.disconnect();
});

// When done
await container.dispose();
```

## Best Practices

1. **Define ports (interfaces), not implementations**
   ```typescript
   // ✅ Good: Interface defines the contract
   interface Logger {
     log(message: string): void;
   }
   const LoggerToken = token<Logger>('Logger');

   // ❌ Bad: Token for concrete class
   const LoggerToken = token<ConsoleLogger>('Logger');
   ```

2. **Use adapters to translate between ports and implementations**
   ```typescript
   // Adapter translates external API to internal port
   const logger = adapt(console, (c) => ({
     log: (msg) => c.info(msg),
   }));
   ```

3. **Declare all dependencies explicitly**
   ```typescript
   container.singleton(ServiceToken, (deps) => {
     return new Service(
       deps[String(LoggerToken)],
       deps[String(DbToken)]
     );
   }, [LoggerToken, DbToken]);
   ```

4. **Use capabilities for component interaction**
   ```typescript
   // Components interact through capabilities, not direct references
   const capability = capabilityAdapter(service, (s) => ({
     send: (msg) => s.handleMessage(msg),
   }));
   ```

5. **Group related dependencies into modules**
   ```typescript
   const module = createModule((container) => {
     // Register all related dependencies together
   });
   ```

## API Reference

### Container

- `createContainer()` - Create a new container
- `container.register(token, factory, options)` - Register a dependency
- `container.singleton(token, factory, deps?)` - Register singleton
- `container.transient(token, factory, deps?)` - Register transient
- `container.scoped(token, factory, deps?)` - Register scoped
- `container.value(token, value)` - Register constant value
- `container.resolve(token)` - Resolve a dependency
- `container.tryResolve(token)` - Try to resolve (returns Option)
- `container.has(token)` - Check if token is registered
- `container.createScope()` - Create child scope
- `container.clearScope()` - Clear scoped instances
- `container.onDispose(fn)` - Register cleanup function
- `container.dispose()` - Dispose all resources

### Adapters

- `adapt(from, mapping)` - Basic adapter
- `wrap(impl, wrapper)` - Wrapping adapter
- `composite(delegates)` - Composite adapter
- `adaptMethod(method, transform)` - Method adapter
- `asyncAdapter(from, mapping)` - Sync to async adapter
- `capabilityAdapter(impl, createCapability)` - Capability adapter
- `lazy(factory, methods)` - Lazy initialization adapter
- `memoize(impl, methods)` - Memoization adapter

### Modules

- `createModule(register, metadata?)` - Create a module
- `composeModules(modules, metadata?)` - Compose modules
- `moduleBuilder()` - Create module with builder pattern

## License

MIT
