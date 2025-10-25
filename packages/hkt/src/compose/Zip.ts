import * as HKTF from '../hktf.js';

/**
 * Zip HKTF - applies multiple HKTFs to the same input and combines results
 *
 * Takes an array of HKTFs, applies each to the input, and returns an array of results.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Zip,
 *   { functions: readonly [ToUpper, Length, Reverse]; input: 'hello' }
 * >;
 * // Result: readonly ['HELLO', 5, 'olleh']
 * ```
 */

export interface ZipArgs {
  functions: readonly HKTF.Base[];
  input: unknown;
}

export interface ZipResult<T extends ZipArgs> {
  result: ZipApply<T['functions'], T['input']>;
}

export interface Zip extends HKTF.Base {
  [HKTF.ArgsSymbol]: ZipArgs;
  [HKTF.ResultSymbol]: ZipResult<HKTF.Args<this>>;
}

/**
 * Helper: Apply each function to input and collect results
 */
type ZipApply<
  Fns extends readonly HKTF.Base[],
  Input
> = Fns extends readonly []
  ? readonly []
  : Fns extends readonly [infer Head, ...infer Tail]
  ? Head extends HKTF.Base
    ? Tail extends readonly HKTF.Base[]
      ? readonly [
          HKTF.Apply<Head, { input: Input }>,
          ...ZipApply<Tail, Input>
        ]
      : readonly [HKTF.Apply<Head, { input: Input }>]
    : readonly []
  : readonly [];
