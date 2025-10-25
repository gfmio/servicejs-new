import { describe, it, expect } from 'bun:test';
import { ok, err, Ok, Err } from '../src/index.js';

describe('Result class methods', () => {
  describe('Ok methods', () => {
    it('should map Ok value', () => {
      const result = ok(42).map(x => x * 2);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(84);
    });

    it('should chain with andThen', () => {
      const result = ok(42).andThen(x => ok(x * 2));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(84);
    });

    it('should chain to Err with andThen', () => {
      const result = ok(42).andThen(x => err('error'));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe('error');
    });

    it('should not call orElse on Ok', () => {
      const result = ok(42).orElse(() => ok(100));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('should not mapErr on Ok', () => {
      const result = ok(42).mapErr((e: string) => e.length);
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('should unwrap Ok value', () => {
      expect(ok(42).unwrap()).toBe(42);
    });

    it('should throw when unwrapping Ok as Err', () => {
      expect(() => ok(42).unwrapErr()).toThrow();
    });

    it('should unwrap with unwrapOr', () => {
      expect(ok(42).unwrapOr(0)).toBe(42);
    });

    it('should unwrap with unwrapOrElse', () => {
      expect(ok(42).unwrapOrElse(() => 0)).toBe(42);
    });

    it('should match Ok', () => {
      const value = ok(42).match({
        onOk: x => x * 2,
        onErr: (e: string) => 0,
      });
      expect(value).toBe(84);
    });

    it('should convert Ok to Some', () => {
      const option = ok(42).toOption();
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should check isOk', () => {
      expect(ok(42).isOk()).toBe(true);
      expect(ok(42).isErr()).toBe(false);
    });
  });

  describe('Err methods', () => {
    it('should not map Err value', () => {
      const result = err('error').map((x: number) => x * 2);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe('error');
    });

    it('should mapErr Err value', () => {
      const result = err('error').mapErr(e => e.length);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(5);
    });

    it('should not chain Err with andThen', () => {
      const result = err('error').andThen((x: number) => ok(x * 2));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe('error');
    });

    it('should recover from Err with orElse', () => {
      const result = err('error').orElse(() => ok(42));
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(42);
    });

    it('should chain to another Err with orElse', () => {
      const result = err('error').orElse(e => err(e.length));
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe(5);
    });

    it('should unwrap Err value', () => {
      expect(err('error').unwrapErr()).toBe('error');
    });

    it('should throw when unwrapping Err as Ok', () => {
      expect(() => err('error').unwrap()).toThrow();
    });

    it('should return default with unwrapOr', () => {
      expect(err('error').unwrapOr(42)).toBe(42);
    });

    it('should compute default with unwrapOrElse', () => {
      expect(err('error').unwrapOrElse(e => e.length)).toBe(5);
    });

    it('should match Err', () => {
      const value = err('error').match({
        onOk: (x: number) => x * 2,
        onErr: e => e.length,
      });
      expect(value).toBe(5);
    });

    it('should convert Err to None', () => {
      const option = err('error').toOption();
      expect(option.isNone()).toBe(true);
    });

    it('should check isErr', () => {
      expect(err('error').isErr()).toBe(true);
      expect(err('error').isOk()).toBe(false);
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple Ok operations', () => {
      const result = ok(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .andThen(x => ok(x.toString()))
        .map(s => s.length);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(2); // "25".length
    });

    it('should short-circuit on Err', () => {
      const result = ok(10)
        .map(x => x * 2)
        .andThen(x => err('error'))
        .map((x: number) => x + 5); // This won't execute

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe('error');
    });

    it('should recover from Err and continue', () => {
      const result = ok(10)
        .andThen(x => err('error'))
        .orElse(() => ok(42))
        .map(x => x * 2);

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe(84);
    });

    it('should transform errors with mapErr', () => {
      const result = err('error')
        .mapErr(e => e.toUpperCase())
        .mapErr(e => `${e}!`);

      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr()).toBe('ERROR!');
    });

    it('should convert to Option and back', () => {
      const result = ok(42)
        .toOption()
        .map(x => x * 2);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(84);
    });
  });
});
