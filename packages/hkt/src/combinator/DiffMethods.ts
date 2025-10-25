import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * DiffMethods HKTF - gets methods in first HKTO but not in second
 *
 * Returns methods from hkto1 whose message types don't appear in hkto2.
 *
 * @example
 * ```typescript
 * type Unique = HKTF.Apply<
 *   DiffMethods,
 *   { hkto1: ExtendedCounterHKTO; hkto2: CounterHKTO }
 * >;
 * // Returns methods only in ExtendedCounterHKTO
 * ```
 */

export interface DiffMethodsArgs {
  hkto1: HKTO.Base;
  hkto2: HKTO.Base;
}

export interface DiffMethodsResult<T extends DiffMethodsArgs> {
  result: HKTO.Combine<
    DiffByType<
      T['hkto1'][typeof HKTO.MethodsSymbol],
      T['hkto2'][typeof HKTO.MethodsSymbol]
    >
  >;
}

export interface DiffMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: DiffMethodsArgs;
  [HKTF.ResultSymbol]: DiffMethodsResult<HKTF.Args<this>>;
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
 * Helper: Keep methods from Methods1 whose types don't appear in Methods2
 */
type DiffByType<
  Methods1 extends readonly Method.Base[],
  Methods2 extends readonly Method.Base[]
> = Methods1 extends readonly []
  ? readonly []
  : Methods1 extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Method.MessageOf<M> extends { type: infer T }
        ? T extends MethodTypes<Methods2>
          ? DiffByType<Rest, Methods2>
          : readonly [M, ...DiffByType<Rest, Methods2>]
        : readonly [M, ...DiffByType<Rest, Methods2>]
      : readonly []
    : readonly []
  : readonly [];
