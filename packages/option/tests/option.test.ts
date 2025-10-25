import { describe, it, expect } from 'bun:test';
import {
  some,
  none,
  fromNullable,
  isSome,
  isNone,
  map,
  andThen,
  or,
  orElse,
  filter,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  toNullable,
  toUndefined,
  match,
  all,
  any,
  zip,
  zipWith,
  type Option,
} from '../src/index.js';

describe('Option constructors', () => {
  it('should create Some option', () => {
    const option = some(42);
    expect(option._tag).toBe('Some');
    expect(option.value).toBe(42);
  });

  it('should create None option', () => {
    const option = none();
    expect(option._tag).toBe('None');
  });

  it('should create Option from non-null value', () => {
    const option = fromNullable(42);
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(42);
    }
  });

  it('should create None from null', () => {
    const option = fromNullable(null);
    expect(isNone(option)).toBe(true);
  });

  it('should create None from undefined', () => {
    const option = fromNullable(undefined);
    expect(isNone(option)).toBe(true);
  });
});

describe('Option type guards', () => {
  it('should check if option is Some', () => {
    expect(isSome(some(42))).toBe(true);
    expect(isSome(none())).toBe(false);
  });

  it('should check if option is None', () => {
    expect(isNone(none())).toBe(true);
    expect(isNone(some(42))).toBe(false);
  });
});

describe('Option transformations', () => {
  it('should map Some value', () => {
    const option = map(some(42), x => x * 2);
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(84);
    }
  });

  it('should not map None value', () => {
    const option = map(none(), (x: number) => x * 2);
    expect(isNone(option)).toBe(true);
  });
});

describe('Option chaining', () => {
  it('should chain Some with andThen', () => {
    const option = andThen(some(42), x => some(x * 2));
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(84);
    }
  });

  it('should not chain None with andThen', () => {
    const option = andThen(none(), (x: number) => some(x * 2));
    expect(isNone(option)).toBe(true);
  });

  it('should chain Some to None with andThen', () => {
    const option = andThen(some(42), x => (x > 50 ? some(x) : none()));
    expect(isNone(option)).toBe(true);
  });

  it('should use alternative with or', () => {
    const option = or(none(), some(42));
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(42);
    }
  });

  it('should not use alternative if Some', () => {
    const option = or(some(10), some(42));
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(10);
    }
  });

  it('should lazily provide alternative with orElse', () => {
    let called = false;
    const option = orElse(some(10), () => {
      called = true;
      return some(42);
    });
    expect(isSome(option)).toBe(true);
    expect(called).toBe(false);
  });

  it('should call orElse when None', () => {
    let called = false;
    const option = orElse(none(), () => {
      called = true;
      return some(42);
    });
    expect(isSome(option)).toBe(true);
    expect(called).toBe(true);
  });
});

describe('Option filtering', () => {
  it('should keep value if predicate is true', () => {
    const option = filter(some(42), x => x > 40);
    expect(isSome(option)).toBe(true);
    if (isSome(option)) {
      expect(option.value).toBe(42);
    }
  });

  it('should filter out value if predicate is false', () => {
    const option = filter(some(42), x => x > 50);
    expect(isNone(option)).toBe(true);
  });

  it('should handle None with filter', () => {
    const option = filter(none(), (x: number) => x > 40);
    expect(isNone(option)).toBe(true);
  });
});

describe('Option extraction', () => {
  it('should unwrap Some value', () => {
    expect(unwrap(some(42))).toBe(42);
  });

  it('should throw when unwrapping None', () => {
    expect(() => unwrap(none())).toThrow();
  });

  it('should unwrap Some with unwrapOr', () => {
    expect(unwrapOr(some(42), 0)).toBe(42);
  });

  it('should return default when unwrapping None with unwrapOr', () => {
    expect(unwrapOr(none(), 0)).toBe(0);
  });

  it('should unwrap Some with unwrapOrElse', () => {
    expect(unwrapOrElse(some(42), () => 0)).toBe(42);
  });

  it('should compute default when unwrapping None with unwrapOrElse', () => {
    expect(unwrapOrElse(none(), () => 42)).toBe(42);
  });
});

describe('Option conversion', () => {
  it('should convert Some to nullable', () => {
    expect(toNullable(some(42))).toBe(42);
  });

  it('should convert None to null', () => {
    expect(toNullable(none())).toBeNull();
  });

  it('should convert Some to value', () => {
    expect(toUndefined(some(42))).toBe(42);
  });

  it('should convert None to undefined', () => {
    expect(toUndefined(none())).toBeUndefined();
  });
});

describe('Option pattern matching', () => {
  it('should match Some', () => {
    const result = match(some(42), {
      onSome: x => x * 2,
      onNone: () => 0,
    });
    expect(result).toBe(84);
  });

  it('should match None', () => {
    const result = match(none(), {
      onSome: (x: number) => x * 2,
      onNone: () => 0,
    });
    expect(result).toBe(0);
  });
});

describe('Option combinators', () => {
  it('should combine all Some options', () => {
    const options = [some(1), some(2), some(3)];
    const combined = all(options);
    expect(isSome(combined)).toBe(true);
    if (isSome(combined)) {
      expect(combined.value).toEqual([1, 2, 3]);
    }
  });

  it('should return None when combining with None', () => {
    const options = [some(1), none(), some(3)];
    const combined = all(options);
    expect(isNone(combined)).toBe(true);
  });

  it('should handle empty array', () => {
    const combined = all([]);
    expect(isSome(combined)).toBe(true);
    if (isSome(combined)) {
      expect(combined.value).toEqual([]);
    }
  });

  it('should return first Some with any', () => {
    const options = [none(), some(42), some(100)];
    const result = any(options);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should return None when all are None', () => {
    const options = [none(), none(), none()];
    const result = any(options);
    expect(isNone(result)).toBe(true);
  });

  it('should zip two Some options', () => {
    const result = zip(some(1), some('a'));
    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value).toEqual([1, 'a']);
    }
  });

  it('should return None when zipping with None', () => {
    const result = zip(some(1), none());
    expect(isNone(result)).toBe(true);
  });

  it('should zip with function', () => {
    const result = zipWith(some(2), some(3), (a, b) => a + b);
    expect(isSome(result)).toBe(true);
    if (isSome(result)) {
      expect(result.value).toBe(5);
    }
  });

  it('should return None when zipWith has None', () => {
    const result = zipWith(some(2), none(), (a, b: number) => a + b);
    expect(isNone(result)).toBe(true);
  });
});

describe('Option type tests', () => {
  it('should have correct type inference for Some', () => {
    const option: Option<number> = some(42);
    expect(option._tag).toBeDefined();
  });

  it('should have correct type inference for None', () => {
    const option: Option<number> = none();
    expect(option._tag).toBeDefined();
  });

  it('should chain operations with correct types', () => {
    const option: Option<number> = some(42);
    const mapped = map(option, x => x.toString());
    const chained = andThen(mapped, s => some(parseInt(s, 10)));
    expect(isSome(chained)).toBeDefined();
  });
});
