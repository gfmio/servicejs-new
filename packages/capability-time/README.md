# @servicejs/capability-time

Time and scheduling capability for ServiceJS - platform-agnostic time operations.

## Features

- **No Ambient Authority** - Time access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser, Deno, edge runtimes
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - Fake time implementation for deterministic testing
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions
- **Controllable** - Advance time manually in tests for fast, predictable execution

## Installation

```bash
bun add @servicejs/capability-time
```

## Usage

### In Tests

```typescript
import { createFakeTime } from '@servicejs/capability-time';
import { isOk } from '@servicejs/result';

const time = createFakeTime(0); // Start at timestamp 0
let executed = false;

// Schedule a timeout
const result = time.setTimeout(() => {
  executed = true;
  console.log('Timer fired!');
}, 1000);

if (isOk(result)) {
  const cancel = result.value;

  // Time doesn't auto-advance - you control it
  console.log(time.now()); // 0

  // Advance time by 500ms
  time.advance(500);
  console.log(executed); // false (not enough time has passed)

  // Advance another 500ms
  time.advance(500);
  console.log(executed); // true (callback fired!)

  // Or use tick() to fast-forward to all pending timers
  time.tick(); // Fires all remaining timers
}
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';
import { isOk } from '@servicejs/result';

const runtime = bootstrap();

// Get current time
const now = runtime.time.now(); // milliseconds since Unix epoch

// Schedule delayed execution
const timeoutResult = runtime.time.setTimeout(() => {
  console.log('Executed after 1 second!');
}, 1000);

if (isOk(timeoutResult)) {
  const cancel = timeoutResult.value;

  // Cancel if needed
  // cancel();
}

// Schedule recurring execution
const intervalResult = runtime.time.setInterval(() => {
  console.log('Tick every second');
}, 1000);

if (isOk(intervalResult)) {
  const cancel = intervalResult.value;

  // Stop the interval later
  setTimeout(() => {
    cancel();
    console.log('Interval stopped');
  }, 5000);
}
```

## API

### TimeCapability

```typescript
interface TimeCapability {
  now(): number;
  setTimeout(callback: () => void, ms: number): Result<CancelFn, TimeError>;
  setInterval(callback: () => void, ms: number): Result<CancelFn, TimeError>;
  hrtime?(): bigint;
  highResolutionTime?(): Option<number>;
  clearTimeout?(id: TimerId): Result<void, TimeError>;
  clearInterval?(id: TimerId): Result<void, TimeError>;
}
```

### Methods

#### `now(): number`

Get current timestamp (milliseconds since Unix epoch).

```typescript
const timestamp = time.now(); // e.g., 1704067200000
const date = new Date(timestamp); // 2024-01-01T00:00:00.000Z
```

#### `setTimeout(callback, ms): Result<CancelFn, TimeError>`

Schedule a callback to run after a delay.

```typescript
const result = time.setTimeout(() => {
  console.log('Delayed execution');
}, 1000);

if (isOk(result)) {
  const cancel = result.value;

  // Cancel before it fires
  cancel();
}
```

#### `setInterval(callback, ms): Result<CancelFn, TimeError>`

Schedule a callback to run repeatedly at an interval.

```typescript
const result = time.setInterval(() => {
  console.log('Recurring execution');
}, 1000);

if (isOk(result)) {
  const cancel = result.value;

  // Stop the interval
  cancel();
}
```

#### `hrtime?(): bigint`

High-resolution time in nanoseconds (Node.js only).

```typescript
if (time.hrtime) {
  const start = time.hrtime();
  // ... do work ...
  const end = time.hrtime();
  const elapsedNs = end - start;
  console.log(`Took ${elapsedNs}ns`);
}
```

#### `highResolutionTime?(): Option<number>`

High-resolution time in milliseconds with decimal precision (cross-platform).

```typescript
import { isSome } from '@servicejs/option';

const start = time.highResolutionTime();
if (isSome(start)) {
  // ... do work ...
  const end = time.highResolutionTime();
  if (isSome(end)) {
    const elapsedMs = end.value - start.value;
    console.log(`Took ${elapsedMs}ms`);
  }
}
```

## Fake Time Implementation

### createFakeTime

Create a controllable time source for deterministic testing.

```typescript
function createFakeTime(startTime?: number): FakeTimeCapability;
```

**Features:**
- Time only advances when you call `advance()` or `tick()`
- Deterministic execution order
- No waiting in tests
- Full control over time progression

**Example:**

```typescript
const time = createFakeTime(1000000);

console.log(time.now()); // 1000000

const result = time.setTimeout(() => {
  console.log('Fired!');
}, 1000);

console.log(time.now()); // Still 1000000 (time doesn't auto-advance)

time.advance(500);
console.log(time.now()); // 1000500 (no callback yet)

time.advance(500);
// Logs 'Fired!'
console.log(time.now()); // 1001000
```

### FakeTimeCapability API

Extended interface for testing:

```typescript
interface FakeTimeCapability extends TimeCapability {
  advance(ms: number): void;
  tick(): void;
  pendingTimers(): number;
  reset(): void;
}
```

#### `advance(ms: number): void`

Advance time by the specified milliseconds and fire timers.

```typescript
time.setTimeout(() => console.log('A'), 100);
time.setTimeout(() => console.log('B'), 200);

time.advance(150); // Logs 'A'
time.advance(100); // Logs 'B'
```

#### `tick(): void`

Fire all pending timers immediately and advance to the latest timer.

```typescript
time.setTimeout(() => console.log('A'), 1000);
time.setTimeout(() => console.log('B'), 5000);
time.setTimeout(() => console.log('C'), 10000);

time.tick(); // Immediately logs 'A', 'B', 'C' in order
console.log(time.now()); // 10000
```

#### `pendingTimers(): number`

Get count of active (non-cancelled) timers.

```typescript
time.setTimeout(() => {}, 100);
time.setTimeout(() => {}, 200);
console.log(time.pendingTimers()); // 2

time.advance(150);
console.log(time.pendingTimers()); // 1 (first timer fired)
```

#### `reset(): void`

Clear all timers and reset time to initial value.

```typescript
const time = createFakeTime(1000);
time.setTimeout(() => {}, 100);
time.advance(50);

console.log(time.now()); // 1050
console.log(time.pendingTimers()); // 1

time.reset();

console.log(time.now()); // 1000
console.log(time.pendingTimers()); // 0
```

## Examples

### Testing Time-Dependent Code

```typescript
import { createFakeTime } from '@servicejs/capability-time';

function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
  time: TimeCapability
): T {
  let timeoutCancel: (() => void) | null = null;

  return ((...args: any[]) => {
    if (timeoutCancel) timeoutCancel();

    const result = time.setTimeout(() => fn(...args), delay);
    if (result.ok) {
      timeoutCancel = result.value;
    }
  }) as T;
}

// Test debounce with fake time
test('debounce delays execution', () => {
  const time = createFakeTime(0);
  let count = 0;
  const fn = debounce(() => { count++; }, 100, time);

  fn(); // Call 1
  fn(); // Call 2
  fn(); // Call 3

  expect(count).toBe(0); // Not executed yet

  time.advance(99);
  expect(count).toBe(0); // Still not executed

  time.advance(1);
  expect(count).toBe(1); // Executed once (last call)
});
```

### Simulating Periodic Tasks

```typescript
const time = createFakeTime(0);
const logs: number[] = [];

const result = time.setInterval(() => {
  logs.push(time.now());
}, 100);

// Run for 500ms
time.advance(500);

console.log(logs); // [100, 200, 300, 400, 500]

// Cancel interval
if (result.ok) {
  result.value();
}

// More time passes, but interval is cancelled
time.advance(1000);
console.log(logs); // Still [100, 200, 300, 400, 500]
```

### Timer Execution Order

```typescript
const time = createFakeTime(0);
const order: string[] = [];

time.setTimeout(() => order.push('C'), 300);
time.setTimeout(() => order.push('A'), 100);
time.setTimeout(() => order.push('B'), 200);

time.tick(); // Fire all timers

console.log(order); // ['A', 'B', 'C'] - chronological order
```

## createNoOpTime

Create a no-op time capability where timers never fire.

```typescript
function createNoOpTime(startTime?: number): TimeCapability;
```

**Use cases:**
- Testing error handling
- Disabling timer execution
- Security sandboxing

**Example:**

```typescript
const time = createNoOpTime();

time.setTimeout(() => {
  console.log('This will never run');
}, 1000);

// Time advances, but callback never fires
console.log(time.now()); // Increments on each call
```

## Error Handling

All operations return `Result<T, TimeError>` and never throw exceptions.

```typescript
import { isOk, isErr } from '@servicejs/result';

// Invalid delay
const result = time.setTimeout(() => {}, -100);

if (isErr(result)) {
  console.error(result.error.code); // 'INVALID_DELAY'
  console.error(result.error.message); // 'Delay must be non-negative, got -100'
}
```

### TimeError Codes

```typescript
type TimeErrorCode =
  | 'INVALID_DELAY'       // Negative delay value
  | 'CALLBACK_ERROR'      // Callback threw an error
  | 'ALREADY_CANCELLED'   // Timer already cancelled
  | 'INVALID_TIMER_ID'    // Invalid timer ID
  | 'TIMER_FAILED';       // Timer creation failed
```

## Platform Implementations

This package provides the interface and fake implementation. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (setTimeout, setInterval, process.hrtime)
- **@servicejs/runtime-browser** - Browser (setTimeout, setInterval, performance.now)
- **@servicejs/runtime-deno** - Deno (setTimeout, setInterval, performance.now)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (setTimeout, setInterval)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access timers directly; they receive a capability
2. **Explicit Grants** - Time access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with fake time for deterministic tests
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## License

MIT
