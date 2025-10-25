import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * OmitMethods HKTF - removes specific methods by matching message types
 *
 * Creates a new HKTO excluding methods whose message types are in the omits list.
 *
 * @example
 * ```typescript
 * type ReadOnly = HKTF.Apply<
 *   OmitMethods,
 *   { hkto: CrudHKTO; omits: readonly ['delete', 'update', 'create'] }
 * >;
 * ```
 */

export interface OmitMethodsArgs {
  hkto: HKTO.Base;
  omits: readonly string[];
}

export type OmitMethodsResult<T extends OmitMethodsArgs> = HKTO.Combine<
    OmitMethodsByType<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['omits']
    >
  >;

export interface OmitMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: OmitMethodsArgs;
  [HKTF.ResultSymbol]: OmitMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Omit methods by message type
 */
type OmitMethodsByType<
  Methods extends readonly Method.Base[],
  Omits extends readonly string[]
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Method.MessageOf<M> extends { type: infer T }
        ? T extends Omits[number]
          ? OmitMethodsByType<Rest, Omits>
          : readonly [M, ...OmitMethodsByType<Rest, Omits>]
        : readonly [M, ...OmitMethodsByType<Rest, Omits>]
      : readonly []
    : readonly []
  : readonly [];
