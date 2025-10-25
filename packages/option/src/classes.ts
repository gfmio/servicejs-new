/**
 * Option Class Implementations
 *
 * Class-based API for Option types with methods.
 */

import type { None as NoneType, Option, Some as SomeType } from './types.js';

/**
 * Some class - represents a present value
 */
export class Some<T> implements SomeType<T> {
  readonly _tag = 'Some' as const;

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Option<U> {
    return new Some(fn(this.value));
  }

  andThen<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }

  or(_alternative: Option<T>): Option<T> {
    return this;
  }

  orElse(_fn: () => Option<T>): Option<T> {
    return this;
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : none();
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(_defaultValue: T): T {
    return this.value;
  }

  unwrapOrElse(_fn: () => T): T {
    return this.value;
  }

  toNullable(): T {
    return this.value;
  }

  toUndefined(): T {
    return this.value;
  }

  isSome(): this is Some<T> {
    return true;
  }

  isNone(): this is never {
    return false;
  }

  match<U>(handlers: { onSome: (value: T) => U; onNone: () => U }): U {
    return handlers.onSome(this.value);
  }
}

/**
 * None class - represents absence of value
 */
export class None implements NoneType {
  readonly _tag = 'None' as const;

  map<U>(_fn: (value: never) => U): Option<U> {
    return this;
  }

  andThen<U>(_fn: (value: never) => Option<U>): Option<U> {
    return this;
  }

  or<T>(alternative: Option<T>): Option<T> {
    return alternative;
  }

  orElse<T>(fn: () => Option<T>): Option<T> {
    return fn();
  }

  filter(_predicate: (value: never) => boolean): Option<never> {
    return this;
  }

  unwrap(): never {
    throw new Error('Called unwrap on a None value');
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue;
  }

  unwrapOrElse<T>(fn: () => T): T {
    return fn();
  }

  toNullable(): null {
    return null;
  }

  toUndefined(): undefined {
    return undefined;
  }

  isSome(): this is never {
    return false;
  }

  isNone(): this is None {
    return true;
  }

  match<T, U>(handlers: { onSome: (value: T) => U; onNone: () => U }): U {
    return handlers.onNone();
  }
}

/**
 * Singleton None instance
 */
const NONE = Object.freeze(new None());

/**
 * Create a Some Option
 */
export function some<T>(value: T): Some<T> {
  return new Some(value);
}

/**
 * Create a None Option
 */
export function none(): None {
  return NONE;
}
