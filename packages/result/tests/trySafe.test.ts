import { describe, expect, test } from 'bun:test';
import { isErr, isOk } from '../src/result.js';
import { trySafe } from '../src/trySafe.js';

describe('trySafe', () => {
  test('returns Ok for successful synchronous function', () => {
    const result = trySafe(
      () => JSON.parse('{"name":"Alice"}'),
      error => String(error)
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toEqual({ name: 'Alice' });
    }
  });

  test('returns Err for function that throws', () => {
    const result = trySafe(
      () => JSON.parse('invalid json'),
      error => `Parse error: ${error}`
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toContain('Parse error');
    }
  });

  test('executes immediately', () => {
    let executed = false;
    trySafe(
      () => { executed = true; return 42; },
      error => String(error)
    );
    expect(executed).toBe(true);
  });

  test('maps error correctly', () => {
    const result = trySafe(
      () => { throw new Error('test error'); },
      error => ({ message: String(error), code: 'ERROR' })
    );
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe('ERROR');
      expect(result.error.message).toContain('test error');
    }
  });

  test('handles different error types', () => {
    const result1 = trySafe(
      () => { throw 'string error'; },
      error => String(error)
    );
    expect(isErr(result1)).toBe(true);

    const result2 = trySafe(
      () => { throw { custom: 'object' }; },
      error => JSON.stringify(error)
    );
    expect(isErr(result2)).toBe(true);

    const result3 = trySafe(
      () => { throw 42; },
      error => Number(error)
    );
    expect(isErr(result3)).toBe(true);
    if (isErr(result3)) {
      expect(result3.error).toBe(42);
    }
  });
});
