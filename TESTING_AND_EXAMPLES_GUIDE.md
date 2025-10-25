# Testing and Examples Guide

This guide explains how to generate and run tests and examples for all ServiceJS runtime packages.

## Quick Start

### Generate All Tests and Examples

```bash
# Generate for all 11 runtimes
bun run scripts/generate-tests-and-examples.ts --all

# Or generate for a specific runtime
bun run scripts/generate-tests-and-examples.ts runtime-node
```

This will create:

- **Unit tests** in `packages/runtime-*/tests/bootstrap.test.ts`
- **E2E tests** in `packages/runtime-*/tests/e2e.test.ts`
- **E2E apps** in `packages/runtime-*/tests/e2e/apps/`
- **Examples** in `packages/runtime-*/examples/01-hello-world/` and `packages/runtime-*/examples/02-*/`

### Run Tests

```bash
# Run all tests for all runtimes
bun test

# Run tests for a specific runtime
cd packages/runtime-node
bun test

# Run only E2E tests
bun test e2e

# Run with coverage
bun test --coverage
```

### Run Examples

```bash
# Node.js example
cd packages/runtime-node/examples/01-hello-world
bun run src/index.ts

# Browser example (requires build step)
cd packages/runtime-browser/examples/01-counter
bun run dev  # Starts dev server

# Electron example
cd packages/runtime-electron/examples/01-hello-desktop
bun run start
```

## What Gets Generated

### Unit Tests (`tests/bootstrap.test.ts`)

Tests for each runtime include:

- Bootstrap creates runtime with all expected capabilities
- Environment capability returns correct platform
- Time capability works correctly
- Crypto generates valid UUIDs
- Lifecycle registers shutdown handlers
- Runtime-specific capabilities (filesystem, streams, IPC, etc.)

Example:

```typescript
test('bootstrap creates runtime with all capabilities', () => {
  const runtime = bootstrap();
  expect(runtime.env).toBeDefined();
  expect(runtime.time).toBeDefined();
  expect(runtime.lifecycle).toBeDefined();
  // ... more assertions
});
```

### E2E Tests (`tests/e2e.test.ts`)

End-to-end tests that actually run applications:

- **Hello World App**: Tests basic bootstrap and capability access
- **Todo App**: Tests filesystem, crypto, lifecycle in a real workflow

These tests spawn actual processes/browsers and verify output:

```typescript
test('e2e: hello-world app runs successfully', async () => {
  const result = await runApp(appPath);
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain('Hello, World!');
});
```

### E2E Apps (`tests/e2e/apps/`)

Two test applications per runtime:

1. **hello-world**: Minimal app testing core capabilities
2. **todo-app**: Comprehensive app testing all capabilities

### Examples (`packages/runtime-*/examples/`)

Two examples per runtime (22 total):

1. **01-hello-world**: Basic usage demonstration
2. **02-[feature]**: Advanced feature demonstration
   - File operations (Node.js, Deno, Bun)
   - UI interactions (Browser, React Native)
   - IPC communication (Electron)
   - Window management (Tauri)
   - etc.

## Test Strategy by Runtime Type

### Server-Side Runtimes (Node.js, Deno, Bun)

**Unit Tests:**

- All 8 core capabilities
- Filesystem operations
- Stream operations
- Process information

**E2E Tests:**

- Spawn process and capture stdout/stderr
- Verify exit codes
- Test file system operations in real environment

**Examples:**

- Hello World (basic)
- File Server / CLI Tool (advanced)

### Browser-Based Runtimes (Browser, Workers)

**Unit Tests:**

- Core capabilities (env, time, console, http, crypto)
- Window/DOM operations (main thread)
- Message passing (workers)
- Storage operations (localStorage, IndexedDB)

**E2E Tests:**

- Use Playwright to launch browser
- Interact with UI elements
- Verify console output
- Test worker communication

**Examples:**

- Counter App (basic)
- Fetch Demo / Todo App (advanced)

### Mobile Runtimes (React Native)

**Unit Tests:**

- React Native Testing Library
- Test AsyncStorage
- Test Platform API
- Test NetInfo

**E2E Tests:**

- Use Detox or Appium
- Launch app on simulator/emulator
- Test navigation and interactions

**Examples:**

- Hello Native (basic)
- Todo App with AsyncStorage (advanced)

### Desktop Runtimes (Electron, Tauri)

**Unit Tests:**

- Main process capabilities
- Renderer process capabilities
- IPC communication
- File system operations

**E2E Tests:**

- Use Playwright Electron / tauri-driver
- Launch application
- Test window operations
- Test file dialogs

**Examples:**

- Hello Desktop (basic)
- File Browser / Settings App (advanced)

### Edge Runtimes (Cloudflare Workers)

**Unit Tests:**

- Core capabilities
- KV operations
- Request/Response handling

**E2E Tests:**

- Use Miniflare for local testing
- Test worker lifecycle
- Test KV storage

**Examples:**

- Hello Edge (basic)
- API with KV Storage (advanced)

## Running Specific Test Types

### Unit Tests Only

```bash
cd packages/runtime-node
bun test bootstrap.test.ts
```

### Integration Tests Only

```bash
cd packages/runtime-node
bun test integration/
```

### E2E Tests Only

```bash
cd packages/runtime-node
bun test e2e.test.ts
```

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
bun install

# For browser tests
bun install --dev playwright
bunx playwright install

# For Electron tests
bun install --dev @playwright/test playwright-electron

# For React Native tests
bun install --dev @testing-library/react-native detox

# For Tauri tests (requires Rust)
cargo install tauri-driver
```

### Environment Variables

Set these for E2E tests:

```bash
export NODE_ENV=test
export CI=true  # For headless browser tests
```

## Coverage Goals

| Runtime | Unit | Integration | E2E | Examples |
|---------|------|-------------|-----|----------|
| runtime-node | >90% | 100% | 2 apps | 2 |
| runtime-deno | >90% | 100% | 2 apps | 2 |
| runtime-bun | >90% | 100% | 2 apps | 2 |
| runtime-browser | >90% | 100% | 2 apps | 2 |
| runtime-web-worker | >90% | 100% | 2 apps | 2 |
| runtime-shared-worker | >90% | 100% | 2 apps | 2 |
| runtime-service-worker | >90% | 100% | 2 apps | 2 |
| runtime-cloudflare | >90% | 100% | 2 apps | 2 |
| runtime-react-native | >90% | 100% | 2 apps | 2 |
| runtime-electron | >90% | 100% | 2 apps | 2 |
| runtime-tauri | >90% | 100% | 2 apps | 2 |

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test All Runtimes
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test

      - name: Run E2E tests - Server
        run: |
          cd packages/runtime-node && bun test e2e
          cd packages/runtime-deno && bun test e2e
          cd packages/runtime-bun && bun test e2e

      - name: Run E2E tests - Browser
        run: |
          bunx playwright install
          cd packages/runtime-browser && bun test e2e

      - name: Generate coverage
        run: bun test --coverage
```

## Debugging Tests

### Debug Unit Tests

```bash
# Run in watch mode
bun test --watch

# Run specific test
bun test --grep "bootstrap creates runtime"

# Enable verbose output
bun test --verbose
```

### Debug E2E Tests

```bash
# Run browser tests in headed mode
HEADLESS=false bun test e2e

# Keep browser open after test
DEBUG=true bun test e2e

# Slow down execution
SLOW_MO=1000 bun test e2e
```

## Next Steps

1. **Run the generator**:

   ```bash
   bun run scripts/generate-tests-and-examples.ts --all
   ```

2. **Review generated files** and customize as needed

3. **Run tests**:

   ```bash
   bun test
   ```

4. **Try examples**:

   ```bash
   cd packages/runtime-node/examples/01-hello-world
   bun run src/index.ts
   ```

5. **Add to CI/CD** using the workflow above

## Troubleshooting

### Tests Timeout

Increase timeout in test files:

```typescript
test('long running test', async () => {
  // ...
}, { timeout: 30000 }); // 30 seconds
```

### Browser Tests Fail

Ensure Playwright is installed:

```bash
bunx playwright install
```

### Permission Errors (Deno)

Add required permissions:

```bash
deno test --allow-all
```

### React Native Tests Fail

Ensure simulator/emulator is running:

```bash
# iOS
open -a Simulator

# Android
emulator -avd Pixel_3a_API_30_x86
```

## Contributing

When adding a new runtime:

1. Add configuration to `scripts/generate-tests-and-examples.ts`
2. Run generator for the new runtime
3. Customize generated tests for runtime-specific features
4. Add integration tests
5. Verify all tests pass
6. Update this documentation

## Additional Resources

- [Testing Strategy Document](./TESTING_STRATEGY.md)
- [Runtime Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [ServiceJS Design Document](./DESIGN_DOC.md)
