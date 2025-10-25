import { HKTF } from '@servicejs/hkt-core';

/**
 * Flip HKTF - reverses the order of composition (g then f instead of f then g)
 *
 * Useful for changing composition direction without rewriting code.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Flip,
 *   { f: AddOneHKTF; g: DoubleHKTF; input: 5 }
 * >;
 * // Result: 11 (conceptually: (5 * 2) + 1, reversed from normal compose)
 * ```
 */

export interface FlipArgs {
  f: HKTF.Base;
  g: HKTF.Base;
  input: unknown;
}

export type FlipResult<T extends FlipArgs> = HKTF.Apply<
    T['f'],
    { input: HKTF.Apply<T['g'], { input: T['input'] }> }
  >;

export interface Flip extends HKTF.Base {
  [HKTF.ArgsSymbol]: FlipArgs;
  [HKTF.ResultSymbol]: FlipResult<HKTF.Args<this>>;
}
