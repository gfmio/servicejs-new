/**
 * Function Composition Utilities
 *
 * Pure function composition helpers.
 */

import type { UnaryFn } from './types.js';

/**
 * Pipe - compose functions left-to-right
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const fn = pipe(addOne, double);
 * fn(5); // 12
 * ```
 */
export function pipe<A, B>(fn1: UnaryFn<A, B>): UnaryFn<A, B>;
export function pipe<A, B, C>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>
): UnaryFn<A, C>;
export function pipe<A, B, C, D>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>
): UnaryFn<A, D>;
export function pipe<A, B, C, D, E>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>
): UnaryFn<A, E>;
export function pipe<A, B, C, D, E, F>(
  fn1: UnaryFn<A, B>,
  fn2: UnaryFn<B, C>,
  fn3: UnaryFn<C, D>,
  fn4: UnaryFn<D, E>,
  fn5: UnaryFn<E, F>
): UnaryFn<A, F>;
export function pipe(...fns: readonly UnaryFn<any, any>[]): UnaryFn<any, any> {
  return (value: any) => fns.reduce((acc, fn) => fn(acc), value);
}

/**
 * Compose - compose functions right-to-left
 *
 * @example
 * ```typescript
 * const addOne = (x: number) => x + 1;
 * const double = (x: number) => x * 2;
 * const fn = compose(double, addOne);
 * fn(5); // 12
 * ```
 */
export function compose<A, B>(fn1: UnaryFn<A, B>): UnaryFn<A, B>;
export function compose<A, B, C>(
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, C>;
export function compose<A, B, C, D>(
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, D>;
export function compose<A, B, C, D, E>(
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, E>;
export function compose<A, B, C, D, E, F>(
  fn5: UnaryFn<E, F>,
  fn4: UnaryFn<D, E>,
  fn3: UnaryFn<C, D>,
  fn2: UnaryFn<B, C>,
  fn1: UnaryFn<A, B>
): UnaryFn<A, F>;
export function compose(...fns: readonly UnaryFn<any, any>[]): UnaryFn<any, any> {
  return (value: any) => fns.reduceRight((acc, fn) => fn(acc), value);
}
