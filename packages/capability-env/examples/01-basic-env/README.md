# Basic Environment Variables Example

This example demonstrates basic environment variable reading using the in-memory environment capability.

## Features

- Reading individual environment variables
- Handling missing variables with Option types
- Getting all environment variables
- Accessing platform information

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

```
Environment Variables Example

NODE_ENV: development
API_KEY: test-key-12345
MISSING_VAR: (not set)

All variables:
  NODE_ENV: development
  API_KEY: test-key-12345
  PORT: 3000
  DEBUG: true

Platform: node
Version: 20.0.0
```
