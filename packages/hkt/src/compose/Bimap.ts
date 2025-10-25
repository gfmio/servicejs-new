import * as HKTF from '../hktf.js';

/**
 * Bimap HKTF - maps over both success and failure branches
 *
 * Useful for Result/Either types where you want to transform both Ok and Err cases.
 * Assumes input has a structure like { ok: T } | { err: E }.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Bimap,
 *   {
 *     successFn: ToString;
 *     failureFn: FormatError;
 *     input: { ok: 42 } | { err: 'not found' }
 *   }
 * >;
 * // Result: { ok: '42' } | { err: 'Error: not found' }
 * ```
 */

export interface BimapArgs {
  successFn: HKTF.Base;
  failureFn: HKTF.Base;
  input: unknown;
}

export interface BimapResult<T extends BimapArgs> {
  result: T['input'] extends { ok: infer V }
    ? { ok: HKTF.Apply<T['successFn'], { input: V }> }
    : T['input'] extends { err: infer E }
    ? { err: HKTF.Apply<T['failureFn'], { input: E }> }
    : never;
}

export interface Bimap extends HKTF.Base {
  [HKTF.ArgsSymbol]: BimapArgs;
  [HKTF.ResultSymbol]: BimapResult<HKTF.Args<this>>;
}
