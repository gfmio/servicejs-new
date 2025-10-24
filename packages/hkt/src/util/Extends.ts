import * as HKTF from '../hktf.js';

export interface ExtendsArgs {
  type1: unknown;
  type2: unknown;
}

export interface ExtendsResult<T extends ExtendsArgs> {
  result: T['type1'] extends T['type2'] ? true : false;
}

/**
 * Extends - checks if type1 extends type2
 */
export interface Extends extends HKTF.Base {
  [HKTF.ArgsSymbol]: ExtendsArgs;
  [HKTF.ResultSymbol]: ExtendsResult<HKTF.Args<this>>;
}