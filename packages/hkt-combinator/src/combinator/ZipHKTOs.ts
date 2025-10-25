import { HKTF, HKTO } from '@servicejs/hkt-core';

/**
 * ZipHKTOs HKTF - merges N HKTOs into one
 *
 * Generalization of MergeTwoHKTOs that handles any number of HKTOs.
 *
 * @example
 * ```typescript
 * type Combined = HKTF.Apply<
 *   ZipHKTOs,
 *   { hktos: readonly [CounterHKTO, TimerHKTO, LoggerHKTO] }
 * >;
 * ```
 */

export interface ZipHKTOsArgs {
  hktos: readonly HKTO.Base[];
}

export type ZipHKTOsResult<T extends ZipHKTOsArgs> = HKTO.Combine<ZipMethods<T['hktos']>>;

export interface ZipHKTOs extends HKTF.Base {
  [HKTF.ArgsSymbol]: ZipHKTOsArgs;
  [HKTF.ResultSymbol]: ZipHKTOsResult<HKTF.Args<this>>;
}

/**
 * Helper: Collect all methods from all HKTOs
 */
type ZipMethods<HKTOs extends readonly HKTO.Base[]> = HKTOs extends readonly []
  ? readonly []
  : HKTOs extends readonly [infer H, ...infer Rest]
  ? H extends HKTO.Base
    ? Rest extends readonly HKTO.Base[]
      ? readonly [...H[typeof HKTO.MethodsSymbol], ...ZipMethods<Rest>]
      : H[typeof HKTO.MethodsSymbol]
    : readonly []
  : readonly [];
