import type * as HKTF from '../hktf';

export interface PushArgs {
  tuple: readonly unknown[];
  element: unknown;
}

export type PushResult<T extends PushArgs> = readonly [...T['tuple'], T['element']];

/**
 * Push HKTF - appends an element to the end of a tuple
 */
export interface Push extends HKTF.Base {
  [HKTF.ArgsSymbol]: PushArgs;
  [HKTF.ResultSymbol]: PushResult<HKTF.Args<this>>;
}

export function push<const A extends readonly unknown[], const E>(tuple: A, element: E): HKTF.Apply<Push, {tuple: A, element: E}>;
export function push<const T extends PushArgs>(args: T): HKTF.Apply<Push, T>;
export function push<const T extends PushArgs>(...args: [T] | [T["tuple"], T["element"]]): HKTF.Apply<Push, T> {
  if (typeof args[0] === 'object' && 'tuple' in args[0]) {
    return [...args[0].tuple, args[0].element] as unknown as HKTF.Apply<Push, T>;
  }
  return [...(args[0] as T["tuple"]), args[1] as T["element"]] as unknown as HKTF.Apply<Push, T>;
}
