# Node.js Worker Runtime Examples

This directory contains examples demonstrating how to use the `@servicejs/runtime-node-worker` package.

## Prerequisites

```bash
bun install
bun run build
```

## Running Examples

### 01 - Basic Worker Communication

Demonstrates basic worker thread creation and bidirectional communication using the ParentPort capability.

```bash
bun examples/01-basic-worker.ts
```

**Key concepts:**
- Creating worker threads
- Sending messages between main thread and worker
- Using workerData for initial configuration
- Graceful shutdown

### 02 - File Operations

Demonstrates file system operations in a worker thread using the FilesystemCapability.

```bash
bun examples/02-file-operations.ts
```

**Key concepts:**
- Creating directories
- Writing and reading files
- Listing directory contents
- Getting file stats
- Cleaning up resources

### 03 - HTTP Requests

Demonstrates making HTTP requests in a worker thread using the HTTPCapability.

```bash
bun examples/03-http-requests.ts
```

**Key concepts:**
- Making GET requests
- Making POST requests with JSON body
- Custom request headers
- Parsing JSON responses
- Error handling

## Example Structure

Each example consists of two files:

1. **Main thread file** (e.g., `01-basic-worker.ts`)
   - Creates and manages the worker
   - Sends messages to the worker
   - Handles messages from the worker

2. **Worker thread file** (e.g., `01-basic-worker-thread.ts`)
   - Bootstraps the ServiceJS runtime
   - Handles messages from main thread
   - Uses runtime capabilities
   - Sends responses back to main thread

## Capabilities Used

These examples demonstrate the following capabilities:

- **EnvironmentCapability**: Access environment variables and worker data
- **TimeCapability**: Get current timestamps
- **CryptoCapability**: Generate UUIDs and random values
- **FilesystemCapability**: Read/write files and directories
- **HTTPCapability**: Make HTTP requests
- **ConsoleCapability**: Logging output
- **ParentPortCapability**: Bidirectional communication with main thread
- **LifecycleCapability**: Graceful shutdown handling

## Notes

- Workers run in isolated contexts but share the same process
- Workers can access the file system and make network requests
- Workers do not have access to stdin (use ParentPort for communication)
- Use workerData to pass initial configuration from main thread to worker
- Always handle worker errors and exits gracefully
