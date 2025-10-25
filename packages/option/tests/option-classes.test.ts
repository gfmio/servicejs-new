import { describe, it, expect } from 'bun:test';
import { some, none, Some, None } from '../src/index.js';

describe('Option class methods', () => {
  describe('Some methods', () => {
    it('should map Some value', () => {
      const option = some(42).map(x => x * 2);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(84);
    });

    it('should chain with andThen', () => {
      const option = some(42).andThen(x => some(x * 2));
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(84);
    });

    it('should chain to None with andThen', () => {
      const option = some(42).andThen(x => none());
      expect(option.isNone()).toBe(true);
    });

    it('should not call or on Some', () => {
      const option = some(42).or(some(100));
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should not call orElse on Some', () => {
      const option = some(42).orElse(() => some(100));
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should filter Some value', () => {
      const option = some(42).filter(x => x > 0);
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should filter to None', () => {
      const option = some(42).filter(x => x < 0);
      expect(option.isNone()).toBe(true);
    });

    it('should unwrap Some value', () => {
      expect(some(42).unwrap()).toBe(42);
    });

    it('should unwrap with unwrapOr', () => {
      expect(some(42).unwrapOr(0)).toBe(42);
    });

    it('should unwrap with unwrapOrElse', () => {
      expect(some(42).unwrapOrElse(() => 0)).toBe(42);
    });

    it('should convert to nullable', () => {
      expect(some(42).toNullable()).toBe(42);
    });

    it('should convert to undefined', () => {
      expect(some(42).toUndefined()).toBe(42);
    });

    it('should match Some', () => {
      const value = some(42).match({
        onSome: x => x * 2,
        onNone: () => 0,
      });
      expect(value).toBe(84);
    });

    it('should check isSome', () => {
      expect(some(42).isSome()).toBe(true);
      expect(some(42).isNone()).toBe(false);
    });
  });

  describe('None methods', () => {
    it('should not map None value', () => {
      const option = none().map((x: number) => x * 2);
      expect(option.isNone()).toBe(true);
    });

    it('should not chain None with andThen', () => {
      const option = none().andThen((x: number) => some(x * 2));
      expect(option.isNone()).toBe(true);
    });

    it('should provide alternative with or', () => {
      const option = none().or(some(42));
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should provide alternative with orElse', () => {
      const option = none().orElse(() => some(42));
      expect(option.isSome()).toBe(true);
      expect(option.unwrap()).toBe(42);
    });

    it('should not filter None', () => {
      const option = none().filter((x: number) => x > 0);
      expect(option.isNone()).toBe(true);
    });

    it('should throw when unwrapping None', () => {
      expect(() => none().unwrap()).toThrow();
    });

    it('should return default with unwrapOr', () => {
      expect(none().unwrapOr(42)).toBe(42);
    });

    it('should compute default with unwrapOrElse', () => {
      expect(none().unwrapOrElse(() => 42)).toBe(42);
    });

    it('should convert to null', () => {
      expect(none().toNullable()).toBeNull();
    });

    it('should convert to undefined', () => {
      expect(none().toUndefined()).toBeUndefined();
    });

    it('should match None', () => {
      const value = none().match({
        onSome: (x: number) => x * 2,
        onNone: () => 0,
      });
      expect(value).toBe(0);
    });

    it('should check isNone', () => {
      expect(none().isNone()).toBe(true);
      expect(none().isSome()).toBe(false);
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple Some operations', () => {
      const result = some(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .andThen(x => some(x.toString()))
        .map(s => s.length);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(2); // "25".length
    });

    it('should short-circuit on None', () => {
      const result = some(10)
        .map(x => x * 2)
        .andThen(x => none())
        .map((x: number) => x + 5); // This won't execute

      expect(result.isNone()).toBe(true);
    });

    it('should recover from None and continue', () => {
      const result = some(10)
        .andThen(x => none())
        .orElse(() => some(42))
        .map(x => x * 2);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(84);
    });

    it('should filter and continue', () => {
      const result = some(10)
        .filter(x => x > 5)
        .map(x => x * 2);

      expect(result.isSome()).toBe(true);
      expect(result.unwrap()).toBe(20);
    });

    it('should filter to None and stop', () => {
      const result = some(10)
        .filter(x => x > 20)
        .map(x => x * 2);

      expect(result.isNone()).toBe(true);
    });
  });

  describe('Singleton None', () => {
    it('should return same None instance', () => {
      const none1 = none();
      const none2 = none();
      expect(none1).toBe(none2);
    });

    it('should return same None from filter', () => {
      const filtered = some(42).filter(x => false);
      expect(filtered).toBe(none());
    });
  });
});
