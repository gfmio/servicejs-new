import { describe, it, expect } from 'bun:test';
import {
  ok,
  err,
  fromThrowable,
  sequence,
  traverse,
  collectOk,
  collectErr,
  firstOk,
  combine,
  resultWhen,
  toNullable,
  toUndefined,
} from '../src/index.js';

describe('Result utilities', () => {
  describe('fromThrowable', () => {
    it('should convert throwing function to Result', () => {
      const parseJSON = fromThrowable(JSON.parse);
      const result = parseJSON('{"a":1}');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual({ a: 1 });
      }
    });

    it('should catch errors', () => {
      const parseJSON = fromThrowable(JSON.parse);
      const result = parseJSON('{invalid}');
      expect(result.isErr()).toBe(true);
    });

    it('should work with multiple arguments', () => {
      const divide = (a: number, b: number) => {
        if (b === 0) throw new Error('Division by zero');
        return a / b;
      };
      const safeDivide = fromThrowable(divide);

      expect(safeDivide(10, 2).unwrap()).toBe(5);
      expect(safeDivide(10, 0).isErr()).toBe(true);
    });
  });

  describe('sequence', () => {
    it('should sequence all Oks', () => {
      const result = sequence([ok(1), ok(2), ok(3)]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([1, 2, 3]);
      }
    });

    it('should return first Err', () => {
      const result = sequence([ok(1), err('error'), ok(3)]);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('error');
      }
    });

    it('should handle empty array', () => {
      const result = sequence([]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });
  });

  describe('traverse', () => {
    it('should traverse with all Oks', () => {
      const result = traverse([1, 2, 3], x => ok(x * 2));
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([2, 4, 6]);
      }
    });

    it('should return first Err', () => {
      const validate = (x: number) => x > 0 ? ok(x) : err('negative');
      const result = traverse([1, -2, 3], validate);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('negative');
      }
    });
  });

  describe('collectOk', () => {
    it('should collect all Ok values', () => {
      const values = collectOk([ok(1), err('error'), ok(2), err('another'), ok(3)]);
      expect(values).toEqual([1, 2, 3]);
    });

    it('should return empty array for all Errs', () => {
      const values = collectOk([err('e1'), err('e2')]);
      expect(values).toEqual([]);
    });
  });

  describe('collectErr', () => {
    it('should collect all Err values', () => {
      const errors = collectErr([ok(1), err('error1'), ok(2), err('error2')]);
      expect(errors).toEqual(['error1', 'error2']);
    });

    it('should return empty array for all Oks', () => {
      const errors = collectErr([ok(1), ok(2)]);
      expect(errors).toEqual([]);
    });
  });

  describe('firstOk', () => {
    it('should return first Ok', () => {
      const result = firstOk([err('e1'), ok(42), ok(100)]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it('should return last Err if all are Err', () => {
      const result = firstOk([err('e1'), err('e2'), err('e3')]);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBe('e3');
      }
    });
  });

  describe('combine', () => {
    it('should combine Ok values', () => {
      const result = combine(
        [ok(1), ok(2), ok(3)],
        values => values.reduce((a, b) => a + b, 0)
      );
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(6);
      }
    });

    it('should return first Err', () => {
      const result = combine(
        [ok(1), err('error'), ok(3)],
        values => values.reduce((a, b) => a + b, 0)
      );
      expect(result.isErr()).toBe(true);
    });
  });

  describe('resultWhen', () => {
    it('should execute function when condition is true', () => {
      const result = resultWhen(true, () => ok(42), 0);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(42);
      }
    });

    it('should return default when condition is false', () => {
      const result = resultWhen(false, () => ok(42), 0);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(0);
      }
    });

    it('should not execute function when condition is false', () => {
      let executed = false;
      resultWhen(false, () => {
        executed = true;
        return ok(42);
      }, 0);
      expect(executed).toBe(false);
    });
  });

  describe('toNullable', () => {
    it('should convert Ok to value', () => {
      expect(toNullable(ok(42))).toBe(42);
    });

    it('should convert Err to null', () => {
      expect(toNullable(err('error'))).toBeNull();
    });
  });

  describe('toUndefined', () => {
    it('should convert Ok to value', () => {
      expect(toUndefined(ok(42))).toBe(42);
    });

    it('should convert Err to undefined', () => {
      expect(toUndefined(err('error'))).toBeUndefined();
    });
  });
});
