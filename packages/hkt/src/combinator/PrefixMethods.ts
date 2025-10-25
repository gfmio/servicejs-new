import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * PrefixMethods HKTF - adds prefix to all message types
 *
 * Creates a new HKTO where all method message types are prefixed.
 *
 * @example
 * ```typescript
 * type Prefixed = HKTF.Apply<
 *   PrefixMethods,
 *   { hkto: CounterHKTO; prefix: 'counter/' }
 * >;
 * // 'increment' becomes 'counter/increment'
 * ```
 */

export interface PrefixMethodsArgs {
  hkto: HKTO.Base;
  prefix: string;
}

export interface PrefixMethodsResult<T extends PrefixMethodsArgs> {
  result: HKTO.Combine<
    PrefixMethodTypes<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['prefix']
    >
  >;
}

export interface PrefixMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: PrefixMethodsArgs;
  [HKTF.ResultSymbol]: PrefixMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Prefix all method types
 */
type PrefixMethodTypes<
  Methods extends readonly Method.Base[],
  Prefix extends string
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? readonly [
          PrefixMethodType<M, Prefix>,
          ...PrefixMethodTypes<Rest, Prefix>
        ]
      : readonly [PrefixMethodType<M, Prefix>]
    : readonly []
  : readonly [];

/**
 * Helper: Prefix a single method's type
 */
type PrefixMethodType<
  M extends Method.Base,
  Prefix extends string
> = Method.MessageOf<M> extends { type: infer T }
  ? T extends string
    ? Method.Base & {
        [HKTF.ArgsSymbol]: Omit<Method.MessageOf<M>, 'type'> & { type: `${Prefix}${T}` };
        [HKTF.ResultSymbol]: HKTF.Result<M>;
      }
    : M
  : M;
