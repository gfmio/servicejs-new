import type * as HKTF from "../hktf";


export interface AndArgs {
  a: boolean;
  b: boolean;
}

export type AndResult<T extends AndArgs> = T['a'] extends true
  ? T['b'] extends true
    ? true
    : false
  : false;


/**
 * And - logical AND
 */
export interface And extends HKTF.Base {
  [HKTF.ArgsSymbol]: AndArgs;
  [HKTF.ResultSymbol]: AndResult<HKTF.Args<this>>
} 

export function and<const A extends boolean, const B extends boolean>(a: A, b: B): HKTF.Apply<And, {a: A, b: B}>;
export function and<const T extends AndArgs>(args: T): HKTF.Apply<And, T>;
export function and<const T extends AndArgs>(...args: [T] | [T["a"], T["b"]]): HKTF.Apply<And, T> {
  return args.length === 1 ? (args[0].a && args[0].b) as HKTF.Apply<And, T> : (args[0] && args[1]) as HKTF.Apply<And, T>;
}
