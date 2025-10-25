import * as FunctionHKTF from '../function.js';
import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * PartitionMethods HKTF - splits HKTO into two based on predicate
 *
 * Returns a tuple of two HKTOs: [matched, notMatched]
 * where matched contains methods satisfying the predicate
 * and notMatched contains the rest.
 *
 * @example
 * ```typescript
 * type [Queries, Mutations] = HKTF.Apply<
 *   PartitionMethods,
 *   { hkto: CrudHKTO; predicate: IsQueryMessage }
 * >;
 * ```
 */

export interface PartitionMethodsArgs {
  hkto: HKTO.Base;
  predicate: FunctionHKTF.Predicate<unknown>;
}

export interface PartitionMethodsResult<T extends PartitionMethodsArgs> {
  result: readonly [
    HKTO.Combine<PartitionMatched<T['hkto'][typeof HKTO.MethodsSymbol], T['predicate']>>,
    HKTO.Combine<PartitionNotMatched<T['hkto'][typeof HKTO.MethodsSymbol], T['predicate']>>
  ];
}

export interface PartitionMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: PartitionMethodsArgs;
  [HKTF.ResultSymbol]: PartitionMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Get methods that match predicate
 */
type PartitionMatched<
  Methods extends readonly Method.Base[],
  Pred extends FunctionHKTF.Predicate<unknown>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Pred extends FunctionHKTF.Predicate<Method.MessageOf<M>>
        ? readonly [M, ...PartitionMatched<Rest, Pred>]
        : PartitionMatched<Rest, Pred>
      : readonly []
    : readonly []
  : readonly [];

/**
 * Helper: Get methods that don't match predicate
 */
type PartitionNotMatched<
  Methods extends readonly Method.Base[],
  Pred extends FunctionHKTF.Predicate<unknown>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Pred extends FunctionHKTF.Predicate<Method.MessageOf<M>>
        ? PartitionNotMatched<Rest, Pred>
        : readonly [M, ...PartitionNotMatched<Rest, Pred>]
      : readonly []
    : readonly []
  : readonly [];
