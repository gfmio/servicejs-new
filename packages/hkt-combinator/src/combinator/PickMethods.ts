import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * PickMethods HKTF - selects specific methods by matching message types
 *
 * Creates a new HKTO with only methods whose message types are in the picks list.
 *
 * @example
 * ```typescript
 * type ReadOnly = HKTF.Apply<
 *   PickMethods,
 *   { hkto: CrudHKTO; picks: readonly ['get', 'list'] }
 * >;
 * ```
 */

export interface PickMethodsArgs {
  hkto: HKTO.Base;
  picks: readonly string[];
}

export type PickMethodsResult<T extends PickMethodsArgs> = HKTO.Combine<
    PickMethodsByType<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['picks']
    >
  >;

export interface PickMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: PickMethodsArgs;
  [HKTF.ResultSymbol]: PickMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Pick methods by message type
 */
type PickMethodsByType<
  Methods extends readonly Method.Base[],
  Picks extends readonly string[]
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Method.MessageOf<M> extends { type: infer T }
        ? T extends Picks[number]
          ? readonly [M, ...PickMethodsByType<Rest, Picks>]
          : PickMethodsByType<Rest, Picks>
        : PickMethodsByType<Rest, Picks>
      : readonly []
    : readonly []
  : readonly [];
