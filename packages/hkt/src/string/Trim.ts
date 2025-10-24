import type * as HKTF from '../hktf';

export interface TrimArgs {
  str: string;
}

export type TrimResult<T extends TrimArgs> = T['str'] extends ` ${infer Rest}` | `\t${infer Rest}` | `\n${infer Rest}`
  ? TrimResult<{ str: Rest }>
  : T['str'] extends `${infer Rest} ` | `${infer Rest}\t` | `${infer Rest}\n`
  ? TrimResult<{ str: Rest }>
  : T['str'];

/**
 * Trim HKTF - trims whitespace from both ends
 */
export interface Trim extends HKTF.Base {
  [HKTF.ArgsSymbol]: TrimArgs;
  [HKTF.ResultSymbol]: TrimResult<HKTF.Args<this>>;
}

export function trim<const S extends string>(str: S): HKTF.Apply<Trim, {str: S}>;
export function trim<const T extends TrimArgs>(args: T): HKTF.Apply<Trim, T>;
export function trim<const T extends TrimArgs>(...args: [T] | [T["str"]]): HKTF.Apply<Trim, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    return args[0].str.trim() as unknown as HKTF.Apply<Trim, T>;
  }
  return (args[0] as string).trim() as unknown as HKTF.Apply<Trim, T>;
}
