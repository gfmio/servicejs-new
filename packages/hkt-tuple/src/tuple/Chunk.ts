import type * as Arithmetic from "ts-arithmetic";
import type { HKTF } from '@servicejs/hkt-core';

export interface ChunkArgs {
  tuple: readonly unknown[];
  size: number;
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

export type ChunkResult<T extends ChunkArgs> = T['tuple'] extends readonly []
  ? readonly []
  : T['size'] extends 0
  ? readonly []
  : readonly [
      TakeN<T['tuple'], T['size']>,
      ...ChunkResult<{ tuple: DropN<T['tuple'], T['size']>; size: T['size'] }>
    ];

/**
 * Chunk HKTF - splits a tuple into chunks of a specific size
 */
export interface Chunk extends HKTF.Base {
  [HKTF.ArgsSymbol]: ChunkArgs;
  [HKTF.ResultSymbol]: ChunkResult<HKTF.Args<this>>;
}

// @ts-ignore Type instantiation is excessively deep and possibly infinite.ts(2589)
export function chunk<const A extends readonly unknown[], const S extends number>(tuple: A, size: S): HKTF.Apply<Chunk, {tuple: A, size: S}>;
export function chunk<const T extends ChunkArgs>(args: T): HKTF.Apply<Chunk, T>;
export function chunk<const T extends ChunkArgs>(...args: [T] | [T["tuple"], T["size"]]): HKTF.Apply<Chunk, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    const result: unknown[][] = [];
    const arr = args[0].tuple;
    const size = args[0].size;
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size) as unknown[]);
    }
    return result as unknown as HKTF.Apply<Chunk, T>;
  }
  const result: unknown[][] = [];
  const arr = args[0] as T["tuple"];
  const size = args[1] as T["size"];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size) as unknown[]);
  }
  return result as unknown as HKTF.Apply<Chunk, T>;
}
