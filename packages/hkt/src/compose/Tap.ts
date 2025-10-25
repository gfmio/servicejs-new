import * as HKTF from '../hktf.js';

/**
 * Tap HKTF - applies HKTF for side effects but returns original input
 *
 * Useful for logging, debugging, or other side effects that shouldn't affect
 * the data flow. The function is applied but its result is discarded.
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Tap,
 *   { fn: LogToConsole; input: 'hello' }
 * >;
 * // Result: 'hello' (LogToConsole was called but result ignored)
 * ```
 */

export interface TapArgs {
  fn: HKTF.Base;
  input: unknown;
}

export interface TapResult<T extends TapArgs> {
  result: T['input'];
}

export interface Tap extends HKTF.Base {
  [HKTF.ArgsSymbol]: TapArgs;
  [HKTF.ResultSymbol]: TapResult<HKTF.Args<this>>;
}
