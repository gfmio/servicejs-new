import { HKTF, HKTO } from '@servicejs/hkt-core';

/**
 * Compose HKTOs - compose two HKTOs where output of first feeds to second
 *
 * This is more conceptual as HKTOs typically have specific state types.
 */

export interface ComposeHKTOsArgs {
  first: HKTO.Base;
  second: HKTO.Base;
}

export type ComposeHKTOsResult<T extends ComposeHKTOsArgs> = HKTO.Combine<
    readonly [
      ...T['first'][typeof HKTO.MethodsSymbol],
      ...T['second'][typeof HKTO.MethodsSymbol]
    ]
  >;

export interface ComposeHKTOs extends HKTF.Base {
  [HKTF.ArgsSymbol]: ComposeHKTOsArgs;
  [HKTF.ResultSymbol]: ComposeHKTOsResult<HKTF.Args<this>>;
}
