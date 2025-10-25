import * as FunctionHKTF from '../function.js';
import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

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

export interface SortMethodsResult<T extends SortMethodsArgs> {
  result: HKTO.Base;
}

export interface SortMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: SortMethodsArgs;
  [HKTF.ResultSymbol]: SortMethodsResult<HKTF.Args<this>>;
}

// Note: Type-level sorting is extremely complex and impractical.
// This provides the interface for potential runtime implementation.
