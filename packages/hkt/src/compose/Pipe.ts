import * as HKTF from '../hktf.js';

/**
 * Pipe HKTF - pipe input through multiple HKTFs in sequence
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Pipe,
 *   { functions: readonly [AddOneHKTF, DoubleHKTF, AddOneHKTF]; input: 5 }
 * >;
 * // Result: 13 (conceptually: ((5 + 1) * 2) + 1)
 * ```
 */

export interface PipeArgs {
  functions: readonly HKTF.Base[];
  input: unknown;
}

export interface PipeResult<T extends PipeArgs> {
  result: T['functions'] extends readonly []
    ? T['input']
    : T['functions'] extends readonly [infer Head, ...infer Tail]
    ? Head extends HKTF.Base
      ? Tail extends readonly HKTF.Base[]
        ? PipeResult<{
            functions: Tail;
            input: HKTF.Apply<Head, { input: T['input'] }>;
          }>['result']
        : never
      : never
    : T['input'];
}

export interface Pipe extends HKTF.Base {
  [HKTF.ArgsSymbol]: PipeArgs;
  [HKTF.ResultSymbol]: PipeResult<HKTF.Args<this>>;
}
