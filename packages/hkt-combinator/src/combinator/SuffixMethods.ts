import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * SuffixMethods HKTF - adds suffix to all message types
 *
 * Creates a new HKTO where all method message types are suffixed.
 *
 * @example
 * ```typescript
 * type Suffixed = HKTF.Apply<
 *   SuffixMethods,
 *   { hkto: CounterHKTO; suffix: 'Request' }
 * >;
 * // 'increment' becomes 'incrementRequest'
 * ```
 */

export interface SuffixMethodsArgs {
  hkto: HKTO.Base;
  suffix: string;
}

export type SuffixMethodsResult<T extends SuffixMethodsArgs> = HKTO.Combine<
    SuffixMethodTypes<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['suffix']
    >
  >;

export interface SuffixMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: SuffixMethodsArgs;
  [HKTF.ResultSymbol]: SuffixMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Suffix all method types
 */
type SuffixMethodTypes<
  Methods extends readonly Method.Base[],
  Suffix extends string
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? readonly [
          SuffixMethodType<M, Suffix>,
          ...SuffixMethodTypes<Rest, Suffix>
        ]
      : readonly [SuffixMethodType<M, Suffix>]
    : readonly []
  : readonly [];

/**
 * Helper: Suffix a single method's type
 */
type SuffixMethodType<
  M extends Method.Base,
  Suffix extends string
> = Method.MessageOf<M> extends { type: infer T }
  ? T extends string
    ? Method.Base & {
        [HKTF.ArgsSymbol]: Omit<Method.MessageOf<M>, 'type'> & { type: `${T}${Suffix}` };
        [HKTF.ResultSymbol]: HKTF.Result<M>;
      }
    : M
  : M;
