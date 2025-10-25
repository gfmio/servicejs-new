import * as HKTF from '../hktf.js';

export interface IsArrayArgs {
  type: unknown;
}

export type IsArrayResult<T extends IsArrayArgs> = T['type'] extends readonly unknown[] ? true : false;

/**
 * IsArray - checks if type is an array (not necessarily a tuple)
 */
export interface IsArray extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsArrayArgs;
  [HKTF.ResultSymbol]: IsArrayResult<HKTF.Args<this>>;
}
