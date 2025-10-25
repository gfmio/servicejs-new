# Fake Timer Example

This example demonstrates how to use fake time for controlled time simulation in tests.

## Features

- Manual time control with `tick()`
- Scheduling timeouts at specific times
- Deterministic timer execution
- Perfect for testing time-dependent code

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
Fake Timer Example

Start time: 2024-01-01T00:00:00.000Z

Scheduling timers...

Advancing time by 1.5 seconds...
[Timer 1] Fired at 2024-01-01T00:00:01.000Z
Current time: 2024-01-01T00:00:01.500Z

Advancing time by 2 seconds...
[Timer 2] Fired at 2024-01-01T00:00:02.000Z
[Timer 3] Fired at 2024-01-01T00:00:03.000Z

Final time: 2024-01-01T00:00:03.500Z
```
