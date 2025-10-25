/**
 * Function HKTFs
 *
 * All functions must be represented as HKTFs, not raw function types.
 * This maintains type-level purity.
 */

import * as HKTF from './hktf.js';

/**
 * Unary function HKTF
 */
export interface Fn1<I = unknown, O = unknown> extends HKTF.Base {
  [HKTF.ArgsSymbol]: { input: I };
  [HKTF.ResultSymbol]: O;
}

/**
 * Binary function HKTF
 */
export interface Fn2<I1 = unknown, I2 = unknown, O = unknown> extends HKTF.Base {
  [HKTF.ArgsSymbol]: { first: I1; second: I2 };
  [HKTF.ResultSymbol]: O;
}

/**
 * Predicate HKTF - function that returns boolean
 */
export interface Predicate<T = unknown> extends Fn1<T, boolean> {}

/**
 * Reducer HKTF - accumulator function
 */
export interface Reducer<Acc = unknown, Val = unknown> extends HKTF.Base {
  [HKTF.ArgsSymbol]: { accumulator: Acc; value: Val };
  [HKTF.ResultSymbol]: Acc;
}
