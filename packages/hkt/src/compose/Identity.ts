import * as HKTF from '../hktf.js';

/**
 * Identity HKTF - returns input unchanged
 *
 * Useful as a base case for compositions.
 */

export interface IdentityArgs {
  input: unknown;
}

export interface IdentityResult<T extends IdentityArgs> {
  result: T['input'];
}

export interface Identity extends HKTF.Base {
  [HKTF.ArgsSymbol]: IdentityArgs;
  [HKTF.ResultSymbol]: IdentityResult<HKTF.Args<this>>;
}
