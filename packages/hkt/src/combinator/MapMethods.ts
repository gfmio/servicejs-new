import * as FunctionHKTF from '../function.js';
import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * MapMethods HKTF - transforms all method results through a function
 *
 * Creates a new HKTO where each method's result is transformed.
 * Note: This is conceptual as methods may return different types.
 *
 * @example
 * ```typescript
 * // Wrap all results in Some
 * type Wrapped = HKTF.Apply<
 *   MapMethods,
 *   { hkto: CounterHKTO; transformer: WrapInSome }
 * >;
 * ```
 */

export interface MapMethodsArgs {
  hkto: HKTO.Base;
  transformer: FunctionHKTF.Fn1<unknown, unknown>;
}

export interface MapMethodsResult<T extends MapMethodsArgs> {
  result: HKTO.Combine<
    TransformMethodResults<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['transformer']
    >
  >;
}

export interface MapMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: MapMethodsArgs;
  [HKTF.ResultSymbol]: MapMethodsResult<HKTF.Args<this>>;
}


/**
 * Helper: Transform each method's result type through a function
 */
type TransformMethodResults<
  Methods extends readonly Method.Base[],
  Fn extends FunctionHKTF.Fn1<unknown, unknown>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? readonly [
          TransformMethodResult<M, Fn>,
          ...TransformMethodResults<Rest, Fn>
        ]
      : readonly [TransformMethodResult<M, Fn>]
    : readonly []
  : readonly [];

/**
 * Helper: Transform a single method's result type
 */
interface TransformMethodResult<
  M extends Method.Base,
  Fn extends FunctionHKTF.Fn1<unknown, unknown>
> extends Method.Base {
  [HKTF.ArgsSymbol]: Method.MessageOf<M>;
  [HKTF.ResultSymbol]: Fn extends FunctionHKTF.Fn1<HKTF.Result<M>, infer R>
    ? R
    : never;
}
