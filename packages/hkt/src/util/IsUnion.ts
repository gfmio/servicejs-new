import * as HKTF from '../hktf.js';
import type { _UnionToIntersection } from "./UnionToIntersection.js";

export interface IsUnionArgs {
  type: unknown;
}

export interface IsUnionResult<T extends IsUnionArgs> {
  result: [T['type']] extends [_UnionToIntersection<T['type']>] ? false : true;
}

/**
 * IsUnion - checks if type is a union
 */
export interface IsUnion extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsUnionArgs;
  [HKTF.ResultSymbol]: IsUnionResult<HKTF.Args<this>>;
}

