import { HKTF } from '@servicejs/hkt-core';

/**
 * Identity HKTF - returns input unchanged
 *
 * Useful as a base case for compositions.
 */

export interface IdentityArgs {
  input: unknown;
}

export type IdentityResult<T extends IdentityArgs> = T['input'];

export interface Identity extends HKTF.Base {
  [HKTF.ArgsSymbol]: IdentityArgs;
  [HKTF.ResultSymbol]: IdentityResult<HKTF.Args<this>>;
}
