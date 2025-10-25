# Cleanup on Exit Example

This example demonstrates how to cleanup temporary files and resources when the application exits.

## Features

- Temporary resource tracking
- Ordered cleanup execution (LIFO)
- Async cleanup operations
- Cleanup verification
- Simulated file/directory deletion

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
Cleanup on Exit Example

Creating temporary resources...

Temporary files:
  - /tmp/app-12345.log
  - /tmp/cache-67890.dat

Temporary directories:
  - /tmp/upload-abc

Triggering application exit...

[Step 1] Removing temporary files...
  Removing /tmp/app-12345.log
  Removing /tmp/cache-67890.dat
[Step 2] Removing temporary directories...
  Removing /tmp/upload-abc
[Step 3] Final cleanup verification...
  Temp files remaining: 0
  Temp dirs remaining: 0
  All cleanup complete!

Cleanup finished!
```
