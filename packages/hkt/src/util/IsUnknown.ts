import * as HKTF from '../hktf.js';
import type { IsNeverResult } from "./IsNever";

export interface IsUnknownArgs {
  type: unknown;
}

export interface IsUnknownResult<T extends IsUnknownArgs> {
  result: IsNeverResult<{ type: T['type'] }>['result'] extends false
    ? unknown extends T['type']
      ? true
      : false
    : false;
}

/**
 * IsUnknown - checks if type is unknown
 */
export interface IsUnknown extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsUnknownArgs;
  [HKTF.ResultSymbol]: IsUnknownResult<HKTF.Args<this>>;
}
