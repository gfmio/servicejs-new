import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * DedupeMethods HKTF - removes duplicate methods by message type
 *
 * Returns an HKTO with only the first occurrence of each method type.
 *
 * @example
 * ```typescript
 * type Unique = HKTF.Apply<
 *   DedupeMethods,
 *   { hkto: MergedHKTO }
 * >;
 * ```
 */

export interface DedupeMethodsArgs {
  hkto: HKTO.Base;
}

export type DedupeMethodsResult<T extends DedupeMethodsArgs> = HKTO.Combine<
    DedupeByType<
      T['hkto'][typeof HKTO.MethodsSymbol],
      never
    >
  >;

export interface DedupeMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: DedupeMethodsArgs;
  [HKTF.ResultSymbol]: DedupeMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Remove duplicate method types, keeping first occurrence
 */
type DedupeByType<
  Methods extends readonly Method.Base[],
  Seen
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? Method.MessageOf<M> extends { type: infer T }
        ? T extends Seen
          ? DedupeByType<Rest, Seen>
          : readonly [M, ...DedupeByType<Rest, Seen | T>]
        : readonly [M, ...DedupeByType<Rest, Seen>]
      : readonly []
    : readonly []
  : readonly [];
