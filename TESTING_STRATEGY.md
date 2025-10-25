# Testing Strategy for ServiceJS Runtimes

## Overview

This document outlines the comprehensive testing strategy for all ServiceJS runtime packages, including unit tests, integration tests, and end-to-end tests.

## Test Types

### 1. Unit Tests

- Test individual capabilities in isolation
- Mock external dependencies
- Fast execution (<100ms per test)
- Location: `packages/runtime-*/tests/*.test.ts`

### 2. Integration Tests

- Test multiple capabilities working together
- Test real interactions between components
- Location: `packages/runtime-*/tests/integration/*.test.ts`

### 3. End-to-End Tests

- Run actual applications in target runtime environments
- Test complete workflows (Hello World, Todo App)
- Location: `packages/runtime-*/tests/e2e/*.test.ts`
- E2E apps location: `packages/runtime-*/tests/e2e/apps/*`

## Test Structure per Runtime

```
packages/runtime-{name}/
├── src/
├── tests/
│   ├── bootstrap.test.ts          # Unit tests
│   ├── capabilities.test.ts       # Unit tests for each capability
│   ├── integration/
│   │   ├── multi-capability.test.ts
│   │   └── lifecycle.test.ts
│   └── e2e/
│       ├── hello-world.test.ts    # Runs hello-world app
│       ├── todo-app.test.ts       # Runs todo app
│       └── apps/
│           ├── hello-world/
│           │   ├── index.{ts,js,tsx}
│           │   └── package.json (if needed)
│           └── todo-app/
│               ├── index.{ts,js,tsx}
│               └── package.json (if needed)
```

## Examples Structure

```
packages/
├── runtime-node/
│   ├── src/
│   ├── tests/
│   └── examples/
│       ├── 01-hello-world/
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   ├── src/
│       │   │   └── index.ts
│       │   └── README.md
│       └── 02-file-server/
│           ├── package.json
│           ├── tsconfig.json
│           ├── src/
│           │   └── index.ts
│           └── README.md
├── runtime-browser/
│   ├── src/
│   ├── tests/
│   └── examples/
│       ├── 01-counter/
│       └── 02-fetch-demo/
├── runtime-react-native/
│   ├── src/
│   ├── tests/
│   └── examples/
│       ├── 01-hello-native/
│       └── 02-todo-app/
└── ... (2 examples per runtime in each package)
```

## E2E Test Patterns

### Node.js / Deno / Bun (Server-side)

```typescript
test('e2e: hello world runs successfully', async () => {
  const result = await Bun.spawn(['bun', 'run', './tests/e2e/apps/hello-world/index.ts'], {
    stdout: 'pipe',
  });
  const output = await new Response(result.stdout).text();
  expect(output).toContain('Hello, World!');
  expect(result.exitCode).toBe(0);
});
```

### Browser (using Playwright/Puppeteer)

```typescript
test('e2e: counter app works', async () => {
  await page.goto('http://localhost:3000');
  await page.click('#increment');
  const count = await page.textContent('#count');
  expect(count).toBe('1');
});
```

### React Native (using Detox/Appium)

```typescript
test('e2e: app launches', async () => {
  await device.launchApp();
  await expect(element(by.id('welcome'))).toBeVisible();
});
```

### Electron (using Spectron/Playwright Electron)

```typescript
test('e2e: window opens', async () => {
  const electronApp = await electron.launch({ args: ['./'] });
  const window = await electronApp.firstWindow();
  expect(await window.title()).toBe('Hello Electron');
});
```

### Tauri (using tauri-driver/WebDriver)

```typescript
test('e2e: tauri app loads', async () => {
  // Use tauri-driver or WebDriver to test
});
```

## Test Scenarios

### Hello World App (Basic Bootstrap Test)

- Verifies runtime can bootstrap
- Logs "Hello, World!" to console
- Exits cleanly
- Tests: env, console, lifecycle capabilities

### Todo App (Comprehensive Test)

Tests all major capabilities:

- **Environment**: Read config from env vars
- **Filesystem**: Save/load todos to file (if available)
- **HTTP**: Fetch initial todos from API (optional)
- **Console**: Log operations
- **Time**: Add timestamps to todos
- **Lifecycle**: Clean shutdown with data save
- **Crypto**: Generate todo IDs with UUID

## Implementation Status

| Runtime | Unit Tests | Integration Tests | E2E Tests | Examples |
|---------|-----------|-------------------|-----------|----------|
| runtime-node | ✅ 5/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-deno | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-bun | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-browser | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-web-worker | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-shared-worker | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-service-worker | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-cloudflare | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-react-native | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-electron | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |
| runtime-tauri | ⏳ 0/5 | ⏳ 0/3 | ⏳ 0/2 | ⏳ 0/2 |

## Implementation Plan

### Phase 1: Complete Test Infrastructure for Node.js (Template)

1. Unit tests for all capabilities
2. Integration tests
3. E2E tests with hello-world and todo apps
4. Two full examples

### Phase 2: Replicate for Bun and Deno (Server-side runtimes)

- Follow Node.js patterns
- Adapt for runtime-specific features

### Phase 3: Browser-based Runtimes

- Set up Playwright/Puppeteer
- Create browser test harness
- Implement for browser, web-worker, shared-worker, service-worker

### Phase 4: Mobile and Desktop

- React Native: Set up React Native Testing Library
- Electron: Set up Playwright Electron
- Tauri: Set up tauri-driver or WebDriver

### Phase 5: Edge (Cloudflare Workers)

- Use Miniflare for local testing
- Worker integration tests
- KV storage tests

## Test Naming Conventions

```typescript
// Unit tests
test('bootstrap creates runtime with all capabilities', () => {});
test('env.get returns Option.some for existing variable', () => {});
test('fs.readFile returns error for non-existent file', () => {});

// Integration tests
test('integration: lifecycle shutdown triggers all handlers', async () => {});
test('integration: http fetch and crypto hash workflow', async () => {});

// E2E tests
test('e2e: hello world app runs and prints output', async () => {});
test('e2e: todo app can add, list, and save todos', async () => {});
```

## Running Tests

```bash
# Run all tests for a runtime
cd packages/runtime-node
bun test

# Run only unit tests
bun test:unit

# Run only integration tests
bun test:integration

# Run only e2e tests
bun test:e2e

# Run all tests for all runtimes
bun test:all
```

## Coverage Goals

- **Unit tests**: >90% code coverage
- **Integration tests**: All major capability combinations
- **E2E tests**: At least 2 real-world scenarios per runtime

## Next Steps

1. Implement full test suite for runtime-node (template)
2. Document patterns and learnings
3. Create script to replicate tests for other runtimes
4. Implement examples following established patterns
5. Set up CI/CD to run all tests
