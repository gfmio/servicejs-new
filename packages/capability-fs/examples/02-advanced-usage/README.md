# File Tree Manipulation Example

This example demonstrates advanced file tree operations with the in-memory filesystem.

## Features

- Create nested directory structures
- Walk directory trees recursively
- Count files by extension
- Copy files
- Remove directories recursively
- Pretty-print file trees

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
File Tree Manipulation Example

Creating directory structure...
✓ Directory structure created

Project structure:
📁 /project
  📁 docs
    📄 README.md
  📁 src
    📄 index.js
    📄 utils.js
  📁 tests
    📄 index.test.js
  📄 package.json


File statistics:
  .json: 1 file(s)
  .js: 3 file(s)
  .md: 1 file(s)


Copying src/index.js to src/index.backup.js...
✓ File copied

Removing /project/tests directory...
✓ Directory removed

Final structure:
📁 /project
  📁 docs
    📄 README.md
  📁 src
    📄 index.backup.js
    📄 index.js
    📄 utils.js
  📄 package.json
```
