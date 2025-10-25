import * as HKTF from '../hktf.js';

/**
 * Parallel HKTF - conceptually parallel application of HKTFs
 *
 * Similar to Zip but with clearer intent for parallel/concurrent execution.
 * At the type level, this is identical to Zip, but semantically indicates
 * that functions could be executed in parallel at runtime.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Parallel,
 *   {
 *     functions: readonly [FetchUser, FetchPosts, FetchComments];
 *     input: userId
 *   }
 * >;
 * // Result: readonly [User, Post[], Comment[]]
 * ```
 */

export interface ParallelArgs {
  functions: readonly HKTF.Base[];
  input: unknown;
}

export interface ParallelResult<T extends ParallelArgs> {
  result: ParallelApply<T['functions'], T['input']>;
}

export interface Parallel extends HKTF.Base {
  [HKTF.ArgsSymbol]: ParallelArgs;
  [HKTF.ResultSymbol]: ParallelResult<HKTF.Args<this>>;
}

/**
 * Helper: Apply each function to input in parallel (conceptually)
 */
type ParallelApply<
  Fns extends readonly HKTF.Base[],
  Input
> = Fns extends readonly []
  ? readonly []
  : Fns extends readonly [infer Head, ...infer Tail]
  ? Head extends HKTF.Base
    ? Tail extends readonly HKTF.Base[]
      ? readonly [
          HKTF.Apply<Head, { input: Input }>,
          ...ParallelApply<Tail, Input>
        ]
      : readonly [HKTF.Apply<Head, { input: Input }>]
    : readonly []
  : readonly [];
