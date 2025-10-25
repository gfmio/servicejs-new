/**
 * Option Type Definitions
 *
 * HKT-based Option type for null-safe programming.
 */

import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

/**
 * Some state - contains a value
 */
export interface Some<T> {
  readonly _tag: 'Some';
  readonly value: T;
}

/**
 * None state - represents absence of value
 */
export interface None {
  readonly _tag: 'None';
}

/**
 * Option type - either Some or None
 */
export type Option<T> = Some<T> | None;

// ============================================================================
// Some Methods
// ============================================================================

/**
 * Some Map method - transforms the value
 */
export interface SomeMap<T> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<T, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? SomeHKTO<R>
    : never;
}

/**
 * Some AndThen method - chains Option-returning operations
 */
export interface SomeAndThen<T> extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<T, OptionHKTO<unknown>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

/**
 * Some Filter method - keeps value only if predicate is true
 */
export interface SomeFilter<T> extends Method.Base<
  { type: 'filter'; predicate: FunctionHKTF.Predicate<T> },
  OptionHKTO<T>
> {}

/**
 * Some Or method - provides alternative Option if needed
 */
export interface SomeOr<T> extends Method.Base<
  { type: 'or'; alternative: OptionHKTO<T> },
  SomeHKTO<T>
> {}

/**
 * Some OrElse method - lazily provides alternative
 */
export interface SomeOrElse<T> extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<void, OptionHKTO<T>> },
  SomeHKTO<T>
> {}

/**
 * Some Unwrap method - extracts value
 */
export interface SomeUnwrap<T> extends Method.Base<
  { type: 'unwrap' },
  T
> {}

/**
 * Some UnwrapOr method - extracts value or returns default
 */
export interface SomeUnwrapOr<T> extends Method.Base<
  { type: 'unwrapOr'; defaultValue: T },
  T
> {}

/**
 * Some IsSome method
 */
export interface SomeIsSome extends Method.Base<
  { type: 'isSome' },
  true
> {}

/**
 * Some IsNone method
 */
export interface SomeIsNone extends Method.Base<
  { type: 'isNone' },
  false
> {}

/**
 * Some Match method - pattern match on Option
 */
export interface SomeMatch<T> extends Method.Base<
  {
    type: 'match';
    onSome: FunctionHKTF.Fn1<T, unknown>;
    onNone: FunctionHKTF.Fn1<void, unknown>;
  },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onSome'] extends FunctionHKTF.Fn1<T, infer R>
    ? R
    : never;
}

/**
 * Some HKTO - value captured in type parameter
 */
export interface SomeHKTO<T> extends HKTO.Combine<readonly [
  SomeMap<T>,
  SomeAndThen<T>,
  SomeFilter<T>,
  SomeOr<T>,
  SomeOrElse<T>,
  SomeUnwrap<T>,
  SomeUnwrapOr<T>,
  SomeIsSome,
  SomeIsNone,
  SomeMatch<T>
]> {}

// ============================================================================
// None Methods
// ============================================================================

/**
 * None Map method
 */
export interface NoneMap extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<never, unknown> },
  NoneHKTO
> {}

/**
 * None AndThen method
 */
export interface NoneAndThen extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<never, OptionHKTO<unknown>> },
  NoneHKTO
> {}

/**
 * None Filter method
 */
export interface NoneFilter extends Method.Base<
  { type: 'filter'; predicate: FunctionHKTF.Predicate<never> },
  NoneHKTO
> {}

/**
 * None Or method - returns alternative
 */
export interface NoneOr extends Method.Base<
  { type: 'or'; alternative: OptionHKTO<unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['alternative'];
}

/**
 * None OrElse method - computes alternative
 */
export interface NoneOrElse extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<void, OptionHKTO<unknown>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<void, infer R>
    ? R
    : never;
}

/**
 * None Unwrap method - throws
 */
export interface NoneUnwrap extends Method.Base<
  { type: 'unwrap' },
  never
> {}

/**
 * None UnwrapOr method - returns default
 */
export interface NoneUnwrapOr extends Method.Base<
  { type: 'unwrapOr'; defaultValue: unknown },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['defaultValue'];
}

/**
 * None IsSome method
 */
export interface NoneIsSome extends Method.Base<
  { type: 'isSome' },
  false
> {}

/**
 * None IsNone method
 */
export interface NoneIsNone extends Method.Base<
  { type: 'isNone' },
  true
> {}

/**
 * None Match method - pattern match on Option
 */
export interface NoneMatch extends Method.Base<
  {
    type: 'match';
    onSome: FunctionHKTF.Fn1<never, unknown>;
    onNone: FunctionHKTF.Fn1<void, unknown>;
  },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onNone'] extends FunctionHKTF.Fn1<void, infer R>
    ? R
    : never;
}

/**
 * None HKTO - no value to capture
 */
export interface NoneHKTO extends HKTO.Combine<readonly [
  NoneMap,
  NoneAndThen,
  NoneFilter,
  NoneOr,
  NoneOrElse,
  NoneUnwrap,
  NoneUnwrapOr,
  NoneIsSome,
  NoneIsNone,
  NoneMatch
]> {}

/**
 * Option HKTO - union of Some and None
 */
export type OptionHKTO<T> = SomeHKTO<T> | NoneHKTO;

/**
 * Constructors
 */
export interface SomeConstructor extends HKTF.Base {
  [HKTF.ArgsSymbol]: { value: unknown };
  [HKTF.ResultSymbol]: SomeHKTO<HKTF.Args<this>['value']>;
}

export interface NoneConstructor extends HKTF.Base {
  [HKTF.ArgsSymbol]: {};
  [HKTF.ResultSymbol]: NoneHKTO;
}

/**
 * Extract value type from Option
 */
export type ValueType<O extends Option<any>> = O extends Some<infer T> ? T : never;
