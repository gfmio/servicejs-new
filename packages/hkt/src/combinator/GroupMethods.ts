import * as FunctionHKTF from '../function.js';
import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * GroupMethods HKTF - groups methods by some criteria
 *
 * Returns a record mapping group keys to HKTOs containing methods for that group.
 * The classifier function determines which group each method belongs to.
 *
 * @example
 * ```typescript
 * type Grouped = HKTF.Apply<
 *   GroupMethods,
 *   { hkto: CrudHKTO; classifier: ByAccessLevel }
 * >;
 * // Result: { read: ReadOnlyHKTO; write: WriteHKTO }
 * ```
 */

export interface GroupMethodsArgs {
  hkto: HKTO.Base;
  classifier: FunctionHKTF.Fn1<unknown, string>;
}

export interface GroupMethodsResult<T extends GroupMethodsArgs> {
  result: Record<string, HKTO.Base>;
}

export interface GroupMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: GroupMethodsArgs;
  [HKTF.ResultSymbol]: GroupMethodsResult<HKTF.Args<this>>;
}

// Note: Full type-level grouping is complex and would require
// runtime support to be practical. This provides the interface.
