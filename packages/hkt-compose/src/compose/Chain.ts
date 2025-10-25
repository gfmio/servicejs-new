import { HKTF } from '@servicejs/hkt-core';

/**
 * Chain HKTF - monadic composition for nested results
 *
 * Also known as FlatMap or Bind. Applies f to input, then applies g to the
 * unwrapped result. Useful for chaining operations that return wrapped values.
 *
 * @example
 * ```typescript
 * // If ParseInt returns Result<number, Error>
 * // and Divide also returns Result<number, Error>
 * type Result = HKTF.Apply<
 *   Chain,
 *   { f: ParseInt; g: Divide; input: '42' }
 * >;
 * // Result: Result<number, Error> (not Result<Result<number, Error>, Error>)
 * ```
 */

export interface ChainArgs {
  f: HKTF.Base;
  g: HKTF.Base;
  input: unknown;
}

export type ChainResult<T extends ChainArgs> = HKTF.Apply<
    T['g'],
    { input: HKTF.Apply<T['f'], { input: T['input'] }> }
  >;

export interface Chain extends HKTF.Base {
  [HKTF.ArgsSymbol]: ChainArgs;
  [HKTF.ResultSymbol]: ChainResult<HKTF.Args<this>>;
}
