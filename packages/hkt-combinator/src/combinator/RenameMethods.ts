import { HKTF, HKTO, Method } from '@servicejs/hkt-core';

/**
 * RenameMethods HKTF - renames method message types based on mapping
 *
 * Creates a new HKTO where method message types are renamed according to the mapping.
 * Methods not in the mapping keep their original type.
 *
 * @example
 * ```typescript
 * type Renamed = HKTF.Apply<
 *   RenameMethods,
 *   {
 *     hkto: CounterHKTO;
 *     mapping: { increment: 'inc'; decrement: 'dec' }
 *   }
 * >;
 * ```
 */

export interface RenameMethodsArgs {
  hkto: HKTO.Base;
  mapping: Record<string, string>;
}

export type RenameMethodsResult<T extends RenameMethodsArgs> = HKTO.Combine<
    RenameMethodTypes<
      T['hkto'][typeof HKTO.MethodsSymbol],
      T['mapping']
    >
  >;

export interface RenameMethods extends HKTF.Base {
  [HKTF.ArgsSymbol]: RenameMethodsArgs;
  [HKTF.ResultSymbol]: RenameMethodsResult<HKTF.Args<this>>;
}

/**
 * Helper: Rename method types based on mapping
 */
type RenameMethodTypes<
  Methods extends readonly Method.Base[],
  Mapping extends Record<string, string>
> = Methods extends readonly []
  ? readonly []
  : Methods extends readonly [infer M, ...infer Rest]
  ? M extends Method.Base
    ? Rest extends readonly Method.Base[]
      ? readonly [
          RenameMethodType<M, Mapping>,
          ...RenameMethodTypes<Rest, Mapping>
        ]
      : readonly [RenameMethodType<M, Mapping>]
    : readonly []
  : readonly [];

/**
 * Helper: Rename a single method's type
 */
type RenameMethodType<
  M extends Method.Base,
  Mapping extends Record<string, string>
> = Method.MessageOf<M> extends { type: infer T }
  ? T extends keyof Mapping
    ? Method.Base & {
        [HKTF.ArgsSymbol]: Omit<Method.MessageOf<M>, 'type'> & { type: Mapping[T] };
        [HKTF.ResultSymbol]: HKTF.Result<M>;
      }
    : M
  : M;
