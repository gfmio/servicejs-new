/**
 * These Type - Inclusive OR
 *
 * Like Either but can be Left, Right, OR Both.
 * Useful for operations that can succeed with warnings.
 */

/**
 * This - Only left value (like Either's Left)
 */
export class This<L> {
  readonly _tag = 'This' as const;
  constructor(readonly value: L) {}
}

/**
 * That - Only right value (like Either's Right)
 */
export class That<R> {
  readonly _tag = 'That' as const;
  constructor(readonly value: R) {}
}

/**
 * Both - Both left and right values (success with warnings)
 */
export class Both<L, R> {
  readonly _tag = 'Both' as const;
  constructor(
    readonly left: L,
    readonly right: R
  ) {}
}

/**
 * These - Can be This, That, or Both
 */
export type These<L, R> = This<L> | That<R> | Both<L, R>;

/**
 * Create a This
 */
export function makeThis<L>(value: L): This<L> {
  return new This(value);
}

/**
 * Create a That
 */
export function that<R>(value: R): That<R> {
  return new That(value);
}

/**
 * Create a Both
 */
export function both<L, R>(left: L, right: R): Both<L, R> {
  return new Both(left, right);
}

/**
 * Check if These is This
 */
export function isThis<L, R>(these: These<L, R>): these is This<L> {
  return these._tag === 'This';
}

/**
 * Check if These is That
 */
export function isThat<L, R>(these: These<L, R>): these is That<R> {
  return these._tag === 'That';
}

/**
 * Check if These is Both
 */
export function isBoth<L, R>(these: These<L, R>): these is Both<L, R> {
  return these._tag === 'Both';
}

/**
 * Check if These has a left value (This or Both)
 */
export function hasLeft<L, R>(these: These<L, R>): these is This<L> | Both<L, R> {
  return isThis(these) || isBoth(these);
}

/**
 * Check if These has a right value (That or Both)
 */
export function hasRight<L, R>(these: These<L, R>): these is That<R> | Both<L, R> {
  return isThat(these) || isBoth(these);
}

/**
 * Map over the right value
 */
export function map<L, R, U>(
  these: These<L, R>,
  fn: (value: R) => U
): These<L, U> {
  if (isThat(these)) {
    return that(fn(these.value));
  }
  if (isBoth(these)) {
    return both(these.left, fn(these.right));
  }
  return these as These<L, U>;
}

/**
 * Map over the left value
 */
export function mapLeft<L, R, M>(
  these: These<L, R>,
  fn: (value: L) => M
): These<M, R> {
  if (isThis(these)) {
    return makeThis(fn(these.value));
  }
  if (isBoth(these)) {
    return both(fn(these.left), these.right);
  }
  return these as These<M, R>;
}

/**
 * Map over both values
 */
export function biMap<L, R, M, U>(
  these: These<L, R>,
  leftFn: (value: L) => M,
  rightFn: (value: R) => U
): These<M, U> {
  if (isThis(these)) {
    return makeThis(leftFn(these.value));
  }
  if (isThat(these)) {
    return that(rightFn(these.value));
  }
  return both(leftFn(these.left), rightFn(these.right));
}

/**
 * Pattern match on These
 */
export function match<L, R, U>(
  these: These<L, R>,
  handlers: {
    onThis: (value: L) => U;
    onThat: (value: R) => U;
    onBoth: (left: L, right: R) => U;
  }
): U {
  if (isThis(these)) {
    return handlers.onThis(these.value);
  }
  if (isThat(these)) {
    return handlers.onThat(these.value);
  }
  return handlers.onBoth(these.left, these.right);
}

/**
 * Get the right value or default
 */
export function getOrElse<L, R>(these: These<L, R>, defaultValue: R): R {
  if (isThat(these)) {
    return these.value;
  }
  if (isBoth(these)) {
    return these.right;
  }
  return defaultValue;
}

/**
 * Get the left value or default
 */
export function getLeftOrElse<L, R>(these: These<L, R>, defaultValue: L): L {
  if (isThis(these)) {
    return these.value;
  }
  if (isBoth(these)) {
    return these.left;
  }
  return defaultValue;
}

/**
 * Merge left values if both exist, otherwise pass through
 * Useful for accumulating warnings
 */
export function mergeLeft<L, R>(
  these1: These<L, R>,
  these2: These<L, R>,
  combine: (a: L, b: L) => L
): These<L, R> {
  if (isThis(these1) && isThis(these2)) {
    return makeThis(combine(these1.value, these2.value));
  }
  if (isThis(these1) && isThat(these2)) {
    return both(these1.value, these2.value);
  }
  if (isThis(these1) && isBoth(these2)) {
    return both(combine(these1.value, these2.left), these2.right);
  }
  if (isThat(these1) && isThis(these2)) {
    return both(these2.value, these1.value);
  }
  if (isThat(these1) && isThat(these2)) {
    // No left values to merge, just keep second
    return these2;
  }
  if (isThat(these1) && isBoth(these2)) {
    return these2;
  }
  if (isBoth(these1) && isThis(these2)) {
    return both(combine(these1.left, these2.value), these1.right);
  }
  if (isBoth(these1) && isThat(these2)) {
    return both(these1.left, these2.value);
  }
  // Both and Both
  return both(combine((these1 as Both<L, R>).left, (these2 as Both<L, R>).left), (these2 as Both<L, R>).right);
}
