/**
 * Validation Type Definitions
 *
 * Type-level definitions for Validation with error accumulation.
 */

/**
 * Success type - represents valid value
 */
export interface Success<T> {
  readonly _tag: 'Success';
  readonly value: T;
}

/**
 * Failure type - represents accumulated errors
 */
export interface Failure<E> {
  readonly _tag: 'Failure';
  readonly errors: readonly E[];
}

/**
 * Validation - Either Success or Failure with error accumulation
 *
 * Unlike Either/Result which short-circuit on first error,
 * Validation accumulates all errors.
 */
export type Validation<E, T> = Success<T> | Failure<E>;
