/**
 * Tests for Arithmetic HKTFs
 *
 * Type-level tests for arithmetic operations on number literal types.
 */

import { describe, expect, test } from 'bun:test';
import * as Arithmetic from '../src/arithmetic/index.js';
import * as HKTF from '../src/hktf.js';

// ============================================================================
// Type-level Test Helpers
// ============================================================================

/**
 * Assert that two types are exactly equal
 */
type AssertEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

/**
 * Compile-time assertion helper
 */
const assertType = <T extends true>(): void => {};

// ============================================================================
// Addition Tests
// ============================================================================

describe('Arithmetic - Add', () => {
  test('add positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: 2; b: 3 }>;
    assertType<AssertEqual<Result1, 5>>();

    type Result2 = HKTF.Apply<Arithmetic.Add, { a: 10; b: 20 }>;
    assertType<AssertEqual<Result2, 30>>();

    type Result3 = HKTF.Apply<Arithmetic.Add, { a: 0; b: 5 }>;
    assertType<AssertEqual<Result3, 5>>();
  });

  test('add negative numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: -5; b: -3 }>;
    assertType<AssertEqual<Result1, -8>>();

    type Result2 = HKTF.Apply<Arithmetic.Add, { a: -10; b: -10 }>;
    assertType<AssertEqual<Result2, -20>>();
  });

  test('add mixed sign numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: 5; b: -3 }>;
    assertType<AssertEqual<Result1, 2>>();

    type Result2 = HKTF.Apply<Arithmetic.Add, { a: -5; b: 3 }>;
    assertType<AssertEqual<Result2, -2>>();

    type Result3 = HKTF.Apply<Arithmetic.Add, { a: 10; b: -10 }>;
    assertType<AssertEqual<Result3, 0>>();
  });

  test('add with zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: 0; b: 0 }>;
    assertType<AssertEqual<Result1, 0>>();

    type Result2 = HKTF.Apply<Arithmetic.Add, { a: 5; b: 0 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Add, { a: 0; b: -5 }>;
    assertType<AssertEqual<Result3, -5>>();
  });

  test('runtime addition', () => {
    expect(Arithmetic.add(2, 3)).toBe(5);
    expect(Arithmetic.add({ a: 10, b: 20 })).toBe(30);
    expect(Arithmetic.add(-5, 3)).toBe(-2);
  });
});

// ============================================================================
// Subtraction Tests
// ============================================================================

describe('Arithmetic - Subtract', () => {
  test('subtract positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Subtract, { a: 5; b: 3 }>;
    assertType<AssertEqual<Result1, 2>>();

    type Result2 = HKTF.Apply<Arithmetic.Subtract, { a: 10; b: 4 }>;
    assertType<AssertEqual<Result2, 6>>();

    type Result3 = HKTF.Apply<Arithmetic.Subtract, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result3, -2>>();
  });

  test('subtract negative numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Subtract, { a: 5; b: -3 }>;
    assertType<AssertEqual<Result1, 8>>();

    type Result2 = HKTF.Apply<Arithmetic.Subtract, { a: -5; b: -3 }>;
    assertType<AssertEqual<Result2, -2>>();
  });

  test('subtract from zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Subtract, { a: 0; b: 5 }>;
    assertType<AssertEqual<Result1, -5>>();

    type Result2 = HKTF.Apply<Arithmetic.Subtract, { a: 5; b: 5 }>;
    assertType<AssertEqual<Result2, 0>>();
  });

  test('runtime subtraction', () => {
    expect(Arithmetic.subtract(5, 3)).toBe(2);
    expect(Arithmetic.subtract({ a: 10, b: 4 })).toBe(6);
    expect(Arithmetic.subtract(5, -3)).toBe(8);
  });
});

// ============================================================================
// Multiplication Tests
// ============================================================================

describe('Arithmetic - Multiply', () => {
  test('multiply positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Multiply, { a: 2; b: 3 }>;
    assertType<AssertEqual<Result1, 6>>();

    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: 5; b: 4 }>;
    assertType<AssertEqual<Result2, 20>>();

    type Result3 = HKTF.Apply<Arithmetic.Multiply, { a: 10; b: 10 }>;
    assertType<AssertEqual<Result3, 100>>();
  });

  test('multiply negative numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Multiply, { a: -2; b: 3 }>;
    assertType<AssertEqual<Result1, -6>>();

    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: -5; b: -4 }>;
    assertType<AssertEqual<Result2, 20>>();

    type Result3 = HKTF.Apply<Arithmetic.Multiply, { a: 2; b: -3 }>;
    assertType<AssertEqual<Result3, -6>>();
  });

  test('multiply by zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Multiply, { a: 0; b: 5 }>;
    assertType<AssertEqual<Result1, 0>>();

    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: 5; b: 0 }>;
    assertType<AssertEqual<Result2, 0>>();

    type Result3 = HKTF.Apply<Arithmetic.Multiply, { a: 0; b: 0 }>;
    assertType<AssertEqual<Result3, 0>>();
  });

  test('multiply by one', () => {
    type Result1 = HKTF.Apply<Arithmetic.Multiply, { a: 1; b: 5 }>;
    assertType<AssertEqual<Result1, 5>>();

    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: 5; b: 1 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Multiply, { a: -5; b: 1 }>;
    assertType<AssertEqual<Result3, -5>>();
  });

  test('runtime multiplication', () => {
    expect(Arithmetic.multiply(2, 3)).toBe(6);
    expect(Arithmetic.multiply({ a: 5, b: 4 })).toBe(20);
    expect(Arithmetic.multiply(-2, 3)).toBe(-6);
  });
});

// ============================================================================
// Division Tests
// ============================================================================

describe('Arithmetic - Divide', () => {
  test('divide positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Divide, { a: 6; b: 2 }>;
    assertType<AssertEqual<Result1, 3>>();

    type Result2 = HKTF.Apply<Arithmetic.Divide, { a: 10; b: 2 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Divide, { a: 20; b: 5 }>;
    assertType<AssertEqual<Result3, 4>>();
  });

  test('divide with remainder (integer division)', () => {
    type Result1 = HKTF.Apply<Arithmetic.Divide, { a: 7; b: 2 }>;
    assertType<AssertEqual<Result1, 3>>();

    type Result2 = HKTF.Apply<Arithmetic.Divide, { a: 10; b: 3 }>;
    assertType<AssertEqual<Result2, 3>>();
  });

  test('divide negative numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Divide, { a: -6; b: 2 }>;
    assertType<AssertEqual<Result1, -3>>();

    type Result2 = HKTF.Apply<Arithmetic.Divide, { a: 6; b: -2 }>;
    assertType<AssertEqual<Result2, -3>>();

    type Result3 = HKTF.Apply<Arithmetic.Divide, { a: -6; b: -2 }>;
    assertType<AssertEqual<Result3, 3>>();
  });

  test('divide zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Divide, { a: 0; b: 5 }>;
    assertType<AssertEqual<Result1, 0>>();
  });

  test('divide smaller by larger', () => {
    type Result1 = HKTF.Apply<Arithmetic.Divide, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result1, 0.6>>();

    type Result2 = HKTF.Apply<Arithmetic.Divide, { a: 2; b: 10 }>;
    assertType<AssertEqual<Result2, 0.2>>();
  });

  test('runtime division', () => {
    expect(Arithmetic.divide(6, 2)).toBe(3);
    expect(Arithmetic.divide({ a: 10, b: 2 })).toBe(5);
    expect(Arithmetic.divide(7, 2)).toBe(3.5);
  });
});

// ============================================================================
// Modulo Tests
// ============================================================================

describe('Arithmetic - Mod', () => {
  test('modulo positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Mod, { a: 7; b: 3 }>;
    assertType<AssertEqual<Result1, 1>>();

    type Result2 = HKTF.Apply<Arithmetic.Mod, { a: 10; b: 3 }>;
    assertType<AssertEqual<Result2, 1>>();

    type Result3 = HKTF.Apply<Arithmetic.Mod, { a: 12; b: 5 }>;
    assertType<AssertEqual<Result3, 2>>();
  });

  test('modulo with even division', () => {
    type Result1 = HKTF.Apply<Arithmetic.Mod, { a: 6; b: 3 }>;
    assertType<AssertEqual<Result1, 0>>();

    type Result2 = HKTF.Apply<Arithmetic.Mod, { a: 10; b: 5 }>;
    assertType<AssertEqual<Result2, 0>>();
  });

  test('modulo negative numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Mod, { a: -7; b: 3 }>;
    assertType<AssertEqual<Result1, -1>>();

    type Result2 = HKTF.Apply<Arithmetic.Mod, { a: 7; b: -3 }>;
    assertType<AssertEqual<Result2, 1>>();
  });

  test('modulo zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Mod, { a: 0; b: 5 }>;
    assertType<AssertEqual<Result1, 0>>();
  });

  test('modulo smaller by larger', () => {
    type Result1 = HKTF.Apply<Arithmetic.Mod, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result1, 3>>();

    type Result2 = HKTF.Apply<Arithmetic.Mod, { a: 2; b: 10 }>;
    assertType<AssertEqual<Result2, 2>>();
  });

  test('runtime modulo', () => {
    expect(Arithmetic.mod(7, 3)).toBe(1);
    expect(Arithmetic.mod({ a: 10, b: 3 })).toBe(1);
    expect(Arithmetic.mod(-7, 3)).toBe(-1);
  });
});

// ============================================================================
// Power Tests
// ============================================================================

describe('Arithmetic - Pow', () => {
  test('power of positive numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: 2; exponent: 3 }>;
    assertType<AssertEqual<Result1, 8>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: 3; exponent: 2 }>;
    assertType<AssertEqual<Result2, 9>>();

    type Result3 = HKTF.Apply<Arithmetic.Pow, { base: 5; exponent: 2 }>;
    assertType<AssertEqual<Result3, 25>>();

    type Result4 = HKTF.Apply<Arithmetic.Pow, { base: 2; exponent: 4 }>;
    assertType<AssertEqual<Result4, 16>>();
  });

  test('power of zero exponent', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: 5; exponent: 0 }>;
    assertType<AssertEqual<Result1, 1>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: 100; exponent: 0 }>;
    assertType<AssertEqual<Result2, 1>>();

    type Result3 = HKTF.Apply<Arithmetic.Pow, { base: 0; exponent: 0 }>;
    assertType<AssertEqual<Result3, 1>>();
  });

  test('power of one', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: 5; exponent: 1 }>;
    assertType<AssertEqual<Result1, 5>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: 1; exponent: 5 }>;
    assertType<AssertEqual<Result2, 1>>();
  });

  test('power of zero', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: 0; exponent: 5 }>;
    assertType<AssertEqual<Result1, 0>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: 0; exponent: 1 }>;
    assertType<AssertEqual<Result2, 0>>();
  });

  test('power of negative base with even exponent', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: -2; exponent: 2 }>;
    assertType<AssertEqual<Result1, 4>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: -3; exponent: 2 }>;
    assertType<AssertEqual<Result2, 9>>();

    type Result3 = HKTF.Apply<Arithmetic.Pow, { base: -2; exponent: 4 }>;
    assertType<AssertEqual<Result3, 16>>();
  });

  test('power of negative base with odd exponent', () => {
    type Result1 = HKTF.Apply<Arithmetic.Pow, { base: -2; exponent: 3 }>;
    assertType<AssertEqual<Result1, -8>>();

    type Result2 = HKTF.Apply<Arithmetic.Pow, { base: -3; exponent: 3 }>;
    assertType<AssertEqual<Result2, -27>>();
  });

  test('runtime power', () => {
    expect(Arithmetic.pow(2, 3)).toBe(8);
    expect(Arithmetic.pow({ base: 3, exponent: 2 })).toBe(9);
    expect(Arithmetic.pow(-2, 2)).toBe(4);
  });
});

// ============================================================================
// Comparison Tests
// ============================================================================

describe('Arithmetic - Comparison', () => {
  test('less than', () => {
    type Result1 = HKTF.Apply<Arithmetic.Lt, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result1, 1>>();

    type Result2 = HKTF.Apply<Arithmetic.Lt, { a: 5; b: 3 }>;
    assertType<AssertEqual<Result2, 0>>();

    type Result3 = HKTF.Apply<Arithmetic.Lt, { a: 5; b: 5 }>;
    assertType<AssertEqual<Result3, 0>>();

    type Result4 = HKTF.Apply<Arithmetic.Lt, { a: -5; b: 3 }>;
    assertType<AssertEqual<Result4, 1>>();

    type Result5 = HKTF.Apply<Arithmetic.Lt, { a: -5; b: -3 }>;
    assertType<AssertEqual<Result5, 1>>();
  });

  test('greater than', () => {
    type Result1 = HKTF.Apply<Arithmetic.Gt, { a: 5; b: 3 }>;
    assertType<AssertEqual<Result1, 1>>();

    type Result2 = HKTF.Apply<Arithmetic.Gt, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result2, 0>>();

    type Result3 = HKTF.Apply<Arithmetic.Gt, { a: 5; b: 5 }>;
    assertType<AssertEqual<Result3, 0>>();

    type Result4 = HKTF.Apply<Arithmetic.Gt, { a: 3; b: -5 }>;
    assertType<AssertEqual<Result4, 1>>();
  });

  test('max', () => {
    type Result1 = HKTF.Apply<Arithmetic.Max, { a: 5; b: 3 }>;
    assertType<AssertEqual<Result1, 5>>();

    type Result2 = HKTF.Apply<Arithmetic.Max, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Max, { a: -5; b: -3 }>;
    assertType<AssertEqual<Result3, -3>>();
  });

  test('min', () => {
    type Result1 = HKTF.Apply<Arithmetic.Min, { a: 5; b: 3 }>;
    assertType<AssertEqual<Result1, 3>>();

    type Result2 = HKTF.Apply<Arithmetic.Min, { a: 3; b: 5 }>;
    assertType<AssertEqual<Result2, 3>>();

    type Result3 = HKTF.Apply<Arithmetic.Min, { a: -5; b: -3 }>;
    assertType<AssertEqual<Result3, -5>>();
  });

  test('runtime comparisons', () => {
    expect(Arithmetic.lt(3, 5)).toBe(1);
    expect(Arithmetic.gt(5, 3)).toBe(1);
    expect(Arithmetic.max(5, 3)).toBe(5);
    expect(Arithmetic.min(5, 3)).toBe(3);
  });
});

// ============================================================================
// Utility Tests
// ============================================================================

describe('Arithmetic - Utilities', () => {
  test('absolute value', () => {
    type Result1 = HKTF.Apply<Arithmetic.Abs, { n: 5 }>;
    assertType<AssertEqual<Result1, 5>>();

    type Result2 = HKTF.Apply<Arithmetic.Abs, { n: -5 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Abs, { n: 0 }>;
    assertType<AssertEqual<Result3, 0>>();
  });

  test('negate', () => {
    type Result1 = HKTF.Apply<Arithmetic.Negate, { n: 5 }>;
    assertType<AssertEqual<Result1, -5>>();

    type Result2 = HKTF.Apply<Arithmetic.Negate, { n: -5 }>;
    assertType<AssertEqual<Result2, 5>>();

    type Result3 = HKTF.Apply<Arithmetic.Negate, { n: 0 }>;
    assertType<AssertEqual<Result3, 0>>();
  });

  test('runtime utilities', () => {
    expect(Arithmetic.abs(5)).toBe(5);
    expect(Arithmetic.abs(-5)).toBe(5);
    expect(Arithmetic.negate(5)).toBe(-5);
    expect(Arithmetic.negate(-5)).toBe(5);
  });
});

// ============================================================================
// Complex Expression Tests
// ============================================================================

describe('Arithmetic - Complex Expressions', () => {
  test('chain multiple operations', () => {
    // (5 + 3) * 2 = 16
    type Step1 = HKTF.Apply<Arithmetic.Add, { a: 5; b: 3 }>;
    type Step2 = HKTF.Apply<Arithmetic.Multiply, { a: Step1; b: 2 }>;
    assertType<AssertEqual<Step2, 16>>();

    // (10 - 2) / 4 = 2
    type Step3 = HKTF.Apply<Arithmetic.Subtract, { a: 10; b: 2 }>;
    type Step4 = HKTF.Apply<Arithmetic.Divide, { a: Step3; b: 4 }>;
    assertType<AssertEqual<Step4, 2>>();

    // 2^3 + 1 = 9
    type Step5 = HKTF.Apply<Arithmetic.Pow, { base: 2; exponent: 3 }>;
    type Step6 = HKTF.Apply<Arithmetic.Add, { a: Step5; b: 1 }>;
    assertType<AssertEqual<Step6, 9>>();
  });

  test('nested arithmetic', () => {
    // ((2 + 3) * 4) - 5 = 15
    type AddResult = HKTF.Apply<Arithmetic.Add, { a: 2; b: 3 }>;
    type MulResult = HKTF.Apply<Arithmetic.Multiply, { a: AddResult; b: 4 }>;
    type SubResult = HKTF.Apply<Arithmetic.Subtract, { a: MulResult; b: 5 }>;
    assertType<AssertEqual<SubResult, 15>>();
  });

  test('runtime complex expressions', () => {
    // (5 + 3) * 2 = 16
    const step1 = Arithmetic.add(5, 3);
    const step2 = Arithmetic.multiply(step1, 2);
    expect(step2).toBe(16);
  });
});

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Arithmetic - Edge Cases', () => {
  test('operations with larger numbers', () => {
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: 50; b: 50 }>;
    assertType<AssertEqual<Result1, 100>>();

    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: 10; b: 10 }>;
    assertType<AssertEqual<Result2, 100>>();
  });

  test('identity operations', () => {
    // Add zero
    type Result1 = HKTF.Apply<Arithmetic.Add, { a: 42; b: 0 }>;
    assertType<AssertEqual<Result1, 42>>();

    // Multiply by one
    type Result2 = HKTF.Apply<Arithmetic.Multiply, { a: 42; b: 1 }>;
    assertType<AssertEqual<Result2, 42>>();

    // Power of one
    type Result3 = HKTF.Apply<Arithmetic.Pow, { base: 42; exponent: 1 }>;
    assertType<AssertEqual<Result3, 42>>();
  });

  test('runtime edge cases', () => {
    expect(Arithmetic.add(50, 50)).toBe(100);
    expect(Arithmetic.multiply(10, 10)).toBe(100);
    expect(Arithmetic.add(42, 0)).toBe(42);
    expect(Arithmetic.multiply(42, 1)).toBe(42);
  });
});
