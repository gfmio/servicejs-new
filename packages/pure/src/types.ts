/**
 * Pure Function Type Definitions
 *
 * HKT-based pure function types and utilities.
 */

import { HKTF } from '@servicejs/hkt-core';

/**
 * Pure function - a function with no side effects
 */
export type PureFunction<Args extends readonly unknown[], Return> = (
  ...args: Args
) => Return;

/**
 * Unary function - single argument
 */
export type UnaryFn<A, B> = (a: A) => B;

/**
 * Binary function - two arguments
 */
export type BinaryFn<A, B, C> = (a: A, b: B) => C;

/**
 * Ternary function - three arguments
 */
export type TernaryFn<A, B, C, D> = (a: A, b: B, c: C) => D;

/**
 * Predicate - function that returns boolean
 */
export type Predicate<T> = (value: T) => boolean;

/**
 * Comparator - function for comparing two values
 */
export type Comparator<T> = (a: T, b: T) => number;

/**
 * Mapper - function that transforms a value
 */
export type Mapper<A, B> = (value: A) => B;

/**
 * Pipe HKTF - compose functions left-to-right
 */
export interface PipeHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: {
    fns: readonly UnaryFn<any, any>[];
  };
  [HKTF.ResultSymbol]: HKTF.Args<this>['fns'] extends readonly [
    UnaryFn<infer A, infer B>,
    ...infer Rest extends readonly UnaryFn<any, any>[]
  ]
    ? Rest extends readonly []
      ? UnaryFn<A, B>
      : Rest extends readonly [UnaryFn<any, infer C>]
      ? UnaryFn<A, C>
      : Rest extends readonly [UnaryFn<any, any>, UnaryFn<any, infer D>]
      ? UnaryFn<A, D>
      : Rest extends readonly [UnaryFn<any, any>, UnaryFn<any, any>, UnaryFn<any, infer E>]
      ? UnaryFn<A, E>
      : UnaryFn<A, any>
    : never;
}

/**
 * Compose HKTF - compose functions right-to-left
 */
export interface ComposeHKTF extends HKTF.Base {
  [HKTF.ArgsSymbol]: {
    fns: readonly UnaryFn<any, any>[];
  };
  [HKTF.ResultSymbol]: HKTF.Args<this>['fns'] extends readonly [...infer Init extends readonly UnaryFn<any, any>[], UnaryFn<infer A, infer B>]
    ? Init extends readonly []
      ? UnaryFn<A, B>
      : Init extends readonly [UnaryFn<infer C, any>]
      ? UnaryFn<C, B>
      : Init extends readonly [UnaryFn<infer D, any>, UnaryFn<any, any>]
      ? UnaryFn<D, B>
      : UnaryFn<any, B>
    : never;
}
