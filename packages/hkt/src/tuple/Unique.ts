import type * as HKTF from '../hktf';

export interface UniqueArgs {
  tuple: readonly unknown[];
}

// Helper to check if element is in accumulated result
type IsInTuple<E, T extends readonly unknown[]> =
  T extends readonly []
    ? false
    : T extends readonly [infer Head, ...infer Tail]
    ? E extends Head
      ? Head extends E
        ? true
        : IsInTuple<E, Tail>
      : IsInTuple<E, Tail>
    : false;

export type UniqueResult<T extends UniqueArgs, Acc extends readonly unknown[] = readonly []> =
  T['tuple'] extends readonly []
    ? Acc
    : T['tuple'] extends readonly [infer Head, ...infer Tail]
    ? IsInTuple<Head, Acc> extends true
      ? UniqueResult<{ tuple: Tail }, Acc>
      : UniqueResult<{ tuple: Tail }, readonly [...Acc, Head]>
    : Acc;

/**
 * Unique HKTF - removes duplicate elements from a tuple
 * Uses structural type equality
 */
export interface Unique extends HKTF.Base {
  [HKTF.ArgsSymbol]: UniqueArgs;
  [HKTF.ResultSymbol]: UniqueResult<HKTF.Args<this>>;
}

export function unique<const A extends readonly unknown[]>(tuple: A): HKTF.Apply<Unique, {tuple: A}>;
export function unique<const T extends UniqueArgs>(args: T): HKTF.Apply<Unique, T>;
export function unique<const T extends UniqueArgs>(...args: [T] | [T["tuple"]]): HKTF.Apply<Unique, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return Array.from(new Set(args[0].tuple)) as unknown as HKTF.Apply<Unique, T>;
  }
  return Array.from(new Set(args[0] as T["tuple"])) as unknown as HKTF.Apply<Unique, T>;
}
