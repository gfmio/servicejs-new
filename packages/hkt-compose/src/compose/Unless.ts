import { HKTF, FunctionHKTF } from '@servicejs/hkt-core';

/**
 * Unless HKTF - conditionally applies HKTF when predicate is false
 *
 * Opposite of When. If predicate returns false, applies fn to input.
 * Otherwise returns input unchanged.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Unless,
 *   {
 *     predicate: IsEmpty;
 *     fn: ProcessString;
 *     input: 'hello'
 *   }
 * >;
 * // Result: processed 'hello' (if not empty) or 'hello' (if empty)
 * ```
 */

export interface UnlessArgs {
  predicate: FunctionHKTF.Predicate<unknown>;
  fn: HKTF.Base;
  input: unknown;
}

export type UnlessResult<T extends UnlessArgs> = HKTF.Apply<T['predicate'], { input: T['input'] }> extends false
    ? HKTF.Apply<T['fn'], { input: T['input'] }>
    : T['input'];

export interface Unless extends HKTF.Base {
  [HKTF.ArgsSymbol]: UnlessArgs;
  [HKTF.ResultSymbol]: UnlessResult<HKTF.Args<this>>;
}
