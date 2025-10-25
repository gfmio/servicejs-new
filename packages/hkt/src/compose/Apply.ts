import * as HKTF from '../hktf.js';

/**
 * Apply HKTF - applies an HKTF to a value
 *
 * This is essentially the same as HKTF.Apply but packaged as an HKTF itself,
 * allowing it to be composed with other HKTFs.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Apply,
 *   { fn: ToUpperHKTF; input: 'hello' }
 * >;
 * // Result: 'HELLO'
 * ```
 */

export interface ApplyArgs {
  fn: HKTF.Base;
  input: unknown;
}

export interface ApplyResult<T extends ApplyArgs> {
  result: HKTF.Apply<T['fn'], { input: T['input'] }>;
}

export interface Apply extends HKTF.Base {
  [HKTF.ArgsSymbol]: ApplyArgs;
  [HKTF.ResultSymbol]: ApplyResult<HKTF.Args<this>>;
}
