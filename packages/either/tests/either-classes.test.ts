import { describe, it, expect } from 'bun:test';
import { left, right, Left, Right } from '../src/index.js';

describe('Either class methods', () => {
  describe('Right methods', () => {
    it('should map Right value', () => {
      const either = right(42).map(x => x * 2);
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(84);
    });

    it('should chain with andThen', () => {
      const either = right(42).andThen(x => right(x * 2));
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(84);
    });

    it('should chain to Left with andThen', () => {
      const either = right(42).andThen(x => left('error'));
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe('error');
    });

    it('should not call orElse on Right', () => {
      const either = right(42).orElse(() => right(100));
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(42);
    });

    it('should swap Right to Left', () => {
      const either = right(42).swap();
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe(42);
    });

    it('should unwrap Right value', () => {
      expect(right(42).unwrapRight()).toBe(42);
    });

    it('should throw when unwrapping Right as Left', () => {
      expect(() => right(42).unwrapLeft()).toThrow();
    });

    it('should get Right with getOrElse', () => {
      expect(right(42).getOrElse(0)).toBe(42);
    });

    it('should get Right with getOrElseWith', () => {
      expect(right(42).getOrElseWith(() => 0)).toBe(42);
    });

    it('should match Right', () => {
      const result = right(42).match({
        onLeft: (e: string) => `Error: ${e}`,
        onRight: x => `Value: ${x}`,
      });
      expect(result).toBe('Value: 42');
    });

    it('should convert Right to tuple', () => {
      const tuple = right(42).toTuple();
      expect(tuple).toEqual([null, 42]);
    });

    it('should not mapLeft on Right', () => {
      const either = right(42).mapLeft((e: string) => e.length);
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(42);
    });

    it('should biMap Right value', () => {
      const either = right(42).biMap((e: string) => e.length, x => x * 2);
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(84);
    });

    it('should check isRight', () => {
      expect(right(42).isRight()).toBe(true);
      expect(right(42).isLeft()).toBe(false);
    });
  });

  describe('Left methods', () => {
    it('should not map Left value', () => {
      const either = left('error').map((x: number) => x * 2);
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe('error');
    });

    it('should mapLeft Left value', () => {
      const either = left('error').mapLeft(e => e.length);
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe(5);
    });

    it('should biMap Left value', () => {
      const either = left('error').biMap(e => e.length, (x: number) => x * 2);
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe(5);
    });

    it('should not chain Left with andThen', () => {
      const either = left('error').andThen((x: number) => right(x * 2));
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe('error');
    });

    it('should recover from Left with orElse', () => {
      const either = left('error').orElse(() => right(42));
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe(42);
    });

    it('should chain to another Left with orElse', () => {
      const either = left('error').orElse(e => left(e.length));
      expect(either.isLeft()).toBe(true);
      expect(either.unwrapLeft()).toBe(5);
    });

    it('should swap Left to Right', () => {
      const either = left('error').swap();
      expect(either.isRight()).toBe(true);
      expect(either.unwrapRight()).toBe('error');
    });

    it('should unwrap Left value', () => {
      expect(left('error').unwrapLeft()).toBe('error');
    });

    it('should throw when unwrapping Left as Right', () => {
      expect(() => left('error').unwrapRight()).toThrow();
    });

    it('should return default with getOrElse', () => {
      expect(left('error').getOrElse(42)).toBe(42);
    });

    it('should compute default with getOrElseWith', () => {
      expect(left('error').getOrElseWith(e => e.length)).toBe(5);
    });

    it('should match Left', () => {
      const result = left('error').match({
        onLeft: e => `Error: ${e}`,
        onRight: (x: number) => `Value: ${x}`,
      });
      expect(result).toBe('Error: error');
    });

    it('should convert Left to tuple', () => {
      const tuple = left('error').toTuple();
      expect(tuple).toEqual(['error', null]);
    });

    it('should check isLeft', () => {
      expect(left('error').isLeft()).toBe(true);
      expect(left('error').isRight()).toBe(false);
    });
  });

  describe('Method chaining', () => {
    it('should chain multiple Right operations', () => {
      const result = right(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .andThen(x => right(x.toString()))
        .map(s => s.length);

      expect(result.isRight()).toBe(true);
      expect(result.unwrapRight()).toBe(2); // "25".length
    });

    it('should short-circuit on Left', () => {
      const result = right(10)
        .map(x => x * 2)
        .andThen(x => left('error'))
        .map((x: number) => x + 5); // This won't execute

      expect(result.isLeft()).toBe(true);
      expect(result.unwrapLeft()).toBe('error');
    });

    it('should recover from Left and continue', () => {
      const result = right(10)
        .andThen(x => left('error'))
        .orElse(() => right(42))
        .map(x => x * 2);

      expect(result.isRight()).toBe(true);
      expect(result.unwrapRight()).toBe(84);
    });

    it('should transform errors with mapLeft', () => {
      const result = left('error')
        .mapLeft(e => e.toUpperCase())
        .mapLeft(e => `${e}!`);

      expect(result.isLeft()).toBe(true);
      expect(result.unwrapLeft()).toBe('ERROR!');
    });
  });
});
