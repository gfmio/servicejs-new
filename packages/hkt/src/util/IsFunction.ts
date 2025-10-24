import * as HKTF from '../hktf.js';

export interface IsFunctionArgs {
  type: unknown;
}

export interface IsFunctionResult<T extends IsFunctionArgs> {
  result: T['type'] extends (...args: any[]) => any ? true : false;
}

/**
 * IsFunction - checks if type is a function
 */
export interface IsFunction extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsFunctionArgs;
  [HKTF.ResultSymbol]: IsFunctionResult<HKTF.Args<this>>;
}
