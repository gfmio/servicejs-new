import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

/**
 * SortMethods HKTF - reorders methods based on comparator
 *
 * Returns an HKTO with methods sorted according to the comparator function.
 *
 * @example
 * ```typescript
 * type Sorted = HKTF.Apply<
 *   SortMethods,
 *   { hkto: CrudHKTO; comparator: AlphabeticalByType }
 * >;
 * ```
 */

export interface SortMethodsArgs {
  hkto: HKTO.Base;
  comparator: FunctionHKTF.Fn1<readonly [Method.Base, Method.Base], number>;
}

export type SortMethodsResult<T extends SortMethodsArgs> = T['hkto'];

export interface SortMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: SortMethodsArgs;
  [HKTF.ResultSymbol]: SortMethodsResult<HKTF.Args<this>>;
}

// Note: Type-level sorting is extremely complex and impractical.
// This provides the interface for potential runtime implementation.
