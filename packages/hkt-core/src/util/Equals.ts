import * as HKTF from '../hktf.js';

export interface EqualsArgs {
  type1: unknown;
  type2: unknown;
}

export type EqualsResult<T extends EqualsArgs> = (<U>() => U extends T['type1'] ? 1 : 2) extends <
    U
  >() => U extends T['type2'] ? 1 : 2
    ? true
    : false;

/**
 * Equals - checks if two types are equal
 * Uses the technique from Matt Pocock's type challenges
 */
export interface Equals extends HKTF.Base {
  [HKTF.ArgsSymbol]: EqualsArgs;
  [HKTF.ResultSymbol]: EqualsResult<HKTF.Args<this>>;
}
