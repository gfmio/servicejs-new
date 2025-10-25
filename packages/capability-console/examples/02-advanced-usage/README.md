# No-Op Console Example

This example demonstrates how to use the no-op console for silent operation.

## Features

- Discard all log messages
- Zero overhead logging
- Useful for silent mode
- Conditional logging based on verbosity

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
No-Op Console Example

Logging to no-op console (nothing will be captured)...
✓ All messages successfully discarded

Logging to buffered console...
✓ Captured 3 messages

Verbose logger: buffered
Silent logger: no-op
```

## Use Cases

- Testing: Silence logs during tests
- Performance: Zero-cost logging when disabled
- Configuration: Toggle logging based on environment
- Debugging: Conditional verbose output
