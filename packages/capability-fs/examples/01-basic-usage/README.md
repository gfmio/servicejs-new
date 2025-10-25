# In-Memory Filesystem Example

This example demonstrates basic in-memory filesystem operations.

## Features

- Read/write files
- Create/remove directories
- List directory contents
- Get file stats
- Initial file population
- UTF-8 and binary file support

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
In-Memory Filesystem Example

Reading /config.json...
Config: { app: 'myapp', version: '1.0.0' }

Writing /data/products.txt...
✓ File written successfully

Listing /data directory...
Files in /data:
  - users.txt (file)
  - products.txt (file)

Getting stats for /data/users.txt...
  Size: 19 bytes
  Type: file
  Created: 2024-01-01T12:00:00.000Z

Creating /tmp directory...
✓ Directory created

Removing /logs/app.log...
✓ File removed

Filesystem operations complete!
```
