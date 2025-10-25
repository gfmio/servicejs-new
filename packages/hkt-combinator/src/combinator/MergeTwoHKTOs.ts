import { HKTF, HKTO } from '@servicejs/hkt-core';

/**
 * MergeTwoHKTOs HKTF - merges two HKTOs into one
 *
 * @example
 * ```typescript
 * type Combined = HKTF.Apply<
 *   MergeTwoHKTOs,
 *   { hkto1: CounterHKTO; hkto2: TimerHKTO }
 * >;
 * ```
 */

export interface MergeTwoHKTOsArgs {
  hkto1: HKTO.Base;
  hkto2: HKTO.Base;
}

export type MergeTwoHKTOsResult<T extends MergeTwoHKTOsArgs> = HKTO.Combine<
    readonly [
      ...T['hkto1'][typeof HKTO.MethodsSymbol],
      ...T['hkto2'][typeof HKTO.MethodsSymbol]
    ]
  >;

export interface MergeTwoHKTOs extends HKTF.Base {
  [HKTF.ArgsSymbol]: MergeTwoHKTOsArgs;
  [HKTF.ResultSymbol]: MergeTwoHKTOsResult<HKTF.Args<this>>;
}
