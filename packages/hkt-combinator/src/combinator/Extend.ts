import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * Extend HKTF - extends an HKTO with additional methods
 *
 * @example
 * ```typescript
 * type Extended = HKTF.Apply<
 *   Extend,
 *   { base: CounterHKTO; extension: readonly [ResetMethod] }
 * >;
 * ```
 */

export interface ExtendArgs {
  base: HKTO.Base;
  extension: readonly Method.Base[];
}

export type ExtendResult<T extends ExtendArgs> = HKTO.Combine<
    readonly [...T['base'][typeof HKTO.MethodsSymbol], ...T['extension']]
  >;

export interface Extend extends HKTF.Base {
  [HKTF.ArgsSymbol]: ExtendArgs;
  [HKTF.ResultSymbol]: ExtendResult<HKTF.Args<this>>;
}
