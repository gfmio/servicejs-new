import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

/**
 * FilterMethods HKTF - filters methods by predicate on message type
 *
 * Creates a new HKTO with only methods whose messages match the predicate.
 *
 * @example
 * ```typescript
 * // Keep only 'get' type messages
 * type ReadOnly = HKTF.Apply<
 *   FilterMethods,
 *   { hkto: CounterHKTO; predicate: IsGetMessage }
 * >;
 * ```
 */

export interface FilterMethodsArgs {
  hkto: HKTO.Base;
  predicate: FunctionHKTF.Predicate<unknown>;
}

export type FilterMethodsResult<T extends FilterMethodsArgs> = HKTO.Combine<
    FilterMethodsByPredicate<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['predicate']
    >
  >;

export interface FilterMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: FilterMethodsArgs;
  [HKTF.ResultSymbol]: FilterMethodsResult<HKTF.Args<this>>;
}


/**
 * Helper: Filter methods by predicate
 */
type FilterMethodsByPredicate<
  Methods extends readonly Method.Base[],
  Pred extends FunctionHKTF.Predicate<unknown>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Pred extends FunctionHKTF.Predicate<Method.MessageOf<M>>
        ? readonly [M, ...FilterMethodsByPredicate<Rest, Pred>]
        : FilterMethodsByPredicate<Rest, Pred>
      : readonly []
    : readonly []
  : readonly [];
