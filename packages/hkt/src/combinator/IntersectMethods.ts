import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * IntersectMethods HKTF - keeps only methods common to both HKTOs
 *
 * Returns methods that appear in both HKTOs (by message type).
 *
 * @example
 * ```typescript
 * type Common = HKTF.Apply<
 *   IntersectMethods,
 *   { hkto1: CounterHKTO; hkto2: ExtendedCounterHKTO }
 * >;
 * ```
 */

export interface IntersectMethodsArgs {
  hkto1: HKTO.Base;
  hkto2: HKTO.Base;
}

export interface IntersectMethodsResult<T extends IntersectMethodsArgs> {
  result: HKTO.Combine<
    IntersectByType<
      T['hkto1'][typeof HKTO.MethodsSymbol],
      T['hkto2'][typeof HKTO.MethodsSymbol]
    >
  >;
}

export interface IntersectMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: IntersectMethodsArgs;
  [HKTF.ResultSymbol]: IntersectMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Get method types from Methods
 */
type MethodTypes<Methods extends readonly Method.Base[]> =
  Methods extends readonly []
    ? never
    : Methods extends readonly [infer M, ...infer Rest]
    ? M extends Method.Base
      ? Rest extends readonly Method.Base[]
        ? (Method.MessageOf<M> extends { type: infer T } ? T : never) | MethodTypes<Rest>
        : Method.MessageOf<M> extends { type: infer T } ? T : never
      : never
    : never;

/**
 * Helper: Keep methods whose types appear in both lists
 */
type IntersectByType<
  Methods1 extends readonly Method.Base[],
  Methods2 extends readonly Method.Base[]
> = Methods1 extends readonly []
  ? readonly []
  : Methods1 extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Method.MessageOf<M> extends { type: infer T }
        ? T extends MethodTypes<Methods2>
          ? readonly [M, ...IntersectByType<Rest, Methods2>]
          : IntersectByType<Rest, Methods2>
        : IntersectByType<Rest, Methods2>
      : readonly []
    : readonly []
  : readonly [];
