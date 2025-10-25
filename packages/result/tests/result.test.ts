import { describe, it, expect } from 'bun:test';
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  orElse,
  unwrap,
  unwrapOr,
  unwrapOrElse,
  unwrapErr,
  match,
  toOption,
  all,
  tryCatch,
  tryCatchAsync,
  type Result,
} from '../src/index.js';

describe('Result constructors', () => {
  it('should create Ok result', () => {
    const result = ok(42);
    expect(result._tag).toBe('Ok');
    expect(result.value).toBe(42);
  });

  it('should create Err result', () => {
    const result = err('error');
    expect(result._tag).toBe('Err');
    expect(result.error).toBe('error');
  });
});

describe('Result type guards', () => {
  it('should check if result is Ok', () => {
    expect(isOk(ok(42))).toBe(true);
    expect(isOk(err('error'))).toBe(false);
  });

  it('should check if result is Err', () => {
    expect(isErr(err('error'))).toBe(true);
    expect(isErr(ok(42))).toBe(false);
  });
});

describe('Result transformations', () => {
  it('should map Ok value', () => {
    const result = map(ok(42), x => x * 2);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(84);
    }
  });

  it('should not map Err value', () => {
    const result = map(err('error'), (x: number) => x * 2);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('error');
    }
  });

  it('should map Err error', () => {
    const result = mapErr(err('error'), e => `mapped: ${e}`);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('mapped: error');
    }
  });

  it('should not map Ok error', () => {
    const result = mapErr(ok(42), (e: string) => `mapped: ${e}`);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });
});

describe('Result chaining', () => {
  it('should chain Ok with andThen', () => {
    const result = andThen(ok(42), x => ok(x * 2));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(84);
    }
  });

  it('should not chain Err with andThen', () => {
    const result = andThen(err('error'), (x: number) => ok(x * 2));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('error');
    }
  });

  it('should chain Err to Ok with andThen', () => {
    const result = andThen(ok(42), x => (x > 50 ? ok(x) : err('too small')));
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('too small');
    }
  });

  it('should recover from Err with orElse', () => {
    const result = orElse(err('error'), () => ok(42));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should not recover from Ok with orElse', () => {
    const result = orElse(ok(42), () => ok(100));
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });
});

describe('Result extraction', () => {
  it('should unwrap Ok value', () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it('should throw when unwrapping Err', () => {
    expect(() => unwrap(err('error'))).toThrow();
  });

  it('should unwrap Ok with unwrapOr', () => {
    expect(unwrapOr(ok(42), 0)).toBe(42);
  });

  it('should return default when unwrapping Err with unwrapOr', () => {
    expect(unwrapOr(err('error'), 0)).toBe(0);
  });

  it('should unwrap Ok with unwrapOrElse', () => {
    expect(unwrapOrElse(ok(42), () => 0)).toBe(42);
  });

  it('should compute default when unwrapping Err with unwrapOrElse', () => {
    expect(unwrapOrElse(err('error'), e => e.length)).toBe(5);
  });

  it('should unwrap Err error', () => {
    expect(unwrapErr(err('error'))).toBe('error');
  });

  it('should throw when unwrapping Ok error', () => {
    expect(() => unwrapErr(ok(42))).toThrow();
  });
});

describe('Result pattern matching', () => {
  it('should match Ok', () => {
    const result = match(ok(42), {
      onOk: x => x * 2,
      onErr: () => 0,
    });
    expect(result).toBe(84);
  });

  it('should match Err', () => {
    const result = match(err('error'), {
      onOk: (x: number) => x * 2,
      onErr: e => e.length,
    });
    expect(result).toBe(5);
  });
});

describe('Result conversion', () => {
  it('should convert Ok to Some', () => {
    const option = toOption(ok(42));
    expect(option.isSome()).toBe(true);
    if (option.isSome()) {
      expect(option.value).toBe(42);
    }
  });

  it('should convert Err to None', () => {
    const option = toOption(err('error'));
    expect(option.isNone()).toBe(true);
  });
});

describe('Result combinators', () => {
  it('should combine all Ok results', () => {
    const results = [ok(1), ok(2), ok(3)];
    const combined = all(results);
    expect(isOk(combined)).toBe(true);
    if (isOk(combined)) {
      expect(combined.value).toEqual([1, 2, 3]);
    }
  });

  it('should return first Err when combining', () => {
    const results = [ok(1), err('error'), ok(3)];
    const combined = all(results);
    expect(isErr(combined)).toBe(true);
    if (isErr(combined)) {
      expect(combined.error).toBe('error');
    }
  });

  it('should handle empty array', () => {
    const combined = all([]);
    expect(isOk(combined)).toBe(true);
    if (isOk(combined)) {
      expect(combined.value).toEqual([]);
    }
  });
});

describe('Result try-catch', () => {
  it('should catch successful execution', () => {
    const result = tryCatch(
      () => 42,
      e => String(e)
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should catch thrown error', () => {
    const result = tryCatch(
      () => {
        throw new Error('boom');
      },
      e => String(e)
    );
    expect(isErr(result)).toBe(true);
  });

  it('should catch async successful execution', async () => {
    const result = await tryCatchAsync(
      async () => 42,
      e => String(e)
    );
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(42);
    }
  });

  it('should catch async thrown error', async () => {
    const result = await tryCatchAsync(
      async () => {
        throw new Error('boom');
      },
      e => String(e)
    );
    expect(isErr(result)).toBe(true);
  });
});

describe('Result type tests', () => {
  it('should have correct type inference for Ok', () => {
    const result: Result<number, string> = ok(42);
    // Type test: this should compile
    expect(result._tag).toBeDefined();
  });

  it('should have correct type inference for Err', () => {
    const result: Result<number, string> = err('error');
    // Type test: this should compile
    expect(result._tag).toBeDefined();
  });

  it('should chain operations with correct types', () => {
    const result: Result<number, string> = ok(42);
    const mapped = map(result, x => x.toString());
    const chained = andThen(mapped, s => ok(parseInt(s, 10)));
    // Type test: this should compile
    expect(isOk(chained)).toBeDefined();
  });
});
