import * as HKTF from '../hktf.js';
import type { IsNeverResult } from "./IsNever";

export interface IsUnknownArgs {
  type: unknown;
}

export type IsUnknownResult<T extends IsUnknownArgs> = IsNeverResult<{ type: T['type'] }> extends false
    ? unknown extends T['type']
      ? true
      : false
    : false;

/**
 * IsUnknown - checks if type is unknown
 */
export interface IsUnknown extends HKTF.Base {
  [HKTF.ArgsSymbol]: IsUnknownArgs;
  [HKTF.ResultSymbol]: IsUnknownResult<HKTF.Args<this>>;
}
