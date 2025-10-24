import * as HKTF from '../hktf.js';

export interface IsAnyArgs {
  type: unknown;
}

export type IsAnyResult<T extends IsAnyArgs> = 0 extends 1 & T['type'] ? true : false;

/**
 * IsAny - checks if type is any
 */
export interface IsAny extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsAnyArgs;
  [HKTF.ResultSymbol]: IsAnyResult<HKTF.Args<this>>;
}
