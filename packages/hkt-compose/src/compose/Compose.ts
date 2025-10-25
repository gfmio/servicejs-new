import { HKTF } from '@servicejs/hkt-core';

/**
 * Compose HKTF - compose two HKTFs (apply f then g)
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Compose,
 *   { f: AddOneHKTF; g: DoubleHKTF; input: 5 }
 * >;
 * // Result: 12 (conceptually: (5 + 1) * 2)
 * ```
 */

export interface ComposeArgs {
  f: HKTF.Base;
  g: HKTF.Base;
  input: unknown;
}

export type ComposeResult<T extends ComposeArgs> = HKTF.Apply<
    T['g'],
    HKTF.Apply<T['f'], { input: T['input'] }>
  >;

export interface Compose extends HKTF.Base {
  [HKTF.ArgsSymbol]: ComposeArgs;
  [HKTF.ResultSymbol]: ComposeResult<HKTF.Args<this>>;
}
