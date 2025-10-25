/**
 * Validation Class Implementations
 *
 * Class-based API for Validation types with methods.
 */

import type { Validation, Success as SuccessType, Failure as FailureType } from './types.js';

/**
 * Success class - represents a valid value
 */
export class Success<T> implements SuccessType<T> {
  readonly _tag = 'Success' as const;

  constructor(readonly value: T) {}

  map<U>(fn: (value: T) => U): Validation<never, U> {
    return new Success(fn(this.value));
  }

  mapError<F>(_fn: (error: never) => F): Validation<F, T> {
    return this as any;
  }

  andThen<E, U>(fn: (value: T) => Validation<E, U>): Validation<E, U> {
    return fn(this.value);
  }

  orElse<F>(_fn: (errors: readonly never[]) => Validation<F, T>): Validation<F, T> {
    return this as any;
  }

  fold<U>(_onFailure: (errors: readonly never[]) => U, onSuccess: (value: T) => U): U {
    return onSuccess(this.value);
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getOrElseWith(_fn: (errors: readonly never[]) => T): T {
    return this.value;
  }

  isSuccess(): this is Success<T> {
    return true;
  }

  isFailure(): this is never {
    return false;
  }

  toEither(): { _tag: 'Right'; right: T } {
    return { _tag: 'Right', right: this.value };
  }
}

/**
 * Failure class - represents accumulated errors
 */
export class Failure<E> implements FailureType<E> {
  readonly _tag = 'Failure' as const;

  constructor(readonly errors: readonly E[]) {}

  map<U>(_fn: (value: never) => U): Validation<E, U> {
    return this as any;
  }

  mapError<F>(fn: (error: E) => F): Validation<F, never> {
    return new Failure(this.errors.map(fn));
  }

  andThen<U>(_fn: (value: never) => Validation<E, U>): Validation<E, U> {
    return this as any;
  }

  orElse<T, F>(fn: (errors: readonly E[]) => Validation<F, T>): Validation<F, T> {
    return fn(this.errors);
  }

  fold<T, U>(onFailure: (errors: readonly E[]) => U, _onSuccess: (value: T) => U): U {
    return onFailure(this.errors);
  }

  getOrElse<T>(defaultValue: T): T {
    return defaultValue;
  }

  getOrElseWith<T>(fn: (errors: readonly E[]) => T): T {
    return fn(this.errors);
  }

  isSuccess(): this is never {
    return false;
  }

  isFailure(): this is Failure<E> {
    return true;
  }

  toEither(): { _tag: 'Left'; left: readonly E[] } {
    return { _tag: 'Left', left: this.errors };
  }
}

/**
 * Create a Success Validation
 */
export function success<T>(value: T): Success<T> {
  return new Success(value);
}

/**
 * Create a Failure Validation from errors
 */
export function failure<E>(...errors: E[]): Failure<E> {
  return new Failure(errors);
}

/**
 * Create a Failure Validation from error array
 */
export function failures<E>(errors: readonly E[]): Failure<E> {
  return new Failure(errors);
}
