// Unit tests for Bun runtime
import { test, expect } from 'bun:test';
import { bootstrap } from '../src/index';

test('bootstrap creates runtime with all capabilities', () => {
  const runtime = bootstrap();

  // Core capabilities (all runtimes)
  expect(runtime.env).toBeDefined();
  expect(runtime.time).toBeDefined();
  expect(runtime.lifecycle).toBeDefined();
  expect(runtime.console).toBeDefined();
  expect(runtime.http).toBeDefined();
  expect(runtime.crypto).toBeDefined();

  // Filesystem capability
  expect(runtime.fs).toBeDefined();
  // Streams capability
  expect(runtime.streams).toBeDefined();






});

test('env.platform returns correct value', () => {
  const runtime = bootstrap();
  const platform = runtime.env.platform();
  expect(platform).toContain('bun');
});

test('time.now returns timestamp', () => {
  const runtime = bootstrap();
  const now = runtime.time.now();
  expect(typeof now).toBe('number');
  expect(now).toBeGreaterThan(0);
});

test('crypto.randomUUID generates valid UUID', () => {
  const runtime = bootstrap();
  const uuid = runtime.crypto.randomUUID();
  expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
});

test('lifecycle.onShutdown registers handler', () => {
  const runtime = bootstrap();
  let called = false;
  const unregister = runtime.lifecycle.onShutdown(() => {
    called = true;
  });
  expect(typeof unregister).toBe('function');
});


test('fs capability exists and has required methods', () => {
  const runtime = bootstrap();
  expect(runtime.fs.readFile).toBeDefined();
  expect(runtime.fs.writeFile).toBeDefined();
  expect(runtime.fs.exists).toBeDefined();
  expect(runtime.fs.mkdir).toBeDefined();
});



test('streams capability exists', () => {
  const runtime = bootstrap();
  expect(runtime.streams.stdin).toBeDefined();
  expect(runtime.streams.stdout).toBeDefined();
  expect(runtime.streams.stderr).toBeDefined();
});

