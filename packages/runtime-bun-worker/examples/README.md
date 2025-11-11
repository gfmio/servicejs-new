# Bun Worker Runtime Examples

Examples demonstrating `@servicejs/runtime-bun-worker` usage.

## Running Examples

```bash
bun examples/01-basic-worker.ts
bun examples/02-file-operations.ts
bun examples/03-http-requests.ts
```

## Examples

### 01 - Basic Worker Communication
Worker creation and bidirectional communication using the `self` capability.

### 02 - File Operations
File system operations in a worker thread using the FilesystemCapability.

### 03 - HTTP Requests
Making HTTP requests in a worker thread using the HTTPCapability.

## Example Structure

Each example has two files:
1. **Main thread file** - Creates and manages the worker
2. **Worker thread file** - Bootstraps runtime and handles messages

## Capabilities Demonstrated

- **EnvironmentCapability**: Environment variables
- **TimeCapability**: Timestamps
- **CryptoCapability**: UUIDs and random values
- **FilesystemCapability**: File operations
- **HTTPCapability**: HTTP requests
- **ConsoleCapability**: Logging
- **WorkerSelfCapability**: Worker communication
- **LifecycleCapability**: Graceful shutdown
