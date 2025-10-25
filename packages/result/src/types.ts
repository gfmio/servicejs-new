/**
 * Result Type Definitions
 *
 * HKT-based Result type for type-safe error handling.
 */

import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

/**
 * Ok state - contains a success value
 */
export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

/**
 * Err state - contains an error value
 */
export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

/**
 * Result type - either Ok or Err
 */
export type Result<T, E> = Ok<T> | Err<E>;

// ============================================================================
// Ok Methods
// ============================================================================

/**
 * Ok Map method - transforms the Ok value
 */
export interface OkMap<T, E> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<T, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? OkHKTO<R, E>
    : never;
}

/**
 * Ok MapErr method - transforms the Err value (no-op for Ok)
 */
export interface OkMapErr<T, E> extends Method.Base<
  { type: 'mapErr'; fn: FunctionHKTF.Fn1<E, unknown> },
  OkHKTO<T, E>
> {}

/**
 * Ok AndThen method - chains Result-returning operations
 */
export interface OkAndThen<T, E> extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<T, ResultHKTO<unknown, E>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

/**
 * Ok OrElse method - recovers from Err (no-op for Ok)
 */
export interface OkOrElse<T, E> extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<E, ResultHKTO<T, unknown>> },
  OkHKTO<T, E>
> {}

/**
 * Ok Unwrap method - extracts value
 */
export interface OkUnwrap<T> extends Method.Base<
  { type: 'unwrap' },
  T
> {}

/**
 * Ok UnwrapOr method - extracts value
 */
export interface OkUnwrapOr<T> extends Method.Base<
  { type: 'unwrapOr'; defaultValue: T },
  T
> {}

/**
 * Ok UnwrapErr method - throws
 */
export interface OkUnwrapErr extends Method.Base<
  { type: 'unwrapErr' },
  never
> {}

/**
 * Ok IsOk method
 */
export interface OkIsOk extends Method.Base<
  { type: 'isOk' },
  true
> {}

/**
 * Ok IsErr method
 */
export interface OkIsErr extends Method.Base<
  { type: 'isErr' },
  false
> {}

/**
 * Ok Match method - pattern match on Result
 */
export interface OkMatch<T, E> extends Method.Base<
  {
    type: 'match';
    onOk: FunctionHKTF.Fn1<T, unknown>;
    onErr: FunctionHKTF.Fn1<E, unknown>;
  },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onOk'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

/**
 * Ok HKTO - value captured in type parameter
 */
export interface OkHKTO<T, E> extends HKTO.Combine<readonly [
  OkMap<T, E>,
  OkMapErr<T, E>,
  OkAndThen<T, E>,
  OkOrElse<T, E>,
  OkUnwrap<T>,
  OkUnwrapOr<T>,
  OkUnwrapErr,
  OkIsOk,
  OkIsErr,
  OkMatch<T, E>
]> {}

// ============================================================================
// Err Methods
// ============================================================================

/**
 * Err Map method - no-op for Err
 */
export interface ErrMap<E> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<never, unknown> },
  ErrHKTO<E>
> {}

/**
 * Err MapErr method - transforms the Err value
 */
export interface ErrMapErr<E> extends Method.Base<
  { type: 'mapErr'; fn: FunctionHKTF.Fn1<E, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<E, infer F>
    ? ErrHKTO<F>
    : never;
}

/**
 * Err AndThen method - no-op for Err
 */
export interface ErrAndThen<E> extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<never, ResultHKTO<unknown, E>> },
  ErrHKTO<E>
> {}

/**
 * Err OrElse method - recovers from Err
 */
export interface ErrOrElse<E> extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<E, ResultHKTO<unknown, unknown>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<E, infer R>
    ? R
    : never;
}

/**
 * Err Unwrap method - throws
 */
export interface ErrUnwrap extends Method.Base<
  { type: 'unwrap' },
  never
> {}

/**
 * Err UnwrapOr method - returns default
 */
export interface ErrUnwrapOr extends Method.Base<
  { type: 'unwrapOr'; defaultValue: unknown },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['defaultValue'];
}

/**
 * Err UnwrapErr method - extracts error
 */
export interface ErrUnwrapErr<E> extends Method.Base<
  { type: 'unwrapErr' },
  E
> {}

/**
 * Err IsOk method
 */
export interface ErrIsOk extends Method.Base<
  { type: 'isOk' },
  false
> {}

/**
 * Err IsErr method
 */
export interface ErrIsErr extends Method.Base<
  { type: 'isErr' },
  true
> {}

/**
 * Err Match method - pattern match on Result
 */
export interface ErrMatch<E> extends Method.Base<
  {
    type: 'match';
    onOk: FunctionHKTF.Fn1<never, unknown>;
    onErr: FunctionHKTF.Fn1<E, unknown>;
  },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onErr'] extends FunctionHKTF.Fn1<E, infer R>
    ? R
    : never;
}

/**
 * Err HKTO - error captured in type parameter
 */
export interface ErrHKTO<E> extends HKTO.Combine<readonly [
  ErrMap<E>,
  ErrMapErr<E>,
  ErrAndThen<E>,
  ErrOrElse<E>,
  ErrUnwrap,
  ErrUnwrapOr,
  ErrUnwrapErr<E>,
  ErrIsOk,
  ErrIsErr,
  ErrMatch<E>
]> {}

/**
 * Result HKTO - union of Ok and Err
 */
export type ResultHKTO<T, E> = OkHKTO<T, E> | ErrHKTO<E>;

/**
 * Constructors
 */
export interface OkConstructor extends HKTF.Base {
  [HKTF.ArgsSymbol]: { value: unknown };
  [HKTF.ResultSymbol]: OkHKTO<HKTF.Args<this>['value'], unknown>;
}

export interface ErrConstructor extends HKTF.Base {
  [HKTF.ArgsSymbol]: { error: unknown };
  [HKTF.ResultSymbol]: ErrHKTO<HKTF.Args<this>['error']>;
}

/**
 * Extract Ok type from Result
 */
export type OkType<R extends Result<any, any>> = R extends Ok<infer T> ? T : never;

/**
 * Extract Err type from Result
 */
export type ErrType<R extends Result<any, any>> = R extends Err<infer E> ? E : never;
