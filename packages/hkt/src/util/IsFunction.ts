import * as HKTF from '../hktf.js';

export interface IsFunctionArgs {
  type: unknown;
}

export type IsFunctionResult<T extends IsFunctionArgs> = T['type'] extends (...args: any[]) => any ? true : false;

/**
 * IsFunction - checks if type is a function
 */
export interface IsFunction extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsFunctionArgs;
  [HKTF.ResultSymbol]: IsFunctionResult<HKTF.Args<this>>;
}
