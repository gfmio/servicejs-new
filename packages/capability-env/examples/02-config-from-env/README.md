# Configuration from Environment Variables

This example demonstrates how to build a typed application configuration object from environment variables.

## Features

- Type-safe configuration builder
- Required vs optional environment variables
- Default values for missing variables
- Environment variable validation
- Complex nested configuration structures

## Installation

```bash
bun install
```

## Usage

```bash
# Run once
bun start

# Run in watch mode
bun dev
```

## Expected Output

```json
{
  "environment": "production",
  "server": {
    "port": 8080,
    "host": "0.0.0.0"
  },
  "database": {
    "url": "postgresql://localhost:5432/myapp",
    "poolSize": 20
  },
  "features": {
    "debug": false,
    "analytics": true
  }
}
```
