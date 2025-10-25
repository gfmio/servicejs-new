/**
 * Predicate Utilities
 *
 * Common predicates and predicate builders.
 */

import type { Predicate } from './types.js';

/**
 * Always true predicate
 */
export function alwaysTrue<T>(): Predicate<T> {
  return () => true;
}

/**
 * Always false predicate
 */
export function alwaysFalse<T>(): Predicate<T> {
  return () => false;
}

/**
 * Check if value is null or undefined
 */
export function isNullish<T>(value: T | null | undefined): value is null | undefined {
  return value == null;
}

/**
 * Check if value is not null or undefined
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Check if value is defined (not undefined)
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

/**
 * Check if value is undefined
 */
export function isUndefined<T>(value: T | undefined): value is undefined {
  return value === undefined;
}

/**
 * Check if value equals another value
 */
export function equals<T>(expected: T): Predicate<T> {
  return (value: T) => value === expected;
}

/**
 * Check if value is greater than another value
 */
export function greaterThan(min: number): Predicate<number> {
  return (value: number) => value > min;
}

/**
 * Check if value is greater than or equal to another value
 */
export function greaterThanOrEqual(min: number): Predicate<number> {
  return (value: number) => value >= min;
}

/**
 * Check if value is less than another value
 */
export function lessThan(max: number): Predicate<number> {
  return (value: number) => value < max;
}

/**
 * Check if value is less than or equal to another value
 */
export function lessThanOrEqual(max: number): Predicate<number> {
  return (value: number) => value <= max;
}

/**
 * Check if value is between two values (inclusive)
 */
export function between(min: number, max: number): Predicate<number> {
  return (value: number) => value >= min && value <= max;
}

/**
 * Check if string is empty
 */
export function isEmpty(value: string): boolean {
  return value.length === 0;
}

/**
 * Check if string is not empty
 */
export function isNotEmpty(value: string): boolean {
  return value.length > 0;
}

/**
 * Check if string matches regex
 */
export function matches(regex: RegExp): Predicate<string> {
  return (value: string) => regex.test(value);
}

/**
 * Check if string starts with prefix
 */
export function startsWith(prefix: string): Predicate<string> {
  return (value: string) => value.startsWith(prefix);
}

/**
 * Check if string ends with suffix
 */
export function endsWith(suffix: string): Predicate<string> {
  return (value: string) => value.endsWith(suffix);
}

/**
 * Check if string contains substring
 */
export function contains(substring: string): Predicate<string> {
  return (value: string) => value.includes(substring);
}

/**
 * Check if array is empty
 */
export function isEmptyArray<T>(value: readonly T[]): boolean {
  return value.length === 0;
}

/**
 * Check if array is not empty
 */
export function isNotEmptyArray<T>(value: readonly T[]): boolean {
  return value.length > 0;
}

/**
 * Check if array includes value
 */
export function includes<T>(item: T): Predicate<readonly T[]> {
  return (value: readonly T[]) => value.includes(item);
}

/**
 * Check if value is instance of class
 */
export function isInstanceOf<T>(constructor: new (...args: any[]) => T): Predicate<unknown> {
  return (value: unknown): value is T => value instanceof constructor;
}

/**
 * Check if value has property
 */
export function hasProperty<K extends PropertyKey>(
  key: K
): (value: unknown) => value is Record<K, unknown> {
  return (value: unknown): value is Record<K, unknown> => {
    return typeof value === 'object' && value !== null && key in value;
  };
}
