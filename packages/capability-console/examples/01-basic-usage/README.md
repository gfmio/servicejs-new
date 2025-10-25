# Buffered Console Example

This example demonstrates how to use buffered console for capturing log messages in tests.

## Features

- Capture all log messages (log, info, warn, error, debug)
- Retrieve logs with timestamps
- Clear log buffer
- Perfect for testing logging behavior

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
Buffered Console Example

Captured 5 log entries:

[LOG] 2024-01-01T12:00:00.000Z
  Message: This is a regular log message

[INFO] 2024-01-01T12:00:00.001Z
  Message: This is an info message

[WARN] 2024-01-01T12:00:00.002Z
  Message: This is a warning message

[ERROR] 2024-01-01T12:00:00.003Z
  Message: This is an error message

[DEBUG] 2024-01-01T12:00:00.004Z
  Message: This is a debug message

Buffer cleared
Log entries after clear: 0
```
