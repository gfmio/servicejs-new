import { describe, it, expect } from 'bun:test';
import {
  pipe,
  compose,
  identity,
  constant,
  noop,
  flip,
  curry,
  uncurry,
  partial,
  partialRight,
  not,
  and,
  or,
  once,
  memoize,
  tap,
  apply,
  applyTo,
  alwaysTrue,
  alwaysFalse,
  isNullish,
  isNotNullish,
  isDefined,
  isUndefined,
  equals,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  between,
  isEmpty,
  isNotEmpty,
  matches,
  startsWith,
  endsWith,
  contains,
  isEmptyArray,
  isNotEmptyArray,
  includes,
  isInstanceOf,
  hasProperty,
} from '../src/index.js';

describe('Composition', () => {
  it('should pipe functions left-to-right', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = pipe(addOne, double);
    expect(fn(5)).toBe(12);
  });

  it('should pipe three functions', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const toString = (x: number) => x.toString();
    const fn = pipe(addOne, double, toString);
    expect(fn(5)).toBe('12');
  });

  it('should compose functions right-to-left', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = compose(double, addOne);
    expect(fn(5)).toBe(12);
  });

  it('should compose three functions', () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const toString = (x: number) => x.toString();
    const fn = compose(toString, double, addOne);
    expect(fn(5)).toBe('12');
  });
});

describe('Basic combinators', () => {
  it('should return identity', () => {
    expect(identity(42)).toBe(42);
    expect(identity('hello')).toBe('hello');
  });

  it('should create constant function', () => {
    const fn = constant(42);
    expect(fn()).toBe(42);
    expect(fn()).toBe(42);
  });

  it('should do nothing with noop', () => {
    expect(noop()).toBeUndefined();
  });

  it('should flip binary function arguments', () => {
    const subtract = (a: number, b: number) => a - b;
    const flipped = flip(subtract);
    expect(flipped(5, 10)).toBe(5);
  });

  it('should curry binary function', () => {
    const add = (a: number, b: number) => a + b;
    const curried = curry(add);
    expect(curried(5)(10)).toBe(15);
  });

  it('should uncurry curried function', () => {
    const curried = (a: number) => (b: number) => a + b;
    const uncurried = uncurry(curried);
    expect(uncurried(5, 10)).toBe(15);
  });

  it('should partially apply first argument', () => {
    const add = (a: number, b: number) => a + b;
    const add5 = partial(add, 5);
    expect(add5(10)).toBe(15);
  });

  it('should partially apply second argument', () => {
    const subtract = (a: number, b: number) => a - b;
    const subtractFrom10 = partialRight(subtract, 10);
    expect(subtractFrom10(15)).toBe(5);
  });
});

describe('Predicate combinators', () => {
  it('should negate predicate', () => {
    const isEven = (x: number) => x % 2 === 0;
    const isOdd = not(isEven);
    expect(isOdd(3)).toBe(true);
    expect(isOdd(4)).toBe(false);
  });

  it('should combine predicates with AND', () => {
    const isPositive = (x: number) => x > 0;
    const isEven = (x: number) => x % 2 === 0;
    const isPositiveEven = and(isPositive, isEven);
    expect(isPositiveEven(4)).toBe(true);
    expect(isPositiveEven(3)).toBe(false);
    expect(isPositiveEven(-4)).toBe(false);
  });

  it('should combine predicates with OR', () => {
    const isNegative = (x: number) => x < 0;
    const isEven = (x: number) => x % 2 === 0;
    const isNegativeOrEven = or(isNegative, isEven);
    expect(isNegativeOrEven(4)).toBe(true);
    expect(isNegativeOrEven(-3)).toBe(true);
    expect(isNegativeOrEven(3)).toBe(false);
  });
});

describe('Advanced combinators', () => {
  it('should call function once only', () => {
    let count = 0;
    const fn = once(() => ++count);
    expect(fn()).toBe(1);
    expect(fn()).toBe(1);
    expect(fn()).toBe(1);
  });

  it('should memoize function results', () => {
    let callCount = 0;
    const expensive = memoize((x: number) => {
      callCount++;
      return x * 2;
    });
    expect(expensive(5)).toBe(10);
    expect(expensive(5)).toBe(10);
    expect(callCount).toBe(1);
    expect(expensive(10)).toBe(20);
    expect(callCount).toBe(2);
  });

  it('should tap into pipeline', () => {
    const logs: number[] = [];
    const logger = tap((x: number) => logs.push(x));
    const fn = pipe(
      (x: number) => x + 1,
      logger,
      (x: number) => x * 2
    );
    expect(fn(5)).toBe(12);
    expect(logs).toEqual([6]);
  });

  it('should apply function to value', () => {
    const double = (x: number) => x * 2;
    expect(apply(double, 5)).toBe(10);
  });

  it('should create applyTo function', () => {
    const double = (x: number) => x * 2;
    const applyTo5 = applyTo(5);
    expect(applyTo5(double)).toBe(10);
  });
});

describe('Basic predicates', () => {
  it('should always return true', () => {
    const pred = alwaysTrue<number>();
    expect(pred(42)).toBe(true);
  });

  it('should always return false', () => {
    const pred = alwaysFalse<number>();
    expect(pred(42)).toBe(false);
  });

  it('should check if nullish', () => {
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
    expect(isNullish(0)).toBe(false);
    expect(isNullish('')).toBe(false);
  });

  it('should check if not nullish', () => {
    expect(isNotNullish(42)).toBe(true);
    expect(isNotNullish(null)).toBe(false);
    expect(isNotNullish(undefined)).toBe(false);
  });

  it('should check if defined', () => {
    expect(isDefined(42)).toBe(true);
    expect(isDefined(undefined)).toBe(false);
  });

  it('should check if undefined', () => {
    expect(isUndefined(undefined)).toBe(true);
    expect(isUndefined(42)).toBe(false);
  });

  it('should check equality', () => {
    const is42 = equals(42);
    expect(is42(42)).toBe(true);
    expect(is42(43)).toBe(false);
  });
});

describe('Numeric predicates', () => {
  it('should check greater than', () => {
    const gt5 = greaterThan(5);
    expect(gt5(10)).toBe(true);
    expect(gt5(5)).toBe(false);
    expect(gt5(3)).toBe(false);
  });

  it('should check greater than or equal', () => {
    const gte5 = greaterThanOrEqual(5);
    expect(gte5(10)).toBe(true);
    expect(gte5(5)).toBe(true);
    expect(gte5(3)).toBe(false);
  });

  it('should check less than', () => {
    const lt5 = lessThan(5);
    expect(lt5(3)).toBe(true);
    expect(lt5(5)).toBe(false);
    expect(lt5(10)).toBe(false);
  });

  it('should check less than or equal', () => {
    const lte5 = lessThanOrEqual(5);
    expect(lte5(3)).toBe(true);
    expect(lte5(5)).toBe(true);
    expect(lte5(10)).toBe(false);
  });

  it('should check between', () => {
    const between5And10 = between(5, 10);
    expect(between5And10(7)).toBe(true);
    expect(between5And10(5)).toBe(true);
    expect(between5And10(10)).toBe(true);
    expect(between5And10(3)).toBe(false);
    expect(between5And10(12)).toBe(false);
  });
});

describe('String predicates', () => {
  it('should check if empty', () => {
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('hello')).toBe(false);
  });

  it('should check if not empty', () => {
    expect(isNotEmpty('hello')).toBe(true);
    expect(isNotEmpty('')).toBe(false);
  });

  it('should check regex match', () => {
    const isEmail = matches(/^[^@]+@[^@]+\.[^@]+$/);
    expect(isEmail('user@example.com')).toBe(true);
    expect(isEmail('invalid')).toBe(false);
  });

  it('should check starts with', () => {
    const startsWithHello = startsWith('hello');
    expect(startsWithHello('hello world')).toBe(true);
    expect(startsWithHello('goodbye')).toBe(false);
  });

  it('should check ends with', () => {
    const endsWithWorld = endsWith('world');
    expect(endsWithWorld('hello world')).toBe(true);
    expect(endsWithWorld('hello')).toBe(false);
  });

  it('should check contains', () => {
    const containsHello = contains('hello');
    expect(containsHello('say hello there')).toBe(true);
    expect(containsHello('goodbye')).toBe(false);
  });
});

describe('Array predicates', () => {
  it('should check if array is empty', () => {
    expect(isEmptyArray([])).toBe(true);
    expect(isEmptyArray([1])).toBe(false);
  });

  it('should check if array is not empty', () => {
    expect(isNotEmptyArray([1])).toBe(true);
    expect(isNotEmptyArray([])).toBe(false);
  });

  it('should check if array includes value', () => {
    const includes5 = includes(5);
    expect(includes5([1, 2, 5, 10])).toBe(true);
    expect(includes5([1, 2, 3])).toBe(false);
  });
});

describe('Type predicates', () => {
  it('should check instance of', () => {
    class MyClass {}
    const isMyClass = isInstanceOf(MyClass);
    expect(isMyClass(new MyClass())).toBe(true);
    expect(isMyClass({})).toBe(false);
  });

  it('should check has property', () => {
    const hasName = hasProperty('name');
    expect(hasName({ name: 'Alice' })).toBe(true);
    expect(hasName({ age: 30 })).toBe(false);
    expect(hasName(null)).toBe(false);
  });
});
