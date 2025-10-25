# @servicejs/capability-fs

Filesystem capability interface for ServiceJS.

Provides platform-agnostic filesystem operations without ambient authority.

## Installation

```bash
bun add @servicejs/capability-fs
```

## Features

- **No Ambient Authority** - Filesystem access is explicitly granted via capabilities
- **Platform Agnostic** - Same interface works across Node.js, browser (with File System Access API), Deno, etc.
- **Type Safe** - Full TypeScript support with Result types
- **Test Friendly** - In-memory and no-op implementations for testing
- **Never Throws** - All operations return `Result<T, E>` instead of throwing exceptions

## Usage

### In Tests

```typescript
import { createInMemoryFS } from '@servicejs/capability-fs';

const fs = createInMemoryFS({
  '/config.json': '{"key": "value"}',
  '/data/test.txt': 'Hello, world!',
});

// Read file
const content = await fs.readFile('/config.json', { encoding: 'utf8' });
if (content.ok) {
  const config = JSON.parse(content.value as string);
  console.log(config.key); // "value"
}

// Write file
const writeResult = await fs.writeFile(
  '/data/output.txt',
  'New content',
  { encoding: 'utf8' }
);

// List directory
const entries = await fs.readdir('/data');
if (entries.ok) {
  for (const entry of entries.value) {
    console.log(entry.name, entry.isDirectory ? 'dir' : 'file');
  }
}
```

### In Production

```typescript
import { bootstrap } from '@servicejs/runtime-node';

const runtime = bootstrap();

// Read configuration file
const configResult = await runtime.fs.readFile('./config.json', { encoding: 'utf8' });
if (configResult.ok) {
  const config = JSON.parse(configResult.value as string);
  // Use config...
}

// Write log file
await runtime.fs.writeFile(
  './logs/app.log',
  `${new Date().toISOString()} - Application started\n`,
  { encoding: 'utf8', createDirs: true }
);
```

## API

### FilesystemCapability

```typescript
interface FilesystemCapability {
  readFile(path: string, options?: ReadFileOptions): Promise<Result<string | Uint8Array, FSError>>;
  writeFile(path: string, data: string | Uint8Array, options?: WriteFileOptions): Promise<Result<void, FSError>>;
  exists(path: string): Promise<Result<boolean, FSError>>;
  stat(path: string): Promise<Result<FileStats, FSError>>;
  readdir(path: string): Promise<Result<readonly DirectoryEntry[], FSError>>;
  mkdir(path: string, options?: MkdirOptions): Promise<Result<void, FSError>>;
  remove(path: string, options?: RemoveOptions): Promise<Result<void, FSError>>;
}
```

### ReadFileOptions

```typescript
interface ReadFileOptions {
  encoding?: 'utf8' | 'utf-8' | 'binary'; // Default: 'utf8'
}
```

### WriteFileOptions

```typescript
interface WriteFileOptions {
  encoding?: 'utf8' | 'utf-8' | 'binary'; // Default: 'utf8'
  createDirs?: boolean; // Create parent directories if they don't exist
}
```

### MkdirOptions

```typescript
interface MkdirOptions {
  recursive?: boolean; // Create parent directories if needed
}
```

### RemoveOptions

```typescript
interface RemoveOptions {
  recursive?: boolean; // Remove directories and their contents
}
```

### FileStats

```typescript
interface FileStats {
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
  readonly size: number;
  readonly createdAt: number; // Timestamp in milliseconds
  readonly modifiedAt: number;
  readonly accessedAt: number;
}
```

### DirectoryEntry

```typescript
interface DirectoryEntry {
  readonly name: string;
  readonly isFile: boolean;
  readonly isDirectory: boolean;
  readonly isSymlink: boolean;
}
```

### FSError

```typescript
interface FSError {
  readonly code: FSErrorCode;
  readonly message: string;
  readonly path?: string;
}

type FSErrorCode =
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'ALREADY_EXISTS'
  | 'NOT_A_FILE'
  | 'NOT_A_DIRECTORY'
  | 'NOT_EMPTY'
  | 'INVALID_PATH'
  | 'READ_ERROR'
  | 'WRITE_ERROR'
  | 'UNKNOWN';
```

## Implementations

### createInMemoryFS

Create an in-memory filesystem for testing.

```typescript
function createInMemoryFS(
  initialFiles?: Record<string, string | Uint8Array>
): FilesystemCapability;
```

**Features:**
- Fully functional filesystem in memory
- Fast and deterministic
- Perfect for unit tests
- Supports all filesystem operations

**Example:**

```typescript
const fs = createInMemoryFS({
  '/config.json': '{"port": 3000}',
  '/data/users.json': '[]',
});

// Files and directories are created automatically
await fs.readFile('/config.json'); // OK
await fs.readdir('/data'); // OK - contains users.json
```

### createNoOpFS

Create a no-op filesystem where all operations fail.

```typescript
function createNoOpFS(): FilesystemCapability;
```

**Use cases:**
- Testing error handling
- Disabling filesystem access
- Security sandboxing

**Example:**

```typescript
const fs = createNoOpFS();

const result = await fs.readFile('/any/path');
// result.ok === false
// result.error.code === 'PERMISSION_DENIED'
```

## Error Handling

All operations return `Result<T, FSError>` and never throw exceptions.

```typescript
import { isOk, isErr } from '@servicejs/result';

const result = await fs.readFile('/config.json', { encoding: 'utf8' });

if (isOk(result)) {
  const content = result.value;
  console.log('File content:', content);
} else {
  const error = result.error;
  console.error(`Failed to read file: ${error.code} - ${error.message}`);
}
```

## Binary Data

```typescript
// Write binary data
const binaryData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
await fs.writeFile('/data.bin', binaryData);

// Read binary data
const result = await fs.readFile('/data.bin', { encoding: 'binary' });
if (isOk(result)) {
  const data = result.value as Uint8Array;
  console.log(data); // Uint8Array(5) [72, 101, 108, 108, 111]
}
```

## Directory Operations

```typescript
// Create directory
await fs.mkdir('/data/logs');

// Create directory with parents
await fs.mkdir('/deep/nested/path', { recursive: true });

// List directory
const entries = await fs.readdir('/data');
if (isOk(entries)) {
  for (const entry of entries.value) {
    console.log(`${entry.name} - ${entry.isDirectory ? 'DIR' : 'FILE'}`);
  }
}

// Remove directory (must be empty)
await fs.remove('/data/empty-dir');

// Remove directory recursively
await fs.remove('/data/logs', { recursive: true });
```

## File Statistics

```typescript
const statResult = await fs.stat('/data/file.txt');

if (isOk(statResult)) {
  const stats = statResult.value;
  console.log('Is file:', stats.isFile);
  console.log('Size:', stats.size, 'bytes');
  console.log('Created:', new Date(stats.createdAt));
  console.log('Modified:', new Date(stats.modifiedAt));
}
```

## Platform Implementations

This package provides the interface and test implementations. Platform-specific implementations are provided by runtime packages:

- **@servicejs/runtime-node** - Node.js filesystem (fs/promises)
- **@servicejs/runtime-browser** - Browser File System Access API
- **@servicejs/runtime-deno** - Deno filesystem
- **@servicejs/runtime-cloudflare** - Cloudflare R2 (if available)

## Design Philosophy

This package follows ServiceJS's capability-based security model:

1. **No Ambient Authority** - Applications don't access the filesystem directly; they receive a capability
2. **Explicit Grants** - Filesystem access must be explicitly granted by the runtime
3. **Testable** - Easy to substitute with in-memory or no-op implementations
4. **Type Safe** - Full TypeScript support with Result types for error handling
5. **Platform Agnostic** - Same interface across all JavaScript runtimes

## License

MIT
