import { HKTF } from '@servicejs/hkt-core';

/**
 * Sequence HKTF - converts array of HKTFs into HKTF of array
 *
 * Takes an array of HKTFs and an array of inputs, applies each HKTF to its
 * corresponding input, and collects results.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Sequence,
 *   {
 *     functions: readonly [ToUpper, ParseInt, Reverse];
 *     inputs: readonly ['hello', '42', 'world']
 *   }
 * >;
 * // Result: readonly ['HELLO', 42, 'dlrow']
 * ```
 */

export interface SequenceArgs {
  functions: readonly HKTF.Base[];
  inputs: readonly unknown[];
}

export type SequenceResult<T extends SequenceArgs> = SequenceApply<T['functions'], T['inputs']>;

export interface Sequence extends HKTF.Base {
  [HKTF.ArgsSymbol]: SequenceArgs;
  [HKTF.ResultSymbol]: SequenceResult<HKTF.Args<this>>;
}

/**
 * Helper: Apply each function to corresponding input
 */
type SequenceApply<
  Fns extends readonly HKTF.Base[],
  Inputs extends readonly unknown[]
> = Fns extends readonly []
  ? readonly []
  : Inputs extends readonly []
  ? readonly []
  : Fns extends readonly [infer F, ...infer RestFns]
  ? Inputs extends readonly [infer I, ...infer RestInputs]
    ? F extends HKTF.Base
      ? RestFns extends readonly HKTF.Base[]
        ? RestInputs extends readonly unknown[]
          ? readonly [
              HKTF.Apply<F, { input: I }>,
              ...SequenceApply<RestFns, RestInputs>
            ]
          : readonly [HKTF.Apply<F, { input: I }>]
        : readonly [HKTF.Apply<F, { input: I }>]
      : readonly []
    : readonly []
  : readonly [];
