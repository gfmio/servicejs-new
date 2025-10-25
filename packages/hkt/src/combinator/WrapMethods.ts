import * as FunctionHKTF from '../function.js';
import * as HKTF from '../hktf.js';
import * as HKTO from '../hkto.js';
import * as Method from '../method.js';

/**
 * WrapMethods HKTF - wraps all method results in a container
 *
 * Similar to MapMethods but specifically for wrapping results in containers
 * like Result, Option, Promise, etc.
 *
 * @example
 * ```typescript
 * type Safe = HKTF.Apply<
 *   WrapMethods,
 *   { hkto: CounterHKTO; wrapper: WrapInResult }
 * >;
 * // All methods now return Result<T, Error> instead of T
 * ```
 */

export interface WrapMethodsArgs {
  hkto: HKTO.Base;
  wrapper: FunctionHKTF.Fn1<unknown, unknown>;
}

export interface WrapMethodsResult<T extends WrapMethodsArgs> {
  result: HKTO.Combine<
    WrapMethodResults<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['wrapper']
    >
  >;
}

export interface WrapMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: WrapMethodsArgs;
  [HKTF.ResultSymbol]: WrapMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Wrap each method's result type
 */
type WrapMethodResults<
  Methods extends readonly Method.Base[],
  Wrapper extends FunctionHKTF.Fn1<unknown, unknown>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? readonly [
          WrapMethodResult<M, Wrapper>,
          ...WrapMethodResults<Rest, Wrapper>
        ]
      : readonly [WrapMethodResult<M, Wrapper>]
    : readonly []
  : readonly [];

/**
 * Helper: Wrap a single method's result type
 */
interface WrapMethodResult<
  M extends Method.Base,
  Wrapper extends FunctionHKTF.Fn1<unknown, unknown>
> extends Method.Base {
  [HKTF.ArgsSymbol]: Method.MessageOf<M>;
  [HKTF.ResultSymbol]: HKTF.Apply<Wrapper, { input: HKTF.Result<M> }>;
}
