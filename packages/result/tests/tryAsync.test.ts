import { describe, expect, test } from 'bun:test';
import { AsyncResult } from '../src/async-result.js';
import { isErr, isOk } from '../src/result.js';
import { tryAsync } from '../src/tryAsync.js';

describe('tryAsync', () => {
  test('returns AsyncResult for successful async function', async () => {
    const result = tryAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 42;
      },
      error => String(error)
    );

    expect(result).toBeInstanceOf(AsyncResult);
    const awaited = await result;
    expect(isOk(awaited)).toBe(true);
    if (isOk(awaited)) {
      expect(awaited.value).toBe(42);
    }
  });

  test('returns AsyncResult for rejected promise', async () => {
    const result = tryAsync(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        throw new Error('async error');
      },
      error => `Error: ${error}`
    );

    expect(result).toBeInstanceOf(AsyncResult);
    const awaited = await result;
    expect(isErr(awaited)).toBe(true);
    if (isErr(awaited)) {
      expect(awaited.error).toContain('async error');
    }
  });

  test('can be chained', async () => {
    const result = await tryAsync(
      async () => 10,
      error => String(error)
    )
      .map(x => x * 2)
      .map(x => String(x));

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe('20');
    }
  });

  test('maps error correctly', async () => {
    const result = await tryAsync(
      async () => { throw new Error('test'); },
      error => ({ code: 'ASYNC_ERROR', message: String(error) })
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('ASYNC_ERROR');
      expect(result.error.message).toContain('test');
    }
  });

  test('handles promise rejection with non-Error values', async () => {
    const result = await tryAsync(
      () => Promise.reject('string rejection'),
      error => String(error)
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('string rejection');
    }
  });
});
