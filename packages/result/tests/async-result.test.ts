/**
 * AsyncResult Tests
 */

import { describe, test, expect } from 'bun:test';
import { AsyncResult } from '../src/async-result.js';
import { ok, err, isOk, isErr } from '../src/result.js';
import { some, none } from '@servicejs/option';

describe('AsyncResult', () => {
  describe('constructor and factory methods', () => {
    test('constructor wraps Promise<Result>', async () => {
      const asyncResult = new AsyncResult(Promise.resolve(ok(42)));
      const result = await asyncResult;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('from() catches errors and converts to Err', async () => {
      const asyncResult = AsyncResult.from(
        Promise.reject(new Error('test error')),
        error => String(error)
      );
      const result = await asyncResult;
      expect(isErr(result)).toBe(true);
    });

    test('from() converts successful Promise to Ok', async () => {
      const asyncResult = AsyncResult.from(
        Promise.resolve(42),
        error => String(error)
      );
      const result = await asyncResult;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('from() uses default error mapping if none provided', async () => {
      const error = new Error('test error');
      const asyncResult = AsyncResult.from<number>(
        Promise.reject(error)
      );
      const result = await asyncResult;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(error);
      }
    });

    test('fromResult() wraps Result in Promise', async () => {
      const asyncResult = AsyncResult.fromResult(ok(42));
      const result = await asyncResult;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('ok() creates AsyncResult with Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const result = await asyncResult;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('err() creates AsyncResult with Err', async () => {
      const asyncResult = AsyncResult.err('error');
      const result = await asyncResult;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('error');
      }
    });
  });

  describe('awaitable', () => {
    test('can be awaited directly', async () => {
      const asyncResult = AsyncResult.ok(42);
      const result = await asyncResult;
      expect(isOk(result)).toBe(true);
    });

    test('works with Promise.all', async () => {
      const results = await Promise.all([
        AsyncResult.ok(1),
        AsyncResult.ok(2),
        AsyncResult.ok(3),
      ]);
      expect(results.length).toBe(3);
      expect(results.every(isOk)).toBe(true);
    });
  });

  describe('map', () => {
    test('transforms Ok value', async () => {
      const asyncResult = AsyncResult.ok(42);
      const mapped = asyncResult.map(x => x * 2);
      const result = await mapped;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(84);
      }
    });

    test('passes Err through unchanged', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const mapped = asyncResult.map(x => x * 2);
      const result = await mapped;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('error');
      }
    });

    test('chains multiple maps', async () => {
      const asyncResult = AsyncResult.ok(10);
      const result = await asyncResult
        .map(x => x * 2)
        .map(x => x + 5)
        .map(x => String(x));

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('25');
      }
    });
  });

  describe('mapErr', () => {
    test('transforms Err value', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const mapped = asyncResult.mapErr(e => `Error: ${e}`);
      const result = await mapped;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('Error: error');
      }
    });

    test('passes Ok through unchanged', async () => {
      const asyncResult = AsyncResult.ok(42);
      const mapped = asyncResult.mapErr(e => `Error: ${e}`);
      const result = await mapped;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('chains multiple mapErrs', async () => {
      const asyncResult = AsyncResult.err<number, number>(1);
      const result = await asyncResult
        .mapErr(x => x * 2)
        .mapErr(x => x + 5)
        .mapErr(x => String(x));

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('7');
      }
    });
  });

  describe('andThen', () => {
    test('chains AsyncResult-returning operations', async () => {
      const asyncResult = AsyncResult.ok(10);
      const chained = asyncResult.andThen(x =>
        AsyncResult.ok(x * 2)
      );
      const result = await chained;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(20);
      }
    });

    test('chains Result-returning operations', async () => {
      const asyncResult = AsyncResult.ok(10);
      const chained = asyncResult.andThen(x => ok(x * 2));
      const result = await chained;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(20);
      }
    });

    test('short-circuits on Err', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const chained = asyncResult.andThen(x =>
        AsyncResult.ok(x * 2)
      );
      const result = await chained;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('error');
      }
    });

    test('propagates Err from chained operation', async () => {
      const asyncResult = AsyncResult.ok(10);
      const chained = asyncResult.andThen(_x =>
        AsyncResult.err<number, string>('chained error')
      );
      const result = await chained;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('chained error');
      }
    });

    test('chains multiple andThens', async () => {
      const asyncResult = AsyncResult.ok(10);
      const result = await asyncResult
        .andThen(x => AsyncResult.ok(x * 2))
        .andThen(x => AsyncResult.ok(x + 5))
        .andThen(x => ok(String(x)));

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('25');
      }
    });
  });

  describe('orElse', () => {
    test('recovers from Err with AsyncResult', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const recovered = asyncResult.orElse(_e =>
        AsyncResult.ok(42)
      );
      const result = await recovered;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('recovers from Err with Result', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const recovered = asyncResult.orElse(_e => ok(42));
      const result = await recovered;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('passes Ok through unchanged', async () => {
      const asyncResult = AsyncResult.ok(42);
      const recovered = asyncResult.orElse(_e =>
        AsyncResult.ok(0)
      );
      const result = await recovered;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    test('can transform error type', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const recovered = asyncResult.orElse(e =>
        AsyncResult.err<number, number>(e.length)
      );
      const result = await recovered;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe(5);
      }
    });
  });

  describe('unwrap methods', () => {
    test('unwrap() returns value for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const value = await asyncResult.unwrap();
      expect(value).toBe(42);
    });

    test('unwrap() throws for Err', async () => {
      const asyncResult = AsyncResult.err('error');
      await expect(asyncResult.unwrap()).rejects.toThrow();
    });

    test('unwrapOr() returns value for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const value = await asyncResult.unwrapOr(0);
      expect(value).toBe(42);
    });

    test('unwrapOr() returns default for Err', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const value = await asyncResult.unwrapOr(0);
      expect(value).toBe(0);
    });

    test('unwrapOrElse() returns value for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const value = await asyncResult.unwrapOrElse(_e => 0);
      expect(value).toBe(42);
    });

    test('unwrapOrElse() computes default for Err', async () => {
      const asyncResult = AsyncResult.err<number, string>('error');
      const value = await asyncResult.unwrapOrElse(e => e.length);
      expect(value).toBe(5);
    });

    test('unwrapErr() returns error for Err', async () => {
      const asyncResult = AsyncResult.err('error');
      const error = await asyncResult.unwrapErr();
      expect(error).toBe('error');
    });

    test('unwrapErr() throws for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      await expect(asyncResult.unwrapErr()).rejects.toThrow();
    });
  });

  describe('isOk and isErr', () => {
    test('isOk() returns true for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const result = await asyncResult.isOk();
      expect(result).toBe(true);
    });

    test('isOk() returns false for Err', async () => {
      const asyncResult = AsyncResult.err('error');
      const result = await asyncResult.isOk();
      expect(result).toBe(false);
    });

    test('isErr() returns false for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const result = await asyncResult.isErr();
      expect(result).toBe(false);
    });

    test('isErr() returns true for Err', async () => {
      const asyncResult = AsyncResult.err('error');
      const result = await asyncResult.isErr();
      expect(result).toBe(true);
    });
  });

  describe('match', () => {
    test('calls onOk for Ok', async () => {
      const asyncResult = AsyncResult.ok(42);
      const message = await asyncResult.match({
        onOk: value => `Success: ${value}`,
        onErr: error => `Error: ${error}`,
      });
      expect(message).toBe('Success: 42');
    });

    test('calls onErr for Err', async () => {
      const asyncResult = AsyncResult.err('error');
      const message = await asyncResult.match({
        onOk: value => `Success: ${value}`,
        onErr: error => `Error: ${error}`,
      });
      expect(message).toBe('Error: error');
    });
  });

  describe('toOption', () => {
    test('converts Ok to Some', async () => {
      const asyncResult = AsyncResult.ok(42);
      const option = await asyncResult.toOption();
      expect(option).toEqual(some(42));
    });

    test('converts Err to None', async () => {
      const asyncResult = AsyncResult.err('error');
      const option = await asyncResult.toOption();
      expect(option).toEqual(none());
    });
  });

  describe('all', () => {
    test('combines multiple Ok results', async () => {
      const asyncResults = [
        AsyncResult.ok(1),
        AsyncResult.ok(2),
        AsyncResult.ok(3),
      ];
      const combined = AsyncResult.all(asyncResults);
      const result = await combined;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    test('returns first Err if any fail', async () => {
      const asyncResults = [
        AsyncResult.ok(1),
        AsyncResult.err<number, string>('error 1'),
        AsyncResult.err<number, string>('error 2'),
      ];
      const combined = AsyncResult.all(asyncResults);
      const result = await combined;
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('error 1');
      }
    });

    test('handles empty array', async () => {
      const combined = AsyncResult.all([]);
      const result = await combined;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('race', () => {
    test('returns first completed result', async () => {
      const asyncResults = [
        new AsyncResult(new Promise(resolve =>
          setTimeout(() => resolve(ok(1)), 100)
        )),
        AsyncResult.ok(2), // Resolves immediately
        new AsyncResult(new Promise(resolve =>
          setTimeout(() => resolve(ok(3)), 50)
        )),
      ];
      const raced = AsyncResult.race(asyncResults);
      const result = await raced;
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(2);
      }
    });
  });

  describe('real-world scenarios', () => {
    test('async fetch simulation', async () => {
      const fetchUser = (id: number): AsyncResult<{ name: string; age: number }, string> => {
        return AsyncResult.from(
          new Promise((resolve, reject) => {
            if (id === 1) {
              setTimeout(() => resolve({ name: 'Alice', age: 30 }), 10);
            } else {
              setTimeout(() => reject(new Error('User not found')), 10);
            }
          }),
          error => String(error)
        );
      };

      const result1 = await fetchUser(1);
      expect(isOk(result1)).toBe(true);

      const result2 = await fetchUser(2);
      expect(isErr(result2)).toBe(true);
    });

    test('chaining async operations', async () => {
      const parseJson = (json: string): AsyncResult<unknown, string> => {
        return AsyncResult.from(
          Promise.resolve(JSON.parse(json)),
          error => `Parse error: ${error}`
        );
      };

      const result = await parseJson('{"name":"Alice"}')
        .map(obj => (obj as { name: string }).name)
        .map(name => name.toUpperCase());

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('ALICE');
      }
    });

    test('error recovery', async () => {
      const risky = AsyncResult.err<number, string>('network error');

      const result = await risky
        .orElse(error => {
          console.log(`Recovered from: ${error}`);
          return AsyncResult.ok(42);
        })
        .map(x => x * 2);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(84);
      }
    });

    test('validation chain', async () => {
      interface User {
        name: string;
        age: number;
      }

      const validateName = (user: User): AsyncResult<User, string> => {
        return user.name.length > 0
          ? AsyncResult.ok(user)
          : AsyncResult.err('Name is required');
      };

      const validateAge = (user: User): AsyncResult<User, string> => {
        return user.age >= 18
          ? AsyncResult.ok(user)
          : AsyncResult.err('Must be 18 or older');
      };

      const validUser = { name: 'Alice', age: 30 };
      const result1 = await AsyncResult.ok(validUser)
        .andThen(validateName)
        .andThen(validateAge);

      expect(isOk(result1)).toBe(true);

      const invalidUser = { name: '', age: 30 };
      const result2 = await AsyncResult.ok(invalidUser)
        .andThen(validateName)
        .andThen(validateAge);

      expect(isErr(result2)).toBe(true);
      if (isErr(result2)) {
        expect(result2.error).toBe('Name is required');
      }
    });
  });

  describe('async function return type', () => {
    test('can be used as async function return type', async () => {
      async function divide(a: number, b: number): AsyncResult<number, string> {
        if (b === 0) {
          return AsyncResult.err('Division by zero');
        }
        return AsyncResult.ok(a / b);
      }

      const result1 = await divide(10, 2);
      expect(isOk(result1)).toBe(true);
      if (isOk(result1)) {
        expect(result1.value).toBe(5);
      }

      const result2 = await divide(10, 0);
      expect(isErr(result2)).toBe(true);
      if (isErr(result2)) {
        expect(result2.error).toBe('Division by zero');
      }
    });
  });
});
