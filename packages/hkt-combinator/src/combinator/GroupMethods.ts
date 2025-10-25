import { HKTF, HKTO, FunctionHKTF } from '@servicejs/hkt-core';

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

export type GroupMethodsResult<T extends GroupMethodsArgs> = Record<string, T['hkto']>;

export interface GroupMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: GroupMethodsArgs;
  [HKTF.ResultSymbol]: GroupMethodsResult<HKTF.Args<this>>;
}

// Note: Full type-level grouping is complex and would require
// runtime support to be practical. This provides the interface.
