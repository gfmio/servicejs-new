# @servicejs/flow-control

Backpressure and flow control utilities for ServiceJS.

## Features

- **Async Capability**: Backpressure via async send with queue monitoring
- **Circuit Breaker**: Fail-fast pattern for unreliable services
- **Rate Limiter**: Token bucket rate limiting for message throughput
- **Batching**: Accumulate messages and send in batches for efficiency
- **TypeScript**: Full type safety and inference

## Installation

```bash
bun add @servicejs/flow-control
```

## Quick Start

```typescript
import { createCapability } from '@servicejs/core';
import {
  createAsyncCapability,
  createCircuitBreaker,
  createRateLimiter,
  createBatchingCapability,
} from '@servicejs/flow-control';

// Async capability with backpressure
const asyncCap = createAsyncCapability(
  capability,
  () => mailbox.size(),
  { maxQueueSize: 100 }
);

await asyncCap.sendAsync({ type: 'work', data: 'value' });

// Circuit breaker
const breaker = createCircuitBreaker(capability, undefined, {
  failureThreshold: 5,
  resetTimeout: 60000,
});

const result = breaker.send({ type: 'request' });

// Rate limiter
const limiter = createRateLimiter(capability, {
  maxMessages: 100,
  windowMs: 1000,
});

limiter.send({ type: 'api-call' });

// Batching
const batcher = createBatchingCapability(batchCapability, {
  maxBatchSize: 50,
  maxBatchDelay: 1000,
});

batcher.send({ type: 'log', message: 'Event' });
```

## Core Concepts

### Async Capability with Backpressure

Provides async send that waits when a queue is full, automatically applying backpressure to producers.

```typescript
interface AsyncCapability<TMsg> {
  sendAsync(message: TMsg): Promise<void>;
  queueSize(): number;
  isFull(): boolean;
}
```

### Circuit Breaker

Implements the circuit breaker pattern with three states: closed, open, and half-open. Fails fast when a service is unavailable.

```typescript
type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerCapability<TMsg> {
  send(message: TMsg): Result<void, CircuitBreakerError>;
  getState(): CircuitState;
  getFailureCount(): number;
  reset(): void;
}
```

### Rate Limiter

Token bucket algorithm for limiting message throughput with configurable overflow strategies.

```typescript
interface RateLimiterCapability<TMsg> {
  send(message: TMsg): Result<void, RateLimiterError>;
  getAvailableTokens(): number;
  getTimeUntilRefill(): number;
  reset(): void;
}
```

### Batching

Accumulates messages and sends them in batches based on size or time thresholds.

```typescript
interface BatchingCapability<TMsg> {
  send(message: TMsg): void;
  flush(): number;
  getBatchSize(): number;
  stop(): void;
}
```

## API Reference

### createAsyncCapability

Create an async capability with backpressure support.

```typescript
function createAsyncCapability<TMsg extends Message>(
  capability: Capability<TMsg>,
  getQueueSize: () => number,
  config?: AsyncCapabilityConfig
): AsyncCapability<TMsg>
```

**Configuration:**

```typescript
interface AsyncCapabilityConfig {
  maxQueueSize?: number;    // Default: 100
  pollInterval?: number;     // Default: 10ms
}
```

**Example:**

```typescript
const asyncCap = createAsyncCapability(
  capability,
  () => mailbox.size(),
  {
    maxQueueSize: 50,
    pollInterval: 10,
  }
);

// Waits if queue is full
await asyncCap.sendAsync({ type: 'work', data: 'value' });

console.log(`Queue size: ${asyncCap.queueSize()}`);
console.log(`Is full: ${asyncCap.isFull()}`);
```

### createCircuitBreaker

Create a circuit breaker wrapper for a capability.

```typescript
function createCircuitBreaker<TMsg extends Message>(
  capability: Capability<TMsg>,
  shouldFail?: (message: TMsg) => boolean,
  config?: CircuitBreakerConfig
): CircuitBreakerCapability<TMsg>
```

**Configuration:**

```typescript
interface CircuitBreakerConfig {
  failureThreshold?: number;           // Default: 5
  resetTimeout?: number;                // Default: 60000ms (1 minute)
  onStateChange?: (old: CircuitState, new: CircuitState) => void;
}
```

**Example:**

```typescript
const breaker = createCircuitBreaker(
  unreliableCapability,
  undefined,
  {
    failureThreshold: 3,
    resetTimeout: 30000,
    onStateChange: (old, newState) => {
      console.log(`Circuit: ${old} -> ${newState}`);
    },
  }
);

const result = breaker.send({ type: 'request' });

if (result.isErr() && result.error.type === 'CIRCUIT_OPEN') {
  console.log('Circuit is open, failing fast');
}

console.log(`State: ${breaker.getState()}`);
console.log(`Failures: ${breaker.getFailureCount()}`);
```

### createRateLimiter

Create a rate limiter using token bucket algorithm.

```typescript
function createRateLimiter<TMsg extends Message>(
  capability: Capability<TMsg>,
  config?: RateLimiterConfig
): RateLimiterCapability<TMsg>
```

**Configuration:**

```typescript
interface RateLimiterConfig {
  maxMessages?: number;                    // Default: 100
  windowMs?: number;                       // Default: 1000ms (1 second)
  overflowStrategy?: 'drop' | 'error';   // Default: 'error'
  onRateLimited?: (message: Message) => void;
}
```

**Example:**

```typescript
const limiter = createRateLimiter(capability, {
  maxMessages: 10,
  windowMs: 1000,
  overflowStrategy: 'error',
  onRateLimited: (msg) => console.log('Rate limited:', msg),
});

const result = limiter.send({ type: 'api-call' });

if (result.isErr() && result.error.type === 'RATE_LIMITED') {
  console.log(`Retry after ${result.error.retryAfter}ms`);
}

console.log(`Available tokens: ${limiter.getAvailableTokens()}`);
console.log(`Refill in: ${limiter.getTimeUntilRefill()}ms`);
```

### createBatchingCapability

Create a batching capability that accumulates messages.

```typescript
function createBatchingCapability<TMsg extends Message>(
  capability: Capability<BatchMessage<TMsg>>,
  config?: BatchingConfig
): BatchingCapability<TMsg>
```

**Configuration:**

```typescript
interface BatchingConfig {
  maxBatchSize?: number;      // Default: 100
  maxBatchDelay?: number;     // Default: 1000ms (1 second)
  onFlush?: (batchSize: number) => void;
}
```

**Example:**

```typescript
const batcher = createBatchingCapability(batchCapability, {
  maxBatchSize: 50,
  maxBatchDelay: 5000,
  onFlush: (size) => console.log(`Flushed ${size} messages`),
});

// Messages are batched
batcher.send({ type: 'log', message: 'Event 1' });
batcher.send({ type: 'log', message: 'Event 2' });

// Manual flush
const flushedCount = batcher.flush();

// Check current batch
console.log(`Batch size: ${batcher.getBatchSize()}`);

// Stop and flush remaining
batcher.stop();
```

## Usage Patterns

### Producer-Consumer with Backpressure

```typescript
const mailbox = createFIFOMailbox();
const asyncCap = createAsyncCapability(
  createCapability((msg) => mailbox.enqueue(msg)),
  () => mailbox.size(),
  { maxQueueSize: 10 }
);

// Fast producer
const producer = async () => {
  for (let i = 0; i < 100; i++) {
    await asyncCap.sendAsync({ type: 'work', id: i });
  }
};

// Slow consumer
const consumer = async () => {
  while (true) {
    const msg = mailbox.dequeue();
    if (msg.type === 'Some') {
      await processMessage(msg.value);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
};

await Promise.all([producer(), consumer()]);
```

### Resilient API Client

```typescript
const breaker = createCircuitBreaker(apiCapability, undefined, {
  failureThreshold: 5,
  resetTimeout: 60000,
});

const limiter = createRateLimiter(breaker, {
  maxMessages: 10,
  windowMs: 1000,
  overflowStrategy: 'error',
});

const makeRequest = (endpoint: string) => {
  const result = limiter.send({ type: 'api-call', endpoint });

  if (result.isErr()) {
    if (result.error.type === 'CIRCUIT_OPEN') {
      return { error: 'Service unavailable' };
    }
    if (result.error.type === 'RATE_LIMITED') {
      return { error: `Rate limited, retry after ${result.error.retryAfter}ms` };
    }
  }

  return { success: true };
};
```

### Bulk Database Operations

```typescript
const batcher = createBatchingCapability(bulkInsertCapability, {
  maxBatchSize: 100,
  maxBatchDelay: 5000,
});

// Individual inserts are batched
users.forEach((user) => {
  batcher.send({
    type: 'db-insert',
    table: 'users',
    data: user,
  });
});

// Ensure all pending inserts are sent
batcher.stop();
```

### High-Throughput Logging

```typescript
const errorBatcher = createBatchingCapability(errorLogCapability, {
  maxBatchSize: 50,
  maxBatchDelay: 1000,
});

const infoBatcher = createBatchingCapability(infoLogCapability, {
  maxBatchSize: 100,
  maxBatchDelay: 5000,
});

const log = (level: 'info' | 'error', message: string) => {
  const logMessage = { type: 'log', level, message, timestamp: Date.now() };

  if (level === 'error') {
    errorBatcher.send(logMessage);
  } else {
    infoBatcher.send(logMessage);
  }
};
```

## Error Types

### CircuitBreakerError

```typescript
type CircuitBreakerError =
  | { type: 'CIRCUIT_OPEN'; message: string }
  | { type: 'SEND_FAILED'; error: unknown };
```

### RateLimiterError

```typescript
type RateLimiterError =
  | { type: 'RATE_LIMITED'; message: string; retryAfter: number }
  | { type: 'SEND_FAILED'; error: unknown };
```

## Examples

The package includes comprehensive examples:

- **backpressure.ts**: Producer-consumer patterns with async capability (5 examples)
- **circuitBreaker.ts**: Circuit breaker states and recovery (8 examples)
- **rateLimiting.ts**: Rate limiting strategies and monitoring (9 examples)
- **batching.ts**: Batching patterns for efficiency (9 examples)

Run examples:

```bash
cd packages/flow-control
bun run examples/backpressure.ts
bun run examples/circuitBreaker.ts
bun run examples/rateLimiting.ts
bun run examples/batching.ts
```

## Best Practices

### 1. Choose Appropriate Backpressure Strategy

```typescript
// For I/O-bound work
const asyncCap = createAsyncCapability(capability, getQueueSize, {
  maxQueueSize: 100,
  pollInterval: 10,
});

// For CPU-bound work
const asyncCap = createAsyncCapability(capability, getQueueSize, {
  maxQueueSize: 10,  // Smaller queue
  pollInterval: 1,   // Faster polling
});
```

### 2. Set Realistic Circuit Breaker Thresholds

```typescript
// For critical services
const breaker = createCircuitBreaker(capability, undefined, {
  failureThreshold: 3,   // Open quickly
  resetTimeout: 30000,   // Try recovery sooner
});

// For less critical services
const breaker = createCircuitBreaker(capability, undefined, {
  failureThreshold: 10,  // More tolerance
  resetTimeout: 60000,   // Longer recovery wait
});
```

### 3. Match Rate Limits to API Requirements

```typescript
// External API with strict limits
const limiter = createRateLimiter(capability, {
  maxMessages: 10,
  windowMs: 1000,
  overflowStrategy: 'error',  // Explicit errors
});

// Internal API
const limiter = createRateLimiter(capability, {
  maxMessages: 1000,
  windowMs: 1000,
  overflowStrategy: 'drop',  // Silent drops OK
});
```

### 4. Optimize Batch Sizes

```typescript
// For network efficiency
const batcher = createBatchingCapability(capability, {
  maxBatchSize: 100,    // Larger batches
  maxBatchDelay: 5000,  // Longer delay OK
});

// For latency sensitivity
const batcher = createBatchingCapability(capability, {
  maxBatchSize: 10,     // Smaller batches
  maxBatchDelay: 100,   // Quick flush
});
```

### 5. Combine Patterns

```typescript
// Circuit breaker + rate limiter + batching
const breaker = createCircuitBreaker(apiCapability, undefined, {
  failureThreshold: 5,
  resetTimeout: 60000,
});

const limiter = createRateLimiter(breaker, {
  maxMessages: 100,
  windowMs: 1000,
});

const batcher = createBatchingCapability(limiter, {
  maxBatchSize: 50,
  maxBatchDelay: 1000,
});

// Now has: resilience, rate limiting, and batching
batcher.send({ type: 'api-call', endpoint: '/data' });
```

## Performance Characteristics

- **Async Capability**: O(1) send, O(1) polling overhead per blocked send
- **Circuit Breaker**: O(1) send, O(1) state checks
- **Rate Limiter**: O(1) token management, O(1) send
- **Batching**: O(1) accumulation, O(n) flush where n is batch size

## Testing

Run tests:

```bash
cd packages/flow-control
bun test
```

The package includes 42 comprehensive tests covering:
- Async capability backpressure behavior (7 tests)
- Circuit breaker state transitions (13 tests)
- Rate limiter token management (14 tests)
- Batching accumulation and flushing (8 tests)

## TypeScript Support

Full TypeScript support with strict typing:

```typescript
const asyncCap: AsyncCapability<MyMessage> = createAsyncCapability(...);
const breaker: CircuitBreakerCapability<MyMessage> = createCircuitBreaker(...);
const limiter: RateLimiterCapability<MyMessage> = createRateLimiter(...);
const batcher: BatchingCapability<MyMessage> = createBatchingCapability(...);
```

## License

MIT

## Related Packages

- **@servicejs/core**: Core component system
- **@servicejs/mailbox**: Message queue implementations
- **@servicejs/result**: Result type for error handling

## Contributing

See the main [ServiceJS repository](https://github.com/servicejs/servicejs) for contribution guidelines.
