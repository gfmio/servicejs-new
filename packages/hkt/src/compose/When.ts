import * as HKTF from '../hktf.js';
import * as FunctionHKTF from '../function.js';

/**
 * When HKTF - conditionally applies HKTF based on predicate
 *
 * If predicate returns true, applies fn to input. Otherwise returns input unchanged.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   When,
 *   {
 *     predicate: IsPositive;
 *     fn: Double;
 *     input: 5
 *   }
 * >;
 * // Result: 10 (if positive) or 5 (if not positive)
 * ```
 */

export interface WhenArgs {
  predicate: FunctionHKTF.Predicate<unknown>;
  fn: HKTF.Base;
  input: unknown;
}

export interface WhenResult<T extends WhenArgs> {
  result: HKTF.Apply<T['predicate'], { input: T['input'] }> extends true
    ? HKTF.Apply<T['fn'], { input: T['input'] }>
    : T['input'];
}

export interface When extends HKTF.Base {
  [HKTF.ArgsSymbol]: WhenArgs;
  [HKTF.ResultSymbol]: WhenResult<HKTF.Args<this>>;
}
