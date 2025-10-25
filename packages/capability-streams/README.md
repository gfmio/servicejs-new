# @servicejs/capability-streams

Standard I/O streams capability interface for ServiceJS.

Provides platform-agnostic access to stdin, stdout, and stderr without ambient authority.

## Installation

```bash
bun add @servicejs/capability-streams
```

## Features

- **No Ambient Authority** - Stream access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser (limited), Deno, etc.
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - In-memory implementations for easy testing
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions

## Usage

### In Tests

```typescript
import { createInMemoryStreams } from '@servicejs/capability-streams';
import { isOk } from '@servicejs/result';

const streams = createInMemoryStreams({
  stdinLines: ['Alice', 'Bob', 'Charlie'],
});

// Read from stdin
const name = await streams.stdin.readLine();
if (isOk(name)) {
  console.log(`Hello, ${name.value}!`); // "Hello, Alice!"
}

// Write to stdout
await streams.stdout.writeLine('Output message');

// Write to stderr
await streams.stderr.writeLine('Error message');

// Verify output in tests
const output = streams.stdout.getLines();
expect(output).toEqual(['Output message']);

const errors = streams.stderr.getLines();
expect(errors).toEqual(['Error message']);
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';
import { isOk } from '@servicejs/result';

const runtime = bootstrap();

// Read from stdin
const line = await runtime.streams.stdin.readLine();
if (isOk(line)) {
  // Write to stdout
  await runtime.streams.stdout.writeLine(`You entered: ${line.value}`);
} else {
  // Write error to stderr
  await runtime.streams.stderr.writeLine(`Error: ${line.error.message}`);
}
```

## API

### StreamsCapability

```typescript
interface StreamsCapability {
  readonly stdin: StdinCapability;
  readonly stdout: StdoutCapability;
  readonly stderr: StderrCapability;
}
```

### StdinCapability

```typescript
interface StdinCapability {
  readLine(): Promise<Result<string, StreamError>>;
  readAll(): Promise<Result<string, StreamError>>;
  isTTY(): boolean;
}
```

### StdoutCapability

```typescript
interface StdoutCapability {
  write(data: string): Promise<Result<void, StreamError>>;
  writeLine(data: string): Promise<Result<void, StreamError>>;
  isTTY(): boolean;
}
```

### StderrCapability

```typescript
interface StderrCapability {
  write(data: string): Promise<Result<void, StreamError>>;
  writeLine(data: string): Promise<Result<void, StreamError>>;
  isTTY(): boolean;
}
```

### StreamError

```typescript
interface StreamError {
  readonly code: StreamErrorCode;
  readonly message: string;
}

type StreamErrorCode =
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'NOT_READABLE'
  | 'NOT_WRITABLE'
  | 'CLOSED'
  | 'UNKNOWN';
```

## In-Memory Implementation

### createInMemoryStreams

Create in-memory streams for testing.

```typescript
function createInMemoryStreams(options?: {
  stdinLines?: string[];
}): InMemoryStreamsCapability;
```

**Example:**

```typescript
const streams = createInMemoryStreams({
  stdinLines: ['Line 1', 'Line 2', 'Line 3'],
});

// Read lines
const line1 = await streams.stdin.readLine();
const line2 = await streams.stdin.readLine();

// Write output
await streams.stdout.writeLine('Output 1');
await streams.stdout.writeLine('Output 2');

// Verify output
const outputLines = streams.stdout.getLines();
expect(outputLines).toEqual(['Output 1', 'Output 2']);

const fullOutput = streams.stdout.getData();
expect(fullOutput).toBe('Output 1\nOutput 2\n');
```

### InMemoryStdin

Extended stdin with testing utilities.

```typescript
interface InMemoryStdin extends StdinCapability {
  addLines(...lines: string[]): void;
  addData(data: string): void;
  isEmpty(): boolean;
  clear(): void;
}
```

**Example:**

```typescript
const stdin = createInMemoryStdin();

stdin.addLines('Alice', 'Bob');
stdin.addData('Partial line\n');

const line1 = await stdin.readLine(); // 'Partial line'
const line2 = await stdin.readLine(); // 'Alice'

stdin.clear();
expect(stdin.isEmpty()).toBe(true);
```

### InMemoryStdout / InMemoryStderr

Extended output streams with testing utilities.

```typescript
interface InMemoryStdout extends StdoutCapability {
  getLines(): readonly string[];
  getData(): string;
  clear(): void;
}
```

**Example:**

```typescript
const stdout = createInMemoryStdout();

await stdout.write('Partial ');
await stdout.writeLine('complete line');
await stdout.write('Another partial');

const lines = stdout.getLines(); // ['complete line']
const data = stdout.getData(); // 'Partial complete line\nAnother partial'

stdout.clear();
expect(stdout.getData()).toBe('');
```

## Examples

### Echo Program

```typescript
const streams = createInMemoryStreams({
  stdinLines: ['Hello', 'World'],
});

// Read and echo each line
while (true) {
  const line = await streams.stdin.readLine();
  if (!line.ok) break;

  await streams.stdout.writeLine(`Echo: ${line.value}`);
}

// Verify output
const output = streams.stdout.getLines();
expect(output).toEqual(['Echo: Hello', 'Echo: World']);
```

### Interactive Prompt

```typescript
import { isOk } from '@servicejs/result';

async function prompt(streams: StreamsCapability, question: string): Promise<string> {
  await streams.stdout.write(question);

  const answer = await streams.stdin.readLine();
  if (isOk(answer)) {
    return answer.value;
  }

  throw new Error('Failed to read input');
}

// In tests
const streams = createInMemoryStreams({
  stdinLines: ['Alice'],
});

const name = await prompt(streams, 'What is your name? ');
expect(name).toBe('Alice');

const output = streams.stdout.getData();
expect(output).toBe('What is your name? ');
```

### Error Logging

```typescript
const streams = createInMemoryStreams();

async function logError(message: string) {
  await streams.stderr.writeLine(`[ERROR] ${message}`);
}

async function logInfo(message: string) {
  await streams.stdout.writeLine(`[INFO] ${message}`);
}

await logInfo('Application started');
await logError('Failed to connect');
await logInfo('Retrying...');

// Verify separate streams
expect(streams.stdout.getLines()).toEqual([
  '[INFO] Application started',
  '[INFO] Retrying...',
]);
expect(streams.stderr.getLines()).toEqual([
  '[ERROR] Failed to connect',
]);
```

### Reading All Input

```typescript
const streams = createInMemoryStreams({
  stdinLines: ['Line 1', 'Line 2', 'Line 3'],
});

const allInput = await streams.stdin.readAll();
if (isOk(allInput)) {
  console.log(allInput.value); // 'Line 1\nLine 2\nLine 3'
}

// After readAll, stdin is empty
expect(streams.stdin.isEmpty()).toBe(true);
```

### Handling Partial Data

```typescript
const stdin = createInMemoryStdin();

// Add data with and without newlines
stdin.addData('First ');
stdin.addData('part\nSecond ');
stdin.addData('part');

const line1 = await stdin.readLine(); // 'First part'
const line2 = await stdin.readLine(); // 'Second part'
```

## createNoOpStreams

Create no-op streams where stdin fails and output succeeds silently.

```typescript
function createNoOpStreams(): StreamsCapability;
```

**Use cases:**
- Testing error handling
- Disabling I/O
- Security sandboxing

**Example:**

```typescript
const streams = createNoOpStreams();

// stdin fails
const line = await streams.stdin.readLine();
expect(isErr(line)).toBe(true);
expect(line.error.code).toBe('NOT_READABLE');

// stdout/stderr succeed silently
const result1 = await streams.stdout.write('test');
expect(isOk(result1)).toBe(true);

const result2 = await streams.stderr.writeLine('error');
expect(isOk(result2)).toBe(true);
```

## Testing

```typescript
import { test, expect } from 'bun:test';
import { isOk } from '@servicejs/result';
import { createInMemoryStreams } from '@servicejs/capability-streams';

test('processes user input', async () => {
  const streams = createInMemoryStreams({
    stdinLines: ['Alice', '25'],
  });

  // Read name
  const name = await streams.stdin.readLine();
  expect(isOk(name)).toBe(true);
  if (!isOk(name)) return;

  // Read age
  const age = await streams.stdin.readLine();
  expect(isOk(age)).toBe(true);
  if (!isOk(age)) return;

  // Process and output
  await streams.stdout.writeLine(`Name: ${name.value}`);
  await streams.stdout.writeLine(`Age: ${age.value}`);

  // Verify output
  const output = streams.stdout.getLines();
  expect(output).toEqual(['Name: Alice', 'Age: 25']);
});
```

## TTY Detection

```typescript
const streams = runtime.streams;

if (streams.stdin.isTTY()) {
  // Interactive mode
  await streams.stdout.write('Enter your name: ');
  const name = await streams.stdin.readLine();
  // ...
} else {
  // Piped input mode
  const allInput = await streams.stdin.readAll();
  // ...
}
```

## Platform Implementations

This package provides the interface and in-memory implementation. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js (process.stdin/stdout/stderr)
- **@servicejs/runtime-browser** - Browser (limited - no stdin in browsers)
- **@servicejs/runtime-deno** - Deno (Deno.stdin/stdout/stderr)
- **@servicejs/runtime-cloudflare** - Cloudflare Workers (no standard streams)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access streams directly; they receive a capability
2. **Explicit Grants** - Stream access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with in-memory implementations
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across different JavaScript runtimes

## License

MIT
