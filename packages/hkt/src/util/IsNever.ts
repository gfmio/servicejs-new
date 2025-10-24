import * as HKTF from '../hktf.js';

export interface IsNeverArgs {
  type: unknown;
}

export interface IsNeverResult<T extends IsNeverArgs> {
  result: [T['type']] extends [never] ? true : false;
}

/**
 * IsNever - checks if type is never
 */
export interface IsNever extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsNeverArgs;
  [HKTF.ResultSymbol]: IsNeverResult<HKTF.Args<this>>;
}
