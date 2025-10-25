/**
 * Function Combinators
 *
 * Classic functional programming combinators.
 */

import type { UnaryFn, BinaryFn, Predicate } from './types.js';

/**
 * Identity - returns its argument unchanged
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Constant - returns a function that always returns the same value
 */
export function constant<T>(value: T): () => T {
  return () => value;
}

/**
 * Noop - does nothing
 */
export function noop(): void {
  // Intentionally empty
}

/**
 * Flip - flips the order of binary function arguments
 */
export function flip<A, B, C>(fn: BinaryFn<A, B, C>): BinaryFn<B, A, C> {
  return (b: B, a: A) => fn(a, b);
}

/**
 * Curry - converts a binary function to curried form
 */
export function curry<A, B, C>(fn: BinaryFn<A, B, C>): (a: A) => (b: B) => C {
  return (a: A) => (b: B) => fn(a, b);
}

/**
 * Uncurry - converts a curried function to binary form
 */
export function uncurry<A, B, C>(fn: (a: A) => (b: B) => C): BinaryFn<A, B, C> {
  return (a: A, b: B) => fn(a)(b);
}

/**
 * Partial - partially apply the first argument
 */
export function partial<A, B, C>(fn: BinaryFn<A, B, C>, a: A): UnaryFn<B, C> {
  return (b: B) => fn(a, b);
}

/**
 * PartialRight - partially apply the second argument
 */
export function partialRight<A, B, C>(fn: BinaryFn<A, B, C>, b: B): UnaryFn<A, C> {
  return (a: A) => fn(a, b);
}

/**
 * Not - negates a predicate
 */
export function not<T>(predicate: Predicate<T>): Predicate<T> {
  return (value: T) => !predicate(value);
}

/**
 * And - combines predicates with AND logic
 */
export function and<T>(...predicates: readonly Predicate<T>[]): Predicate<T> {
  return (value: T) => predicates.every(p => p(value));
}

/**
 * Or - combines predicates with OR logic
 */
export function or<T>(...predicates: readonly Predicate<T>[]): Predicate<T> {
  return (value: T) => predicates.some(p => p(value));
}

/**
 * Once - ensures a function is called at most once
 */
export function once<Args extends readonly unknown[], Return>(
  fn: (...args: Args) => Return
): (...args: Args) => Return {
  let called = false;
  let result: Return;
  return (...args: Args) => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  };
}

/**
 * Memoize - caches function results based on first argument
 */
export function memoize<A, B>(fn: UnaryFn<A, B>): UnaryFn<A, B> {
  const cache = new Map<A, B>();
  return (arg: A) => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}

/**
 * Tap - executes a side effect and returns the original value
 */
export function tap<T>(fn: (value: T) => void): UnaryFn<T, T> {
  return (value: T) => {
    fn(value);
    return value;
  };
}

/**
 * Apply - applies a function to a value
 */
export function apply<A, B>(fn: UnaryFn<A, B>, value: A): B {
  return fn(value);
}

/**
 * ApplyTo - creates a function that applies its argument to a value
 */
export function applyTo<A, B>(value: A): (fn: UnaryFn<A, B>) => B {
  return (fn: UnaryFn<A, B>) => fn(value);
}
