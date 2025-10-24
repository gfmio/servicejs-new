import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';

/**
 * Compose HKTOs - compose two HKTOs where output of first feeds to second
 *
 * This is more conceptual as HKTOs typically have specific state types.
 */

export interface ComposeHKTOsArgs {
  first: HKTO.Base;
  second: HKTO.Base;
}

export interface ComposeHKTOsResult<T extends ComposeHKTOsArgs> {
  result: HKTO.Combine<
    readonly [
      ...T['first'][typeof HKTO.MethodsSymbol],
      ...T['second'][typeof HKTO.MethodsSymbol]
    ]
  >;
}

export interface ComposeHKTOs extends HKTF.Base {
  [HKTF.ArgsSymbol]: ComposeHKTOsArgs;
  [HKTF.ResultSymbol]: ComposeHKTOsResult<HKTF.Args<this>>;
}
