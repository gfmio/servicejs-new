import * as HKTF from '../hktf.js';

export interface IsTupleArgs {
  type: unknown;
}

export interface IsTupleResult<T extends IsTupleArgs> {
  result: T['type'] extends readonly unknown[]
    ? number extends T['type']['length']
      ? false
      : true
    : false;
}

/**
 * IsTuple - checks if type is a tuple (fixed-length array)
 */
export interface IsTuple extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsTupleArgs;
  [HKTF.ResultSymbol]: IsTupleResult<HKTF.Args<this>>;
}
