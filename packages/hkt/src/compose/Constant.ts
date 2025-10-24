import * as HKTF from '../hktf.js';

/**
 * Constant HKTF - always returns the same value
 *
 * @example
 * ```typescript
 * type Result = HKTF.Apply<
 *   Constant,
 *   { value: 42; input: 'anything' }
 * >;
 * // Result: 42
 * ```
 */

export interface ConstantArgs {
  value: unknown;
  input: unknown;
}

export interface ConstantResult<T extends ConstantArgs> {
  result: T['value'];
}

export interface Constant extends HKTF.Base {
  [HKTF.ArgsSymbol]: ConstantArgs;
  [HKTF.ResultSymbol]: ConstantResult<HKTF.Args<this>>;
}
