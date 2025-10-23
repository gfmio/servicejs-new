/**
 * Rust-style Result type for error handling without exceptions
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly kind: 'ok';
  readonly value: T;
}

export interface Err<E> {
  readonly kind: 'err';
  readonly error: E;
}

export const Ok = <T>(value: T): Ok<T> => ({
  kind: 'ok',
  value,
});

export const Err = <E>(error: E): Err<E> => ({
  kind: 'err',
  error,
});

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => {
  return result.kind === 'ok';
};

export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => {
  return result.kind === 'err';
};

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Called unwrap on an Err value: ${result.error}`);
};

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T => {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
};

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => {
  if (isOk(result)) {
    return Ok(fn(result.value));
  }
  return result;
};

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => {
  if (isErr(result)) {
    return Err(fn(result.error));
  }
  return result;
};

export const andThen = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
};
