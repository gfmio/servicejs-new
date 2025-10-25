# Graceful Shutdown Example

This example demonstrates how to handle graceful shutdown with proper resource cleanup.

## Features

- Multiple shutdown handlers
- LIFO execution order (last registered runs first)
- Async cleanup operations
- Shutdown signal with timestamp and reason
- Resource state management

## Installation

```bash
bun install
```

## Usage

```bash
bun start
```

## Expected Output

```
Graceful Shutdown Example

Application running with 3 resources:
  Database: connected
  Cache: connected
  Queue: connected

Triggering shutdown...

Shutdown signal received: User requested shutdown
Timestamp: 2024-01-01T12:00:00.000Z

Cleaning up database connection...
Database disconnected
Cleaning up cache connection...
Cache disconnected
Cleaning up queue connection...
Queue disconnected

Final resource states:
  Database: disconnected
  Cache: disconnected
  Queue: disconnected

Shutdown complete!
```
