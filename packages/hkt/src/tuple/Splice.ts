import * as Arithmetic from 'ts-arithmetic';
import type * as HKTF from '../hktf';

export interface SpliceArgs {
  tuple: readonly unknown[];
  start: number;
  deleteCount: number;
  items?: readonly unknown[];
}

// Helper to decrement numbers
type Dec<N extends number> = Arithmetic.Subtract<N, 1>;

// Take first N elements
type TakeN<T extends readonly unknown[], N extends number, Acc extends readonly unknown[] = readonly []> =
  N extends 0
    ? Acc
    : T extends readonly [infer Head, ...infer Tail]
      ? TakeN<Tail, Dec<N>, readonly [...Acc, Head]>
      : Acc;

// Drop first N elements
type DropN<T extends readonly unknown[], N extends number> =
  N extends 0
    ? T
    : T extends readonly [any, ...infer Tail]
      ? DropN<Tail, Dec<N>>
      : readonly [];

// Skip N elements then drop M more
type SkipAndDrop<T extends readonly unknown[], Skip extends number, Drop extends number> =
  DropN<DropN<T, Skip>, Drop>;

export type SpliceResult<T extends SpliceArgs> =
  T['items'] extends readonly unknown[]
    ? readonly [
        ...TakeN<T['tuple'], T['start']>,
        ...T['items'],
        ...SkipAndDrop<T['tuple'], T['start'], T['deleteCount']>
      ]
    : readonly [
        ...TakeN<T['tuple'], T['start']>,
        ...SkipAndDrop<T['tuple'], T['start'], T['deleteCount']>
      ];

/**
 * Splice HKTF - removes elements and optionally inserts new ones
 */
export interface Splice extends HKTF.Base {
  [HKTF.ArgsSymbol]: SpliceArgs;
  [HKTF.ResultSymbol]: SpliceResult<HKTF.Args<this>>;
}

export function splice<const A extends readonly unknown[], const S extends number, const D extends number, const I extends readonly unknown[] = readonly []>(tuple: A, start: S, deleteCount: D, items?: I): HKTF.Apply<Splice, {tuple: A, start: S, deleteCount: D, items: I}>;
export function splice<const T extends SpliceArgs>(args: T): HKTF.Apply<Splice, T>;
export function splice<const T extends SpliceArgs>(...args: [T] | [T["tuple"], T["start"], T["deleteCount"], T["items"]?]): HKTF.Apply<Splice, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result = [...args[0].tuple];
    if (args[0].items) {
      result.splice(args[0].start, args[0].deleteCount, ...args[0].items);
    } else {
      result.splice(args[0].start, args[0].deleteCount);
    }
    return result as unknown as HKTF.Apply<Splice, T>;
  }
  const result = [...(args[0] as T["tuple"])];
  if (args[3]) {
    result.splice(args[1] as T["start"], args[2] as T["deleteCount"], ...(args[3] as readonly unknown[]));
  } else {
    result.splice(args[1] as T["start"], args[2] as T["deleteCount"]);
  }
  return result as unknown as HKTF.Apply<Splice, T>;
}
