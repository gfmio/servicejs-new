import * as HKTF from '../hktf.js';

export interface IsObjectArgs {
  type: unknown;
}

export type IsObjectResult<T extends IsObjectArgs> = T['type'] extends object
    ? T['type'] extends readonly unknown[]
      ? false
      : T['type'] extends (...args: any[]) => any
      ? false
      : true
    : false;

/**
 * IsObject - checks if type is an object (not array, function, etc.)
 */
export interface IsObject extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsObjectArgs;
  [HKTF.ResultSymbol]: IsObjectResult<HKTF.Args<this>>;
}
