import { describe, it, expect } from 'bun:test';
import {
  left,
  right,
  isLeft,
  isRight,
  map,
  mapLeft,
  biMap,
  andThen,
  orElse,
  swap,
  unwrapRight,
  unwrapLeft,
  getOrElse,
  getOrElseWith,
  match,
  toTuple,
  fromNullable,
  fromPredicate,
  tryCatch,
  tryCatchAsync,
  all,
  partition,
  type Either,
} from '../src/index.js';

describe('Either constructors', () => {
  it('should create Left either', () => {
    const either = left('error');
    expect(either._tag).toBe('Left');
    expect(either.left).toBe('error');
  });

  it('should create Right either', () => {
    const either = right(42);
    expect(either._tag).toBe('Right');
    expect(either.right).toBe(42);
  });

  it('should create Either from non-null value', () => {
    const either = fromNullable(42, 'error');
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should create Left from null', () => {
    const either = fromNullable(null, 'error');
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('error');
    }
  });

  it('should create Either from predicate (true)', () => {
    const either = fromPredicate(42, x => x > 0, 'negative');
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should create Either from predicate (false)', () => {
    const either = fromPredicate(-5, x => x > 0, 'negative');
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('negative');
    }
  });
});

describe('Either type guards', () => {
  it('should check if either is Left', () => {
    expect(isLeft(left('error'))).toBe(true);
    expect(isLeft(right(42))).toBe(false);
  });

  it('should check if either is Right', () => {
    expect(isRight(right(42))).toBe(true);
    expect(isRight(left('error'))).toBe(false);
  });
});

describe('Either transformations', () => {
  it('should map Right value', () => {
    const either = map(right(42), x => x * 2);
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(84);
    }
  });

  it('should not map Left value', () => {
    const either = map(left('error'), (x: number) => x * 2);
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('error');
    }
  });

  it('should map Left error', () => {
    const either = mapLeft(left('error'), e => `mapped: ${e}`);
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('mapped: error');
    }
  });

  it('should not map Right with mapLeft', () => {
    const either = mapLeft(right(42), (e: string) => `mapped: ${e}`);
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should biMap both sides', () => {
    const left1 = biMap(left('error'), e => e.length, x => x * 2);
    expect(isLeft(left1)).toBe(true);
    if (isLeft(left1)) {
      expect(left1.left).toBe(5);
    }

    const right1 = biMap(right(42), (e: string) => e.length, x => x * 2);
    expect(isRight(right1)).toBe(true);
    if (isRight(right1)) {
      expect(right1.right).toBe(84);
    }
  });
});

describe('Either chaining', () => {
  it('should chain Right with andThen', () => {
    const either = andThen(right(42), x => right(x * 2));
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(84);
    }
  });

  it('should not chain Left with andThen', () => {
    const either = andThen(left('error'), (x: number) => right(x * 2));
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('error');
    }
  });

  it('should chain Right to Left with andThen', () => {
    const either = andThen(right(42), x => (x > 50 ? right(x) : left('too small')));
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe('too small');
    }
  });

  it('should recover from Left with orElse', () => {
    const either = orElse(left('error'), () => right(42));
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should not recover from Right with orElse', () => {
    const either = orElse(right(42), () => right(100));
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });
});

describe('Either swap', () => {
  it('should swap Left to Right', () => {
    const either = swap(left('error'));
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe('error');
    }
  });

  it('should swap Right to Left', () => {
    const either = swap(right(42));
    expect(isLeft(either)).toBe(true);
    if (isLeft(either)) {
      expect(either.left).toBe(42);
    }
  });
});

describe('Either extraction', () => {
  it('should unwrap Right value', () => {
    expect(unwrapRight(right(42))).toBe(42);
  });

  it('should throw when unwrapping Left as Right', () => {
    expect(() => unwrapRight(left('error'))).toThrow();
  });

  it('should unwrap Left value', () => {
    expect(unwrapLeft(left('error'))).toBe('error');
  });

  it('should throw when unwrapping Right as Left', () => {
    expect(() => unwrapLeft(right(42))).toThrow();
  });

  it('should get Right with getOrElse', () => {
    expect(getOrElse(right(42), 0)).toBe(42);
  });

  it('should return default when Left with getOrElse', () => {
    expect(getOrElse(left('error'), 0)).toBe(0);
  });

  it('should get Right with getOrElseWith', () => {
    expect(getOrElseWith(right(42), () => 0)).toBe(42);
  });

  it('should compute default when Left with getOrElseWith', () => {
    expect(getOrElseWith(left('error'), e => e.length)).toBe(5);
  });
});

describe('Either pattern matching', () => {
  it('should match Left', () => {
    const result = match(left('error'), {
      onLeft: e => `Error: ${e}`,
      onRight: (x: number) => `Value: ${x}`,
    });
    expect(result).toBe('Error: error');
  });

  it('should match Right', () => {
    const result = match(right(42), {
      onLeft: (e: string) => `Error: ${e}`,
      onRight: x => `Value: ${x}`,
    });
    expect(result).toBe('Value: 42');
  });
});

describe('Either conversion', () => {
  it('should convert Left to tuple', () => {
    const tuple = toTuple(left('error'));
    expect(tuple).toEqual(['error', null]);
  });

  it('should convert Right to tuple', () => {
    const tuple = toTuple(right(42));
    expect(tuple).toEqual([null, 42]);
  });
});

describe('Either try-catch', () => {
  it('should catch successful execution', () => {
    const either = tryCatch(
      () => 42,
      e => String(e)
    );
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should catch thrown error', () => {
    const either = tryCatch(
      () => {
        throw new Error('boom');
      },
      e => String(e)
    );
    expect(isLeft(either)).toBe(true);
  });

  it('should catch async successful execution', async () => {
    const either = await tryCatchAsync(
      async () => 42,
      e => String(e)
    );
    expect(isRight(either)).toBe(true);
    if (isRight(either)) {
      expect(either.right).toBe(42);
    }
  });

  it('should catch async thrown error', async () => {
    const either = await tryCatchAsync(
      async () => {
        throw new Error('boom');
      },
      e => String(e)
    );
    expect(isLeft(either)).toBe(true);
  });
});

describe('Either combinators', () => {
  it('should combine all Right eithers', () => {
    const eithers = [right(1), right(2), right(3)];
    const combined = all(eithers);
    expect(isRight(combined)).toBe(true);
    if (isRight(combined)) {
      expect(combined.right).toEqual([1, 2, 3]);
    }
  });

  it('should return first Left when combining', () => {
    const eithers = [right(1), left('error'), right(3)];
    const combined = all(eithers);
    expect(isLeft(combined)).toBe(true);
    if (isLeft(combined)) {
      expect(combined.left).toBe('error');
    }
  });

  it('should handle empty array', () => {
    const combined = all([]);
    expect(isRight(combined)).toBe(true);
    if (isRight(combined)) {
      expect(combined.right).toEqual([]);
    }
  });

  it('should partition eithers', () => {
    const eithers = [left('error1'), right(1), left('error2'), right(2)];
    const [lefts, rights] = partition(eithers);
    expect(lefts).toEqual(['error1', 'error2']);
    expect(rights).toEqual([1, 2]);
  });

  it('should handle all Lefts', () => {
    const eithers = [left('error1'), left('error2')];
    const [lefts, rights] = partition(eithers);
    expect(lefts).toEqual(['error1', 'error2']);
    expect(rights).toEqual([]);
  });

  it('should handle all Rights', () => {
    const eithers = [right(1), right(2)];
    const [lefts, rights] = partition(eithers);
    expect(lefts).toEqual([]);
    expect(rights).toEqual([1, 2]);
  });
});

describe('Either type tests', () => {
  it('should have correct type inference for Left', () => {
    const either: Either<string, number> = left('error');
    expect(either._tag).toBeDefined();
  });

  it('should have correct type inference for Right', () => {
    const either: Either<string, number> = right(42);
    expect(either._tag).toBeDefined();
  });

  it('should chain operations with correct types', () => {
    const either: Either<string, number> = right(42);
    const mapped = map(either, x => x.toString());
    const chained = andThen(mapped, s => right(parseInt(s, 10)));
    expect(isRight(chained)).toBeDefined();
  });
});
