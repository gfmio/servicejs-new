/**
 * Tests for Boolean HKTFs
 *
 * Type-level tests for boolean operations.
 */

import { describe, expect, test } from 'bun:test';
import * as Boolean from '../src/boolean/index.js';
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
// AND Tests
// ============================================================================

describe('Boolean - And', () => {
  test('type-level: true AND true = true', () => {
    type Result = HKTF.Apply<Boolean.And, { a: true; b: true }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: true AND false = false', () => {
    type Result = HKTF.Apply<Boolean.And, { a: true; b: false }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: false AND true = false', () => {
    type Result = HKTF.Apply<Boolean.And, { a: false; b: true }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: false AND false = false', () => {
    type Result = HKTF.Apply<Boolean.And, { a: false; b: false }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('runtime: AND with separate arguments', () => {
    expect(Boolean.and(true, true)).toBe(true);
    expect(Boolean.and(true, false)).toBe(false);
    expect(Boolean.and(false, true)).toBe(false);
    expect(Boolean.and(false, false)).toBe(false);
  });

  test('runtime: AND with object argument', () => {
    expect(Boolean.and({ a: true, b: true })).toBe(true);
    expect(Boolean.and({ a: true, b: false })).toBe(false);
    expect(Boolean.and({ a: false, b: true })).toBe(false);
    expect(Boolean.and({ a: false, b: false })).toBe(false);
  });
});

// ============================================================================
// OR Tests
// ============================================================================

describe('Boolean - Or', () => {
  test('type-level: true OR true = true', () => {
    type Result = HKTF.Apply<Boolean.Or, { a: true; b: true }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: true OR false = true', () => {
    type Result = HKTF.Apply<Boolean.Or, { a: true; b: false }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: false OR true = true', () => {
    type Result = HKTF.Apply<Boolean.Or, { a: false; b: true }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: false OR false = false', () => {
    type Result = HKTF.Apply<Boolean.Or, { a: false; b: false }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('runtime: OR with separate arguments', () => {
    expect(Boolean.or(true, true)).toBe(true);
    expect(Boolean.or(true, false)).toBe(true);
    expect(Boolean.or(false, true)).toBe(true);
    expect(Boolean.or(false, false)).toBe(false);
  });

  test('runtime: OR with object argument', () => {
    expect(Boolean.or({ a: true, b: true })).toBe(true);
    expect(Boolean.or({ a: true, b: false })).toBe(true);
    expect(Boolean.or({ a: false, b: true })).toBe(true);
    expect(Boolean.or({ a: false, b: false })).toBe(false);
  });
});

// ============================================================================
// NOT Tests
// ============================================================================

describe('Boolean - Not', () => {
  test('type-level: NOT true = false', () => {
    type Result = HKTF.Apply<Boolean.Not, { value: true }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: NOT false = true', () => {
    type Result = HKTF.Apply<Boolean.Not, { value: false }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('runtime: NOT with direct argument', () => {
    expect(Boolean.not(true)).toBe(false);
    expect(Boolean.not(false)).toBe(true);
  });

  test('runtime: NOT with object argument', () => {
    expect(Boolean.not({ value: true })).toBe(false);
    expect(Boolean.not({ value: false })).toBe(true);
  });
});

// ============================================================================
// XOR Tests
// ============================================================================

describe('Boolean - Xor', () => {
  test('type-level: true XOR true = false', () => {
    type Result = HKTF.Apply<Boolean.Xor, { a: true; b: true }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: true XOR false = true', () => {
    type Result = HKTF.Apply<Boolean.Xor, { a: true; b: false }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: false XOR true = true', () => {
    type Result = HKTF.Apply<Boolean.Xor, { a: false; b: true }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: false XOR false = false', () => {
    type Result = HKTF.Apply<Boolean.Xor, { a: false; b: false }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('runtime: XOR with separate arguments', () => {
    expect(Boolean.xor(true, true)).toBe(false);
    expect(Boolean.xor(true, false)).toBe(true);
    expect(Boolean.xor(false, true)).toBe(true);
    expect(Boolean.xor(false, false)).toBe(false);
  });

  test('runtime: XOR with object argument', () => {
    expect(Boolean.xor({ a: true, b: true })).toBe(false);
    expect(Boolean.xor({ a: true, b: false })).toBe(true);
    expect(Boolean.xor({ a: false, b: true })).toBe(true);
    expect(Boolean.xor({ a: false, b: false })).toBe(false);
  });
});

// ============================================================================
// IF Tests
// ============================================================================

describe('Boolean - If', () => {
  test('type-level: if true then "yes" else "no" = "yes"', () => {
    type Result = HKTF.Apply<Boolean.If, { condition: true; then: "yes"; else: "no" }>;
    assertType<AssertEqual<Result, "yes">>();
  });

  test('type-level: if false then "yes" else "no" = "no"', () => {
    type Result = HKTF.Apply<Boolean.If, { condition: false; then: "yes"; else: "no" }>;
    assertType<AssertEqual<Result, "no">>();
  });

  test('type-level: if true then 1 else 2 = 1', () => {
    type Result = HKTF.Apply<Boolean.If, { condition: true; then: 1; else: 2 }>;
    assertType<AssertEqual<Result, 1>>();
  });

  test('type-level: if false then 1 else 2 = 2', () => {
    type Result = HKTF.Apply<Boolean.If, { condition: false; then: 1; else: 2 }>;
    assertType<AssertEqual<Result, 2>>();
  });

  test('runtime: if with separate arguments', () => {
    expect(Boolean.ifThenElse(true, "yes", "no")).toBe("yes");
    expect(Boolean.ifThenElse(false, "yes", "no")).toBe("no");
    expect(Boolean.ifThenElse(true, 42, 0)).toBe(42);
    expect(Boolean.ifThenElse(false, 42, 0)).toBe(0);
  });

  test('runtime: if with object argument', () => {
    expect(Boolean.ifThenElse({ condition: true, then: "yes", else: "no" })).toBe("yes");
    expect(Boolean.ifThenElse({ condition: false, then: "yes", else: "no" })).toBe("no");
    expect(Boolean.ifThenElse({ condition: true, then: 42, else: 0 })).toBe(42);
    expect(Boolean.ifThenElse({ condition: false, then: 42, else: 0 })).toBe(0);
  });

  test('runtime: if with complex values', () => {
    const obj1 = { value: 1 };
    const obj2 = { value: 2 };
    expect(Boolean.ifThenElse(true, obj1, obj2)).toBe(obj1);
    expect(Boolean.ifThenElse(false, obj1, obj2)).toBe(obj2);
  });
});

// ============================================================================
// Complex Expression Tests
// ============================================================================

describe('Boolean - Complex Expressions', () => {
  test('type-level: chained operations', () => {
    // (true AND false) OR true = true
    type Step1 = HKTF.Apply<Boolean.And, { a: true; b: false }>;
    type Step2 = HKTF.Apply<Boolean.Or, { a: Step1; b: true }>;
    assertType<AssertEqual<Step2, true>>();

    // NOT (true OR false) = false
    type Step3 = HKTF.Apply<Boolean.Or, { a: true; b: false }>;
    type Step4 = HKTF.Apply<Boolean.Not, { value: Step3 }>;
    assertType<AssertEqual<Step4, false>>();

    // (true XOR false) AND true = true
    type Step5 = HKTF.Apply<Boolean.Xor, { a: true; b: false }>;
    type Step6 = HKTF.Apply<Boolean.And, { a: Step5; b: true }>;
    assertType<AssertEqual<Step6, true>>();
  });

  test('runtime: chained operations', () => {
    // (true AND false) OR true = true
    const step1 = Boolean.and(true, false);
    const step2 = Boolean.or(step1, true);
    expect(step2).toBe(true);

    // NOT (true OR false) = false
    const step3 = Boolean.or(true, false);
    const step4 = Boolean.not(step3);
    expect(step4).toBe(false);

    // (true XOR false) AND true = true
    const step5 = Boolean.xor(true, false);
    const step6 = Boolean.and(step5, true);
    expect(step6).toBe(true);
  });

  test('type-level: conditional with boolean operations', () => {
    // if (true AND false) then "yes" else "no" = "no"
    type Condition = HKTF.Apply<Boolean.And, { a: true; b: false }>;
    type Result = HKTF.Apply<Boolean.If, { condition: Condition; then: "yes"; else: "no" }>;
    assertType<AssertEqual<Result, "no">>();
  });

  test('runtime: conditional with boolean operations', () => {
    // if (true AND false) then "yes" else "no" = "no"
    const condition = Boolean.and(true, false);
    const result = Boolean.ifThenElse(condition, "yes", "no");
    expect(result).toBe("no");

    // if (true OR false) then 42 else 0 = 42
    const condition2 = Boolean.or(true, false);
    const result2 = Boolean.ifThenElse(condition2, 42, 0);
    expect(result2).toBe(42);
  });
});

// ============================================================================
// ANY Tests
// ============================================================================

describe('Boolean - Any', () => {
  test('type-level: any of [true, false] = true', () => {
    type Result = HKTF.Apply<Boolean.Any, { values: [true, false] }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: any of [false, false] = false', () => {
    type Result = HKTF.Apply<Boolean.Any, { values: [false, false] }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: any of [true, true] = true', () => {
    type Result = HKTF.Apply<Boolean.Any, { values: [true, true] }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: any of [] = false (empty array)', () => {
    type Result = HKTF.Apply<Boolean.Any, { values: [] }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('runtime: any with direct argument', () => {
    expect(Boolean.any([true, false])).toBe(true);
    expect(Boolean.any([false, false])).toBe(false);
    expect(Boolean.any([true, true])).toBe(true);
    expect(Boolean.any([false, true, false])).toBe(true);
    expect(Boolean.any([])).toBe(false);
  });

  test('runtime: any with object argument', () => {
    expect(Boolean.any({ values: [true, false] })).toBe(true);
    expect(Boolean.any({ values: [false, false] })).toBe(false);
    expect(Boolean.any({ values: [true, true] })).toBe(true);
    expect(Boolean.any({ values: [] })).toBe(false);
  });
});

// ============================================================================
// ALL Tests
// ============================================================================

describe('Boolean - All', () => {
  test('type-level: all of [true, true] = true', () => {
    type Result = HKTF.Apply<Boolean.All, { values: [true, true] }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('type-level: all of [true, false] = false', () => {
    type Result = HKTF.Apply<Boolean.All, { values: [true, false] }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: all of [false, false] = false', () => {
    type Result = HKTF.Apply<Boolean.All, { values: [false, false] }>;
    assertType<AssertEqual<Result, false>>();
  });

  test('type-level: all of [] = true (empty array)', () => {
    type Result = HKTF.Apply<Boolean.All, { values: [] }>;
    assertType<AssertEqual<Result, true>>();
  });

  test('runtime: all with direct argument', () => {
    expect(Boolean.all([true, true])).toBe(true);
    expect(Boolean.all([true, false])).toBe(false);
    expect(Boolean.all([false, false])).toBe(false);
    expect(Boolean.all([true, true, true])).toBe(true);
    expect(Boolean.all([true, true, false])).toBe(false);
    expect(Boolean.all([])).toBe(true);
  });

  test('runtime: all with object argument', () => {
    expect(Boolean.all({ values: [true, true] })).toBe(true);
    expect(Boolean.all({ values: [true, false] })).toBe(false);
    expect(Boolean.all({ values: [false, false] })).toBe(false);
    expect(Boolean.all({ values: [] })).toBe(true);
  });
});

// ============================================================================
// De Morgan's Laws Tests
// ============================================================================

describe('Boolean - De Morgan\'s Laws', () => {
  test('type-level: NOT (A AND B) = (NOT A) OR (NOT B)', () => {
    // NOT (true AND false) = true
    type AndResult = HKTF.Apply<Boolean.And, { a: true; b: false }>;
    type NotAnd = HKTF.Apply<Boolean.Not, { value: AndResult }>;
    assertType<AssertEqual<NotAnd, true>>();

    // (NOT true) OR (NOT false) = true
    type NotA = HKTF.Apply<Boolean.Not, { value: true }>;
    type NotB = HKTF.Apply<Boolean.Not, { value: false }>;
    type OrNotANotB = HKTF.Apply<Boolean.Or, { a: NotA; b: NotB }>;
    assertType<AssertEqual<OrNotANotB, true>>();

    // They should be equal
    assertType<AssertEqual<NotAnd, OrNotANotB>>();
  });

  test('type-level: NOT (A OR B) = (NOT A) AND (NOT B)', () => {
    // NOT (true OR false) = false
    type OrResult = HKTF.Apply<Boolean.Or, { a: true; b: false }>;
    type NotOr = HKTF.Apply<Boolean.Not, { value: OrResult }>;
    assertType<AssertEqual<NotOr, false>>();

    // (NOT true) AND (NOT false) = false
    type NotA = HKTF.Apply<Boolean.Not, { value: true }>;
    type NotB = HKTF.Apply<Boolean.Not, { value: false }>;
    type AndNotANotB = HKTF.Apply<Boolean.And, { a: NotA; b: NotB }>;
    assertType<AssertEqual<AndNotANotB, false>>();

    // They should be equal
    assertType<AssertEqual<NotOr, AndNotANotB>>();
  });

  test('runtime: De Morgan\'s laws verification', () => {
    // NOT (A AND B) = (NOT A) OR (NOT B)
    const a1 = true, b1 = false;
    const notAnd = Boolean.not(Boolean.and(a1, b1));
    const orNotANotB = Boolean.or(Boolean.not(a1), Boolean.not(b1));
    expect(notAnd).toBe(orNotANotB);

    // NOT (A OR B) = (NOT A) AND (NOT B)
    const a2 = true, b2 = false;
    const notOr = Boolean.not(Boolean.or(a2, b2));
    const andNotANotB = Boolean.and(Boolean.not(a2), Boolean.not(b2));
    expect(notOr).toBe(andNotANotB);
  });
});
