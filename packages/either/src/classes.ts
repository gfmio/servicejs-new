/**
 * Either Class Implementations
 *
 * Class-based API for Either types with methods.
 */

import type { Either, Left as LeftType, Right as RightType } from './types.js';

/**
 * Right class - represents the right/success value
 */
export class Right<R> implements RightType<R> {
  readonly _tag = 'Right' as const;

  constructor(readonly right: R) {}

  map<U>(fn: (value: R) => U): Either<never, U> {
    return new Right(fn(this.right));
  }

  mapLeft<M>(_fn: (value: never) => M): Either<M, R> {
    return this as any;
  }

  biMap<M, U>(_leftFn: (value: never) => M, rightFn: (value: R) => U): Either<M, U> {
    return new Right(rightFn(this.right));
  }

  andThen<L, U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    return fn(this.right);
  }

  orElse<M>(_fn: (value: never) => Either<M, R>): Either<M, R> {
    return this as any;
  }

  swap<L>(): Either<R, L> {
    return new Left(this.right);
  }

  unwrapRight(): R {
    return this.right;
  }

  unwrapLeft(): never {
    throw new Error(`Called unwrapLeft on a Right value: ${JSON.stringify(this.right)}`);
  }

  getOrElse(_defaultValue: R): R {
    return this.right;
  }

  getOrElseWith(_fn: (left: never) => R): R {
    return this.right;
  }

  isLeft(): this is never {
    return false;
  }

  isRight(): this is Right<R> {
    return true;
  }

  match<L, U>(handlers: { onLeft: (value: L) => U; onRight: (value: R) => U }): U {
    return handlers.onRight(this.right);
  }

  toTuple<L>(): readonly [L | null, R | null] {
    return [null, this.right];
  }
}

/**
 * Left class - represents the left/error value
 */
export class Left<L> implements LeftType<L> {
  readonly _tag = 'Left' as const;

  constructor(readonly left: L) {}

  map<U>(_fn: (value: never) => U): Either<L, U> {
    return this as any;
  }

  mapLeft<M>(fn: (value: L) => M): Either<M, never> {
    return new Left(fn(this.left));
  }

  biMap<M, U>(leftFn: (value: L) => M, _rightFn: (value: never) => U): Either<M, U> {
    return new Left(leftFn(this.left));
  }

  andThen<U>(_fn: (value: never) => Either<L, U>): Either<L, U> {
    return this as any;
  }

  orElse<R, M>(fn: (value: L) => Either<M, R>): Either<M, R> {
    return fn(this.left);
  }

  swap<R>(): Either<R, L> {
    return new Right(this.left);
  }

  unwrapRight(): never {
    throw new Error(`Called unwrapRight on a Left value: ${JSON.stringify(this.left)}`);
  }

  unwrapLeft(): L {
    return this.left;
  }

  getOrElse<R>(defaultValue: R): R {
    return defaultValue;
  }

  getOrElseWith<R>(fn: (left: L) => R): R {
    return fn(this.left);
  }

  isLeft(): this is Left<L> {
    return true;
  }

  isRight(): this is never {
    return false;
  }

  match<R, U>(handlers: { onLeft: (value: L) => U; onRight: (value: R) => U }): U {
    return handlers.onLeft(this.left);
  }

  toTuple<R>(): readonly [L | null, R | null] {
    return [this.left, null];
  }
}

/**
 * Create a Left Either
 */
export function left<L>(value: L): Left<L> {
  return new Left(value);
}

/**
 * Create a Right Either
 */
export function right<R>(value: R): Right<R> {
  return new Right(value);
}
