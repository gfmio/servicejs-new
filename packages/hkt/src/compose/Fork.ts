import * as HKTF from '../hktf.js';
import * as FunctionHKTF from '../function.js';

/**
 * Fork HKTF - applies multiple HKTFs to same input and combines results with a join function
 *
 * Similar to Zip but allows custom combination of results.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Fork,
 *   {
 *     functions: readonly [GetFirst, GetLast];
 *     input: ['a', 'b', 'c'];
 *     join: ConcatHKTF
 *   }
 * >;
 * // Result: 'ac' (conceptually: concat first and last)
 * ```
 */

export interface ForkArgs {
  functions: readonly HKTF.Base[];
  input: unknown;
  join: FunctionHKTF.Fn1<readonly unknown[], unknown>;
}

export interface ForkResult<T extends ForkArgs> {
  result: HKTF.Apply<
    T['join'],
    { input: ForkApply<T['functions'], T['input']> }
  >;
}

export interface Fork extends HKTF.Base {
  [HKTF.ArgsSymbol]: ForkArgs;
  [HKTF.ResultSymbol]: ForkResult<HKTF.Args<this>>;
}

/**
 * Helper: Apply each function to input and collect results
 */
type ForkApply<
  Fns extends readonly HKTF.Base[],
  Input
> = Fns extends readonly []
  ? readonly []
  : Fns extends readonly [infer Head, ...infer Tail]
  ? Head extends HKTF.Base
    ? Tail extends readonly HKTF.Base[]
      ? readonly [
          HKTF.Apply<Head, { input: Input }>,
          ...ForkApply<Tail, Input>
        ]
      : readonly [HKTF.Apply<Head, { input: Input }>]
    : readonly []
  : readonly [];
