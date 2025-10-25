import { HKTF, HKTO, Method, FunctionHKTF } from '@servicejs/hkt-core';

export interface Left<L> {
  readonly _tag: 'Left';
  readonly left: L;
}

export interface Right<R> {
  readonly _tag: 'Right';
  readonly right: R;
}

export type Either<L, R> = Left<L> | Right<R>;

// Right methods (similar to Ok)
export interface RightMap<L, R> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<R, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<R, infer U>
    ? RightHKTO<L, U>
    : never;
}

export interface RightMapLeft<L, R> extends Method.Base<
  { type: 'mapLeft'; fn: FunctionHKTF.Fn1<L, unknown> },
  RightHKTO<L, R>
> {}

export interface RightBiMap<L, R> extends Method.Base<
  { type: 'biMap'; leftFn: FunctionHKTF.Fn1<L, unknown>; rightFn: FunctionHKTF.Fn1<R, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['rightFn'] extends FunctionHKTF.Fn1<R, infer U>
    ? RightHKTO<L, U>
    : never;
}

export interface RightAndThen<L, R> extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<R, EitherHKTO<L, unknown>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<R, infer E>
    ? E
    : never;
}

export interface RightOrElse<L, R> extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<L, EitherHKTO<unknown, R>> },
  RightHKTO<L, R>
> {}

export interface RightSwap<L, R> extends Method.Base<
  { type: 'swap' },
  LeftHKTO<R, L>
> {}

export interface RightIsLeft extends Method.Base<{ type: 'isLeft' }, false> {}
export interface RightIsRight extends Method.Base<{ type: 'isRight' }, true> {}

export interface RightMatch<L, R> extends Method.Base<
  { type: 'match'; onLeft: FunctionHKTF.Fn1<L, unknown>; onRight: FunctionHKTF.Fn1<R, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onRight'] extends FunctionHKTF.Fn1<R, infer U>
    ? U
    : never;
}

export interface RightHKTO<L, R> extends HKTO.Combine<readonly [
  RightMap<L, R>,
  RightMapLeft<L, R>,
  RightBiMap<L, R>,
  RightAndThen<L, R>,
  RightOrElse<L, R>,
  RightSwap<L, R>,
  RightIsLeft,
  RightIsRight,
  RightMatch<L, R>
]> {}

// Left methods
export interface LeftMap<L, R> extends Method.Base<
  { type: 'map'; fn: FunctionHKTF.Fn1<R, unknown> },
  LeftHKTO<L, R>
> {}

export interface LeftMapLeft<L, R> extends Method.Base<
  { type: 'mapLeft'; fn: FunctionHKTF.Fn1<L, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<L, infer M>
    ? LeftHKTO<M, R>
    : never;
}

export interface LeftBiMap<L, R> extends Method.Base<
  { type: 'biMap'; leftFn: FunctionHKTF.Fn1<L, unknown>; rightFn: FunctionHKTF.Fn1<R, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['leftFn'] extends FunctionHKTF.Fn1<L, infer M>
    ? LeftHKTO<M, R>
    : never;
}

export interface LeftAndThen<L, R> extends Method.Base<
  { type: 'andThen'; fn: FunctionHKTF.Fn1<R, EitherHKTO<L, unknown>> },
  LeftHKTO<L, R>
> {}

export interface LeftOrElse<L, R> extends Method.Base<
  { type: 'orElse'; fn: FunctionHKTF.Fn1<L, EitherHKTO<unknown, R>> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['fn'] extends FunctionHKTF.Fn1<L, infer E>
    ? E
    : never;
}

export interface LeftSwap<L, R> extends Method.Base<
  { type: 'swap' },
  RightHKTO<R, L>
> {}

export interface LeftIsLeft extends Method.Base<{ type: 'isLeft' }, true> {}
export interface LeftIsRight extends Method.Base<{ type: 'isRight' }, false> {}

export interface LeftMatch<L, R> extends Method.Base<
  { type: 'match'; onLeft: FunctionHKTF.Fn1<L, unknown>; onRight: FunctionHKTF.Fn1<R, unknown> },
  unknown
> {
  [HKTF.ResultSymbol]: HKTF.Args<this>['onLeft'] extends FunctionHKTF.Fn1<L, infer U>
    ? U
    : never;
}

export interface LeftHKTO<L, R> extends HKTO.Combine<readonly [
  LeftMap<L, R>,
  LeftMapLeft<L, R>,
  LeftBiMap<L, R>,
  LeftAndThen<L, R>,
  LeftOrElse<L, R>,
  LeftSwap<L, R>,
  LeftIsLeft,
  LeftIsRight,
  LeftMatch<L, R>
]> {}

export type EitherHKTO<L, R> = LeftHKTO<L, R> | RightHKTO<L, R>;

export type LeftType<E extends Either<any, any>> = E extends Left<infer L> ? L : never;
export type RightType<E extends Either<any, any>> = E extends Right<infer R> ? R : never;
