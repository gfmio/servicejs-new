/**
 * Result Type Performance Benchmarks
 *
 * Measures overhead of Result type operations.
 */

import { bench, run, group } from 'mitata';
import { ok, err, isOk, map, andThen, unwrap, unwrapOr } from '@servicejs/result';
import type { Result } from '@servicejs/result';

console.log('=== Result Type Benchmarks ===\n');

// Construction Benchmarks
group('Construction', () => {
  bench('ok(value)', () => {
    ok(42);
  });

  bench('err(error)', () => {
    err(new Error('test'));
  });

  bench('ok(complex object)', () => {
    ok({ type: 'data', values: [1, 2, 3], metadata: { timestamp: Date.now() } });
  });
});

// Type Checking Benchmarks
group('Type Checking', () => {
  const okResult = ok(42);
  const errResult = err(new Error('test'));

  bench('isOk (Ok result)', () => {
    isOk(okResult);
  });

  bench('isOk (Err result)', () => {
    isOk(errResult);
  });
});

// Mapping Benchmarks
group('Mapping', () => {
  const okResult = ok(42);
  const errResult: Result<number, Error> = err(new Error('test'));

  bench('map (Ok result)', () => {
    map(okResult, (x) => x * 2);
  });

  bench('map (Err result)', () => {
    map(errResult, (x) => x * 2);
  });

  bench('andThen (Ok result)', () => {
    andThen(okResult, (x) => ok(x * 2));
  });

  bench('andThen (Err result)', () => {
    andThen(errResult, (x) => ok(x * 2));
  });
});

// Unwrapping Benchmarks
group('Unwrapping', () => {
  const okResult = ok(42);
  const errResult: Result<number, Error> = err(new Error('test'));

  bench('unwrap (Ok result)', () => {
    unwrap(okResult);
  });

  bench('unwrapOr (Ok result)', () => {
    unwrapOr(okResult, 0);
  });

  bench('unwrapOr (Err result)', () => {
    unwrapOr(errResult, 0);
  });
});

// Chaining Benchmarks
group('Chaining Operations', () => {
  bench('chain 5 maps (Ok)', () => {
    let result = ok(1);
    result = map(result, (x) => x + 1);
    result = map(result, (x) => x * 2);
    result = map(result, (x) => x - 1);
    result = map(result, (x) => x / 2);
    result = map(result, (x) => x + 10);
  });

  bench('chain 5 andThens (Ok)', () => {
    let result = ok(1);
    result = andThen(result, (x) => ok(x + 1));
    result = andThen(result, (x) => ok(x * 2));
    result = andThen(result, (x) => ok(x - 1));
    result = andThen(result, (x) => ok(x / 2));
    result = andThen(result, (x) => ok(x + 10));
  });

  bench('chain 5 operations (mix)', () => {
    let result = ok(1);
    result = map(result, (x) => x + 1);
    result = andThen(result, (x) => ok(x * 2));
    result = map(result, (x) => x - 1);
    result = andThen(result, (x) => ok(x / 2));
    result = map(result, (x) => x + 10);
  });
});

// Real-world Simulation
group('Real-world Patterns', () => {
  function parseNumber(s: string): Result<number, Error> {
    const n = parseInt(s, 10);
    return isNaN(n) ? err(new Error('Invalid number')) : ok(n);
  }

  function validateRange(n: number): Result<number, Error> {
    return n >= 0 && n <= 100 ? ok(n) : err(new Error('Out of range'));
  }

  function double(n: number): Result<number, Error> {
    return ok(n * 2);
  }

  bench('parse -> validate -> transform', () => {
    let result = parseNumber('42');
    result = andThen(result, validateRange);
    result = andThen(result, double);
    unwrapOr(result, 0);
  });

  bench('parse -> validate -> transform (invalid)', () => {
    let result = parseNumber('invalid');
    result = andThen(result, validateRange);
    result = andThen(result, double);
    unwrapOr(result, 0);
  });

  bench('parse -> validate -> transform (out of range)', () => {
    let result = parseNumber('150');
    result = andThen(result, validateRange);
    result = andThen(result, double);
    unwrapOr(result, 0);
  });
});

// Comparison with try-catch
group('vs try-catch', () => {
  bench('Result-based error handling', () => {
    function divide(a: number, b: number): Result<number, Error> {
      if (b === 0) return err(new Error('Division by zero'));
      return ok(a / b);
    }

    const result = divide(10, 2);
    unwrapOr(result, 0);
  });

  bench('try-catch error handling', () => {
    function divide(a: number, b: number): number {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    }

    try {
      const result = divide(10, 2);
    } catch (e) {
      const result = 0;
    }
  });
});

await run();
