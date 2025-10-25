import { describe, it, expect } from 'bun:test';
import {
  success,
  failure,
  failures,
  isSuccess,
  isFailure,
  map,
  mapError,
  andThen,
  orElse,
  fold,
  getOrElse,
  getOrElseWith,
  all,
  fromPredicate,
  fromPredicates,
  tryCatch,
  partition,
  traverse,
  sequence,
  type Validation,
} from '../src/index.js';

describe('Validation constructors', () => {
  it('should create Success', () => {
    const v = success(42);
    expect(v._tag).toBe('Success');
    expect(v.value).toBe(42);
  });

  it('should create Failure from single error', () => {
    const v = failure('error');
    expect(v._tag).toBe('Failure');
    expect(v.errors).toEqual(['error']);
  });

  it('should create Failure from multiple errors', () => {
    const v = failure('error1', 'error2', 'error3');
    expect(v._tag).toBe('Failure');
    expect(v.errors).toEqual(['error1', 'error2', 'error3']);
  });

  it('should create Failure from error array', () => {
    const v = failures(['error1', 'error2']);
    expect(v._tag).toBe('Failure');
    expect(v.errors).toEqual(['error1', 'error2']);
  });
});

describe('Validation type guards', () => {
  it('should check if Success', () => {
    expect(isSuccess(success(42))).toBe(true);
    expect(isSuccess(failure('error'))).toBe(false);
  });

  it('should check if Failure', () => {
    expect(isFailure(failure('error'))).toBe(true);
    expect(isFailure(success(42))).toBe(false);
  });
});

describe('Validation transformations', () => {
  it('should map Success value', () => {
    const v = map(success(42), x => x * 2);
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(84);
    }
  });

  it('should not map Failure', () => {
    const v = map(failure('error'), (x: number) => x * 2);
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['error']);
    }
  });

  it('should map error values', () => {
    const v = mapError(failure('error'), e => e.toUpperCase());
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['ERROR']);
    }
  });

  it('should map multiple errors', () => {
    const v = mapError(failure('err1', 'err2'), e => e.toUpperCase());
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['ERR1', 'ERR2']);
    }
  });

  it('should not map errors on Success', () => {
    const v = mapError(success(42), (e: string) => e.toUpperCase());
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });
});

describe('Validation chaining', () => {
  it('should chain Success with andThen', () => {
    const v = andThen(success(42), x => success(x * 2));
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(84);
    }
  });

  it('should not chain Failure', () => {
    const v = andThen(failure('error'), (x: number) => success(x * 2));
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['error']);
    }
  });

  it('should chain Success to Failure', () => {
    const v = andThen(success(42), x => failure('too large'));
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['too large']);
    }
  });

  it('should recover from Failure with orElse', () => {
    const v = orElse(failure('error'), () => success(42));
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });

  it('should not recover from Success', () => {
    const v = orElse(success(42), () => success(100));
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });
});

describe('Validation folding', () => {
  it('should fold Success', () => {
    const result = fold(
      success(42),
      errors => `Errors: ${errors.join(', ')}`,
      value => `Value: ${value}`
    );
    expect(result).toBe('Value: 42');
  });

  it('should fold Failure', () => {
    const result = fold(
      failure('err1', 'err2'),
      errors => `Errors: ${errors.join(', ')}`,
      (value: number) => `Value: ${value}`
    );
    expect(result).toBe('Errors: err1, err2');
  });
});

describe('Validation extraction', () => {
  it('should get Success with getOrElse', () => {
    expect(getOrElse(success(42), 0)).toBe(42);
  });

  it('should get default for Failure with getOrElse', () => {
    expect(getOrElse(failure('error'), 0)).toBe(0);
  });

  it('should get Success with getOrElseWith', () => {
    expect(getOrElseWith(success(42), () => 0)).toBe(42);
  });

  it('should compute default for Failure with getOrElseWith', () => {
    expect(getOrElseWith(failure('err1', 'err2'), errors => errors.length)).toBe(2);
  });
});

describe('Validation combinators', () => {
  it('should combine all Successes', () => {
    const v = all([success(1), success(2), success(3)]);
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toEqual([1, 2, 3]);
    }
  });

  it('should accumulate all errors', () => {
    const v = all([
      success(1),
      failure('error1'),
      success(2),
      failure('error2', 'error3'),
    ]);
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['error1', 'error2', 'error3']);
    }
  });

  it('should handle empty array', () => {
    const v = all([]);
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toEqual([]);
    }
  });
});

describe('Validation from predicates', () => {
  it('should create Success from true predicate', () => {
    const v = fromPredicate(42, x => x > 0, 'negative');
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });

  it('should create Failure from false predicate', () => {
    const v = fromPredicate(-5, x => x > 0, 'negative');
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['negative']);
    }
  });

  it('should validate with multiple predicates (all pass)', () => {
    const v = fromPredicates(42, [
      [x => x > 0, 'must be positive'],
      [x => x < 100, 'must be less than 100'],
      [x => x % 2 === 0, 'must be even'],
    ]);
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });

  it('should accumulate errors from multiple predicates', () => {
    const v = fromPredicates(-5, [
      [x => x > 0, 'must be positive'],
      [x => x < 100, 'must be less than 100'],
      [x => x % 2 === 0, 'must be even'],
    ]);
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['must be positive', 'must be even']);
    }
  });
});

describe('Validation try-catch', () => {
  it('should catch successful execution', () => {
    const v = tryCatch(
      () => 42,
      e => String(e)
    );
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toBe(42);
    }
  });

  it('should catch thrown error', () => {
    const v = tryCatch(
      () => {
        throw new Error('boom');
      },
      e => String(e)
    );
    expect(isFailure(v)).toBe(true);
  });
});

describe('Validation partition', () => {
  it('should partition Successes and Failures', () => {
    const validations = [
      success(1),
      failure('err1'),
      success(2),
      failure('err2', 'err3'),
      success(3),
    ];
    const [errorArrays, values] = partition(validations);
    expect(errorArrays).toEqual([['err1'], ['err2', 'err3']]);
    expect(values).toEqual([1, 2, 3]);
  });

  it('should handle all Successes', () => {
    const validations = [success(1), success(2), success(3)];
    const [errorArrays, values] = partition(validations);
    expect(errorArrays).toEqual([]);
    expect(values).toEqual([1, 2, 3]);
  });

  it('should handle all Failures', () => {
    const validations = [failure('err1'), failure('err2')];
    const [errorArrays, values] = partition(validations);
    expect(errorArrays).toEqual([['err1'], ['err2']]);
    expect(values).toEqual([]);
  });
});

describe('Validation traverse', () => {
  it('should traverse with all Successes', () => {
    const v = traverse([1, 2, 3], x => success(x * 2));
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toEqual([2, 4, 6]);
    }
  });

  it('should accumulate errors from traverse', () => {
    const validate = (x: number) =>
      x > 0 ? success(x) : failure(`${x} is negative`);

    const v = traverse([1, -2, 3, -4], validate);
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['-2 is negative', '-4 is negative']);
    }
  });
});

describe('Validation sequence', () => {
  it('should sequence all Successes', () => {
    const v = sequence([success(1), success(2), success(3)]);
    expect(isSuccess(v)).toBe(true);
    if (isSuccess(v)) {
      expect(v.value).toEqual([1, 2, 3]);
    }
  });

  it('should accumulate all errors', () => {
    const v = sequence([success(1), failure('err1'), failure('err2')]);
    expect(isFailure(v)).toBe(true);
    if (isFailure(v)) {
      expect(v.errors).toEqual(['err1', 'err2']);
    }
  });
});

describe('Real-world validation scenarios', () => {
  interface UserInput {
    username: string;
    email: string;
    age: number;
  }

  const validateUsername = (username: string): Validation<string, string> =>
    fromPredicates(username, [
      [s => s.length >= 3, 'Username must be at least 3 characters'],
      [s => s.length <= 20, 'Username must be at most 20 characters'],
      [s => /^[a-zA-Z0-9_]+$/.test(s), 'Username can only contain letters, numbers, and underscores'],
    ]);

  const validateEmail = (email: string): Validation<string, string> =>
    fromPredicate(
      email,
      s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
      'Invalid email format'
    );

  const validateAge = (age: number): Validation<string, number> =>
    fromPredicates(age, [
      [x => x >= 0, 'Age must be non-negative'],
      [x => x <= 120, 'Age must be realistic'],
      [x => Number.isInteger(x), 'Age must be an integer'],
    ]);

  it('should validate valid user', () => {
    const input: UserInput = {
      username: 'john_doe',
      email: 'john@example.com',
      age: 30,
    };

    const result = all([
      validateUsername(input.username),
      validateEmail(input.email),
      validateAge(input.age),
    ]);

    expect(isSuccess(result)).toBe(true);
  });

  it('should accumulate all validation errors', () => {
    const input: UserInput = {
      username: 'ab',  // too short
      email: 'invalid-email',  // invalid format
      age: -5,  // negative and non-integer issue
    };

    const result = all([
      validateUsername(input.username),
      validateEmail(input.email),
      validateAge(input.age),
    ]);

    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Username must be at least 3 characters');
      expect(result.errors).toContain('Invalid email format');
      expect(result.errors).toContain('Age must be non-negative');
    }
  });
});
