import { describe, test, expect } from 'bun:test';
import { isSome, isNone, none } from '@servicejs/option';
import { createInMemoryEnv, createEmptyEnv } from '../src/in-memory.js';

describe('createInMemoryEnv', () => {
  test('returns Some for existing keys', () => {
    const env = createInMemoryEnv({ API_KEY: 'secret', NODE_ENV: 'test' });

    const apiKey = env.get('API_KEY');
    expect(isSome(apiKey)).toBe(true);
    if (isSome(apiKey)) {
      expect(apiKey.value).toBe('secret');
    }
  });

  test('returns None for missing keys', () => {
    const env = createInMemoryEnv({ API_KEY: 'secret' });

    const missing = env.get('MISSING_KEY');
    expect(isNone(missing)).toBe(true);
  });

  test('getAll returns all variables', () => {
    const vars = { API_KEY: 'secret', NODE_ENV: 'test', PORT: '3000' };
    const env = createInMemoryEnv(vars);

    const all = env.getAll();
    expect(all).toEqual(vars);
  });

  test('getAll returns frozen object', () => {
    const env = createInMemoryEnv({ KEY: 'value' });
    const all = env.getAll();

    expect(Object.isFrozen(all)).toBe(true);

    // Attempting to mutate should fail silently or throw in strict mode
    expect(() => {
      (all as any).KEY = 'new value';
    }).toThrow();
  });

  test('vars are copied, not referenced', () => {
    const vars = { KEY: 'original' };
    const env = createInMemoryEnv(vars);

    // Mutate original
    vars.KEY = 'mutated';

    // Env should still have original value
    const value = env.get('KEY');
    expect(isSome(value)).toBe(true);
    if (isSome(value)) {
      expect(value.value).toBe('original');
    }
  });

  test('defaults to test platform and in-memory version', () => {
    const env = createInMemoryEnv({});

    expect(env.platform).toBe('test');
    expect(env.version).toBe('in-memory');
  });

  test('accepts custom platform and version', () => {
    const env = createInMemoryEnv(
      {},
      'browser',
      'Chrome/120.0.0'
    );

    expect(env.platform).toBe('browser');
    expect(env.version).toBe('Chrome/120.0.0');
  });

  test('works with empty vars object', () => {
    const env = createInMemoryEnv();

    expect(env.get('ANY')).toEqual(none());
    expect(env.getAll()).toEqual({});
  });
});

describe('createEmptyEnv', () => {
  test('returns None for all keys', () => {
    const env = createEmptyEnv();

    expect(isNone(env.get('ANY_KEY'))).toBe(true);
    expect(isNone(env.get('ANOTHER_KEY'))).toBe(true);
  });

  test('getAll returns empty object', () => {
    const env = createEmptyEnv();

    expect(env.getAll()).toEqual({});
  });

  test('defaults to test platform', () => {
    const env = createEmptyEnv();

    expect(env.platform).toBe('test');
    expect(env.version).toBe('empty');
  });

  test('accepts custom platform', () => {
    const env = createEmptyEnv('node');

    expect(env.platform).toBe('node');
  });
});
