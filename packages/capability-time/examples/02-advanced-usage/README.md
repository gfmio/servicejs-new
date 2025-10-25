# Interval Scheduling Example

This example demonstrates how to simulate periodic tasks with fake time and interval timers.

## Features

- `setInterval()` for periodic execution
- `clearInterval()` to cancel intervals
- Controlled execution with `tick()`
- Event tracking and verification

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
Interval Scheduling Example

Starting interval (fires every 100ms)...

Interval 1 at 100ms
Interval 2 at 200ms
Interval 3 at 300ms
Interval 4 at 400ms
Interval 5 at 500ms

Interval cancelled after 5 executions

Total time elapsed: 600ms
Total events: 5

Advancing 200ms more (should not fire)...
Final time: 800ms
Final event count: 5
```
