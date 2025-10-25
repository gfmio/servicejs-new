import { describe, it, expect } from 'bun:test';
import { Identity, Id, of, pure } from '../src/index.js';

describe('Identity monad', () => {
  describe('Construction', () => {
    it('should create Identity with constructor', () => {
      const id = new Identity(42);
      expect(id.value).toBe(42);
    });

    it('should create Identity with static of', () => {
      const id = Identity.of(42);
      expect(id.value).toBe(42);
    });

    it('should create Identity with of function', () => {
      const id = of(42);
      expect(id.value).toBe(42);
    });

    it('should create Identity with pure function', () => {
      const id = pure(42);
      expect(id.value).toBe(42);
    });

    it('should work with Id alias', () => {
      const id = new Id(42);
      expect(id.value).toBe(42);
    });
  });

  describe('Functor (map)', () => {
    it('should map over value', () => {
      const result = Identity.of(42).map(x => x * 2);
      expect(result.value).toBe(84);
    });

    it('should chain multiple maps', () => {
      const result = Identity.of(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .map(x => x.toString());
      expect(result.value).toBe('25');
    });

    it('should preserve types through map', () => {
      const numId = Identity.of(42);
      const strId = numId.map(x => x.toString());
      const lenId = strId.map(s => s.length);
      expect(lenId.value).toBe(2);
    });
  });

  describe('Monad (andThen/flatMap/chain)', () => {
    it('should flatMap with andThen', () => {
      const result = Identity.of(42).andThen(x => Identity.of(x * 2));
      expect(result.value).toBe(84);
    });

    it('should flatMap with flatMap', () => {
      const result = Identity.of(42).flatMap(x => Identity.of(x * 2));
      expect(result.value).toBe(84);
    });

    it('should flatMap with chain', () => {
      const result = Identity.of(42).chain(x => Identity.of(x * 2));
      expect(result.value).toBe(84);
    });

    it('should chain multiple flatMaps', () => {
      const result = Identity.of(10)
        .andThen(x => Identity.of(x * 2))
        .andThen(x => Identity.of(x + 5))
        .andThen(x => Identity.of(x.toString()));
      expect(result.value).toBe('25');
    });

    it('should mix map and flatMap', () => {
      const result = Identity.of(10)
        .map(x => x * 2)
        .andThen(x => Identity.of(x + 5))
        .map(x => x.toString());
      expect(result.value).toBe('25');
    });
  });

  describe('Applicative (ap)', () => {
    it('should apply wrapped function', () => {
      const fn = Identity.of((x: number) => x * 2);
      const val = Identity.of(42);
      const result = val.ap(fn);
      expect(result.value).toBe(84);
    });

    it('should compose with curried functions', () => {
      const add = (x: number) => (y: number) => x + y;
      const addFive = Identity.of(5).map(add);
      const result = Identity.of(10).ap(addFive);
      expect(result.value).toBe(15);
    });
  });

  describe('Extraction', () => {
    it('should unwrap value', () => {
      const value = Identity.of(42).unwrap();
      expect(value).toBe(42);
    });

    it('should extract value', () => {
      const value = Identity.of(42).extract();
      expect(value).toBe(42);
    });

    it('should unwrap after transformations', () => {
      const value = Identity.of(10)
        .map(x => x * 2)
        .map(x => x + 5)
        .unwrap();
      expect(value).toBe(25);
    });
  });

  describe('Side effects (tap)', () => {
    it('should execute side effect', () => {
      let sideEffect = 0;
      const result = Identity.of(42).tap(x => {
        sideEffect = x;
      });
      expect(sideEffect).toBe(42);
      expect(result.value).toBe(42);
    });

    it('should chain with tap', () => {
      const effects: number[] = [];
      const result = Identity.of(10)
        .map(x => x * 2)
        .tap(x => effects.push(x))
        .map(x => x + 5)
        .tap(x => effects.push(x))
        .unwrap();

      expect(effects).toEqual([20, 25]);
      expect(result).toBe(25);
    });
  });

  describe('Serialization', () => {
    it('should convert to string', () => {
      const str = Identity.of(42).toString();
      expect(str).toBe('Identity(42)');
    });

    it('should convert object to string', () => {
      const str = Identity.of({ x: 42, y: 'hello' }).toString();
      expect(str).toBe('Identity({"x":42,"y":"hello"})');
    });

    it('should convert to JSON', () => {
      const json = Identity.of(42).toJSON();
      expect(json).toBe(42);
    });

    it('should serialize in JSON.stringify', () => {
      const obj = { value: Identity.of(42) };
      const json = JSON.stringify(obj);
      expect(json).toBe('{"value":42}');
    });
  });

  describe('Real-world examples', () => {
    it('should calculate with chaining', () => {
      const result = Identity.of(42)
        .map(x => x / 2)
        .map(x => x + 8)
        .map(x => x * 3)
        .unwrap();
      expect(result).toBe(87);
    });

    it('should process strings', () => {
      const result = Identity.of('hello world')
        .map(s => s.toUpperCase())
        .map(s => s.split(' '))
        .map(arr => arr.reverse())
        .map(arr => arr.join('-'))
        .unwrap();
      expect(result).toBe('WORLD-HELLO');
    });

    it('should work with objects', () => {
      interface User {
        name: string;
        age: number;
      }

      const result = Identity.of<User>({ name: 'Alice', age: 30 })
        .map(user => ({ ...user, age: user.age + 1 }))
        .map(user => ({ ...user, name: user.name.toUpperCase() }))
        .unwrap();

      expect(result).toEqual({ name: 'ALICE', age: 31 });
    });

    it('should compose complex transformations', () => {
      const double = (x: number) => x * 2;
      const addTen = (x: number) => x + 10;
      const toString = (x: number) => x.toString();
      const length = (s: string) => s.length;

      const result = Identity.of(5)
        .map(double)
        .map(addTen)
        .map(toString)
        .map(length)
        .unwrap();

      expect(result).toBe(2); // "20".length
    });

    it('should use flatMap for conditional logic', () => {
      const validate = (x: number) =>
        x > 0 ? Identity.of(x) : Identity.of(0);

      const result1 = Identity.of(42)
        .andThen(validate)
        .map(x => x * 2)
        .unwrap();

      const result2 = Identity.of(-5)
        .andThen(validate)
        .map(x => x * 2)
        .unwrap();

      expect(result1).toBe(84);
      expect(result2).toBe(0);
    });
  });

  describe('Type safety', () => {
    it('should maintain type safety through transformations', () => {
      const result: number = Identity.of('42')
        .map(s => parseInt(s, 10))
        .map(n => n * 2)
        .unwrap();

      expect(result).toBe(84);
    });

    it('should work with union types', () => {
      const id: Identity<string | number> = Identity.of(42);
      const mapped = id.map(x => typeof x === 'number' ? x * 2 : x.length);
      expect(mapped.unwrap()).toBe(84);
    });

    it('should work with generic functions', () => {
      function wrapAndDouble<T extends number>(x: T): Identity<number> {
        return Identity.of(x).map(n => n * 2);
      }

      const result = wrapAndDouble(21).unwrap();
      expect(result).toBe(42);
    });
  });
});
