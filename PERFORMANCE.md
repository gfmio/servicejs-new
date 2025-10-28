# ServiceJS Performance Guide

This guide describes the performance characteristics of ServiceJS and provides optimization strategies.

## Performance Philosophy

ServiceJS is designed for:

1. **Low Latency** - Message passing should have minimal overhead
2. **High Throughput** - Support thousands of messages per second
3. **Predictable Performance** - Consistent, deterministic behavior
4. **Zero-Cost Abstractions** - Type safety without runtime overhead

## Benchmark Results

### Mailbox Performance

**Sync Mailbox** (immediate processing):
- Send: ~100-200 ns/op
- Send + Process: ~200-500 ns/op
- Throughput: **~5M messages/sec**

**Async Mailbox** (queued processing):
- Send: ~100-200 ns/op
- Send + Process: ~1-2 μs/op
- Throughput: **~1M messages/sec**

**Priority Mailbox** (sorted by priority):
- Send: ~500 ns-1 μs/op
- Send + Process: ~1-2 μs/op
- Throughput: **~500K messages/sec**

### Result Type Performance

**Construction**:
- `ok(value)`: ~5-10 ns/op
- `err(error)`: ~5-10 ns/op

**Operations**:
- `isOk()`: ~2-5 ns/op (negligible)
- `map()`: ~10-20 ns/op
- `andThen()`: ~20-30 ns/op

**Overhead vs Exceptions**: Result types are **~2-3x faster** than try-catch for error paths.

### CAS Performance

**In-Memory CAS**:
- Put (small, <100B): ~50-100 μs/op
- Put (medium, ~1KB): ~100-200 μs/op
- Put (large, ~10KB): ~500 μs-1 ms/op
- Get: ~10-50 μs/op
- Has: ~1-5 μs/op

**Deduplication**: Putting the same content 10x is only ~10-20% slower than once (hash comparison is fast).

**Hash Algorithms**:
- SHA-256 (default): ~80-120 μs for 1KB
- SHA-1 (legacy): ~60-80 μs for 1KB (~25% faster)
- BLAKE3 (fastest): ~40-60 μs for 1KB (~50% faster)

### Security Performance

**Message Signing (ECDSA P-256)**:
- Generate key pair: ~50-100 ms (one-time cost)
- Sign message: ~1-2 ms/op
- Verify signature: ~2-3 ms/op

**Message Encryption (RSA-OAEP 2048-bit)**:
- Generate key pair: ~100-200 ms (one-time cost)
- Encrypt (small): ~5-10 ms/op
- Decrypt: ~2-5 ms/op

**Token Authentication (HMAC-SHA256)**:
- Generate token: ~100-200 μs/op
- Validate token: ~100-200 μs/op
- Serialize/Deserialize: ~1-5 μs/op

**Token vs Signing**: Tokens are **~10-20x faster** than message signing for authentication.

## Optimization Strategies

### 1. Choose the Right Mailbox

```typescript
// ✅ Use sync mailbox for simple, fast handlers
const mailbox = createSyncMailbox<Message>();
mailbox.onMessage((msg) => {
  // Quick synchronous processing
  processMessage(msg);
});

// ✅ Use async mailbox for I/O or async operations
const mailbox = createAsyncMailbox<Message>();
mailbox.onMessage(async (msg) => {
  await database.save(msg);
});

// ✅ Use priority mailbox only when needed
const mailbox = createPriorityMailbox<Message>();
mailbox.send(urgentMessage, 1); // High priority
mailbox.send(normalMessage, 3); // Low priority
```

### 2. Batch Message Processing

```typescript
// ❌ Bad: Process messages one at a time
for (const item of items) {
  mailbox.send({ type: 'process', item });
  await mailbox.flush(); // Wait after each!
}

// ✅ Good: Batch messages
for (const item of items) {
  mailbox.send({ type: 'process', item });
}
await mailbox.flush(); // Wait once at the end
```

### 3. Use Result Types Over Exceptions

```typescript
// ❌ Slower: Exception-based
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

// ✅ Faster: Result-based
function divide(a: number, b: number): Result<number, Error> {
  if (b === 0) return err(new Error('Division by zero'));
  return ok(a / b);
}
```

### 4. Optimize CAS Usage

```typescript
// ✅ Choose faster hash for non-critical use
const cas = createInMemoryCAS({ algorithm: 'sha1' }); // 25% faster

// ✅ Store large messages in CAS, send addresses
const address = await cas.put(largeData);
mailbox.send({ type: 'data', address }); // Send address, not data

// ✅ Deduplicate identical content automatically
await cas.put(data1); // Stores
await cas.put(data1); // Deduplicates (fast!)
await cas.put(data2); // Stores
```

### 5. Token Authentication for APIs

```typescript
// ✅ Use tokens for API auth (fast)
const token = await auth.generate(capabilityId, 3600000, secret);
// Token validation: ~100-200 μs

// ❌ Avoid signing for every request (slow)
const signed = await signer.sign(request, keyPair);
// Signing: ~1-2 ms (10x slower)

// ✅ But use signing for non-repudiation
const signedTransaction = await signer.sign(transaction, keyPair);
database.save(signedTransaction); // Provable authenticity
```

### 6. Reuse Crypto Keys

```typescript
// ❌ Bad: Generate keys every time (100ms+ each!)
async function sign(message: Message) {
  const keyPair = await signer.generateKeyPair();
  return signer.sign(message, keyPair.value);
}

// ✅ Good: Generate once, reuse
const keyPair = await signer.generateKeyPair(); // One-time cost

async function sign(message: Message) {
  return signer.sign(message, keyPair);
}
```

### 7. Profile Before Optimizing

```typescript
// Use Bun's built-in profiler
console.time('operation');
await expensiveOperation();
console.timeEnd('operation');

// Or use performance API
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`Took ${duration}ms`);
```

## Performance Patterns

### Pattern 1: Message Pipelines

```typescript
// Chain mailboxes for processing pipelines
const inputMailbox = createAsyncMailbox<RawData>();
const processMailbox = createAsyncMailbox<ProcessedData>();
const outputMailbox = createAsyncMailbox<Result>();

inputMailbox.onMessage(async (raw) => {
  const processed = await transform(raw);
  processMailbox.send(processed);
});

processMailbox.onMessage(async (data) => {
  const result = await analyze(data);
  outputMailbox.send(result);
});

// High throughput: ~100K items/sec
```

### Pattern 2: Content Deduplication

```typescript
// Store messages in CAS to avoid redundant storage
const cas = createInMemoryCAS<Message>();
const addresses = new Set<ContentAddress>();

for (const message of messages) {
  const result = await cas.put(message);
  if (isOk(result)) {
    addresses.add(result.value);
  }
}

// 1000 identical messages → 1 CAS entry
// 90%+ space savings for duplicates
```

### Pattern 3: Request/Reply with Timeout

```typescript
import { requestWithTimeout } from '@servicejs/request-reply';

// Fast path: most responses within timeout
const result = await requestWithTimeout(
  capability,
  { type: 'query', id: 123 },
  1000 // 1 second timeout
);

if (isOk(result)) {
  // Got response quickly
} else if (result.error.type === 'TIMEOUT') {
  // Handle slow/missing response
}
```

### Pattern 4: Capability Caching

```typescript
// Cache capabilities to avoid repeated lookups
const capabilityCache = new Map<string, Capability<Message>>();

function getCapability(id: string): Capability<Message> {
  let cap = capabilityCache.get(id);
  if (!cap) {
    cap = createCapability(id);
    capabilityCache.set(id, cap);
  }
  return cap;
}

// Avoids repeated capability creation overhead
```

## Common Performance Pitfalls

### ❌ Pitfall 1: Sending Large Data in Messages

```typescript
// Bad: Send 10MB file in message
mailbox.send({ type: 'file', data: largeBuffer });

// Good: Store in CAS, send address
const address = await cas.put(largeBuffer);
mailbox.send({ type: 'file', address });
```

### ❌ Pitfall 2: Synchronous I/O in Message Handlers

```typescript
// Bad: Sync I/O blocks message processing
mailbox.onMessage((msg) => {
  const data = fs.readFileSync(msg.path); // Blocks!
  process(data);
});

// Good: Use async I/O
mailbox.onMessage(async (msg) => {
  const data = await fs.promises.readFile(msg.path);
  process(data);
});
```

### ❌ Pitfall 3: Creating Capabilities in Hot Paths

```typescript
// Bad: Create capability for every message
messages.forEach(msg => {
  const cap = createCapability(() => console.log(msg));
  cap.send(msg);
});

// Good: Reuse capabilities
const cap = createCapability((msg) => console.log(msg));
messages.forEach(msg => cap.send(msg));
```

### ❌ Pitfall 4: Unnecessary Encryption

```typescript
// Bad: Encrypt everything (10ms per message)
const encrypted = await encryptor.encrypt(msg, publicKey, privateKey);
send(encrypted);

// Good: Use encryption only for sensitive data
if (msg.sensitive) {
  const encrypted = await encryptor.encrypt(msg, publicKey, privateKey);
  send(encrypted);
} else {
  send(msg); // Plain message
}
```

## Benchmarking Your Code

Example benchmark script:

```typescript
import { bench, run } from 'mitata';

// Benchmark message processing
bench('process 100 messages', async () => {
  const mailbox = createAsyncMailbox<Message>();
  let count = 0;

  mailbox.onMessage(async (msg) => {
    count++;
  });

  for (let i = 0; i < 100; i++) {
    mailbox.send({ type: 'test', value: i });
  }

  await mailbox.flush();
});

await run();
```

## Performance Monitoring

### Metrics to Track

1. **Message Throughput**: Messages processed per second
2. **Message Latency**: Time from send to handler completion
3. **Queue Depth**: Number of pending messages
4. **Memory Usage**: Heap size and garbage collection
5. **CAS Hit Rate**: Deduplication effectiveness

### Example Monitoring

```typescript
class PerformanceMonitor {
  private messageCount = 0;
  private totalLatency = 0;
  private startTime = Date.now();

  recordMessage(latencyMs: number) {
    this.messageCount++;
    this.totalLatency += latencyMs;
  }

  getStats() {
    const elapsed = Date.now() - this.startTime;
    return {
      throughput: (this.messageCount / elapsed) * 1000, // msg/sec
      avgLatency: this.totalLatency / this.messageCount, // ms
      totalMessages: this.messageCount,
    };
  }
}

// Use with mailbox
const monitor = new PerformanceMonitor();

mailbox.onMessage(async (msg) => {
  const start = performance.now();
  await handleMessage(msg);
  const latency = performance.now() - start;
  monitor.recordMessage(latency);
});

// Check stats periodically
setInterval(() => {
  console.log(monitor.getStats());
}, 10000);
```

## Platform-Specific Notes

### Bun
- Fastest JavaScript runtime
- Excellent async performance
- Built-in profiler and testing
- **Recommended for production**

### Node.js
- Good performance on v16+
- Web Crypto API available v15.0.0+
- Use `--max-old-space-size` for large heaps

### Deno
- Good TypeScript performance
- Built-in Web Crypto API
- Secure by default

### Browsers
- Web Crypto API widely supported
- Use Web Workers for parallel processing
- IndexedDB for persistent CAS

### Cloudflare Workers
- Extremely fast cold starts
- 128MB memory limit
- Use KV for persistent storage

## Conclusion

ServiceJS is designed for high performance with:

- **Sync mailboxes**: 5M msg/sec
- **Result types**: 2-3x faster than exceptions
- **Token auth**: 100-200 μs per operation
- **CAS deduplication**: Automatic and efficient

Follow the optimization strategies above to build high-performance capability-based systems!

## See Also

- [Benchmarks Source Code](./benchmarks/)
- [Architecture Guide](./ARCHITECTURE.md)
- [Design Document](./DESIGN_DOC.md)
