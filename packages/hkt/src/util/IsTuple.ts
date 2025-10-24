import * as HKTF from '../hktf.js';

export interface IsTupleArgs {
  type: unknown;
}

export type IsTupleResult<T extends IsTupleArgs> = T['type'] extends readonly unknown[]
    ? number extends T['type']['length']
      ? false
      : true
    : false;

/**
 * IsTuple - checks if type is a tuple (fixed-length array)
 */
export interface IsTuple extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsTupleArgs;
  [HKTF.ResultSymbol]: IsTupleResult<HKTF.Args<this>>;
}
