import { describe, expect, test } from 'bun:test';
import { AsyncResult } from '../src/async-result.js';
import { isErr, isOk } from '../src/result.js';
import { tryMaybeAsync } from '../src/tryMaybeAsync.js';

describe('tryMaybeAsync', () => {
  describe('synchronous path', () => {
    test('returns Result for synchronous success', () => {
      const result = tryMaybeAsync(
        () => 42,
        error => String(error)
      );

      expect(result).not.toBeInstanceOf(AsyncResult);
      if (!(result instanceof AsyncResult)) {
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value).toBe(42);
        }
      }
    });

    test('returns Result for synchronous error', () => {
      const result = tryMaybeAsync(
        () => { throw new Error('sync error'); },
        error => String(error)
      );

      expect(result).not.toBeInstanceOf(AsyncResult);
      if (!(result instanceof AsyncResult)) {
        expect(isErr(result)).toBe(true);
        if (isErr(result)) {
          expect(result.error).toContain('sync error');
        }
      }
    });

    test('executes synchronously when possible', () => {
      let executed = false;
      const result = tryMaybeAsync(
        () => { executed = true; return 42; },
        error => String(error)
      );

      // Should execute immediately
      expect(executed).toBe(true);
      expect(result).not.toBeInstanceOf(AsyncResult);
    });
  });

  describe('asynchronous path', () => {
    test('returns AsyncResult for Promise success', async () => {
      const result = tryMaybeAsync(
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

    test('returns AsyncResult for Promise rejection', async () => {
      const result = tryMaybeAsync(
        () => Promise.reject(new Error('async error')),
        error => String(error)
      );

      expect(result).toBeInstanceOf(AsyncResult);
      const awaited = await result;
      expect(isErr(awaited)).toBe(true);
      if (isErr(awaited)) {
        expect(awaited.error).toContain('async error');
      }
    });
  });

  describe('real-world scenarios', () => {
    test('handles cache with fallback to async fetch', async () => {
      const cache = new Map<number, string>();
      cache.set(1, 'cached-user-1');

      const getUser = (id: number): string | Promise<string> => {
        const cached = cache.get(id);
        if (cached) return cached; // sync
        return new Promise(resolve =>
          setTimeout(() => resolve(`fetched-user-${id}`), 10)
        ); // async
      };

      // Cache hit - synchronous
      const result1 = tryMaybeAsync(
        () => getUser(1),
        error => String(error)
      );
      expect(result1).not.toBeInstanceOf(AsyncResult);
      if (!(result1 instanceof AsyncResult)) {
        expect(isOk(result1)).toBe(true);
        if (isOk(result1)) {
          expect(result1.value).toBe('cached-user-1');
        }
      }

      // Cache miss - asynchronous
      const result2 = tryMaybeAsync(
        () => getUser(2),
        error => String(error)
      );
      expect(result2).toBeInstanceOf(AsyncResult);
      const awaited = await result2;
      expect(isOk(awaited)).toBe(true);
      if (isOk(awaited)) {
        expect(awaited.value).toBe('fetched-user-2');
      }
    });

    test('preserves sync performance when possible', () => {
      let syncCount = 0;
      let asyncCount = 0;

      const maybeAsync = (useAsync: boolean) => {
        if (useAsync) {
          return Promise.resolve('async').then(v => { asyncCount++; return v; });
        }
        syncCount++;
        return 'sync';
      };

      // Sync call
      const result1 = tryMaybeAsync(
        () => maybeAsync(false),
        error => String(error)
      );
      expect(syncCount).toBe(1);
      expect(asyncCount).toBe(0);
      expect(result1).not.toBeInstanceOf(AsyncResult);

      // Async call
      const result2 = tryMaybeAsync(
        () => maybeAsync(true),
        error => String(error)
      );
      expect(result2).toBeInstanceOf(AsyncResult);
    });
  });

  describe('type discrimination', () => {
    test('can discriminate with instanceof', () => {
      const syncResult = tryMaybeAsync(
        () => 42,
        error => String(error)
      );

      const asyncResult = tryMaybeAsync(
        () => Promise.resolve(42),
        error => String(error)
      );

      expect(syncResult instanceof AsyncResult).toBe(false);
      expect(asyncResult instanceof AsyncResult).toBe(true);
    });

    test('can handle both types correctly', async () => {
      const handleResult = async (result: ReturnType<typeof tryMaybeAsync>) => {
        if (result instanceof AsyncResult) {
          const awaited = await result;
          return isOk(awaited) ? awaited.value : null;
        } else {
          return isOk(result) ? result.value : null;
        }
      };

      const sync = tryMaybeAsync(() => 42, () => 'error');
      const async = tryMaybeAsync(() => Promise.resolve(84), () => 'error');

      expect(await handleResult(sync)).toBe(42);
      expect(await handleResult(async)).toBe(84);
    });
  });
});
