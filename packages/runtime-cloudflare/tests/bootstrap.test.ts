// Unit tests for Cloudflare Workers runtime
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





  // KV capability
  expect(runtime.kv).toBeDefined();



});

test('env.platform returns correct value', () => {
  const runtime = bootstrap();
  const platform = runtime.env.platform();
  expect(platform).toContain('cloudflare');
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




