import type * as HKTF from '../hktf';

export interface GetArgs {
  obj: Record<string, unknown>;
  path: readonly string[];
}

export type GetResult<T extends GetArgs> = T['path'] extends readonly []
  ? T['obj']
  : T['path'] extends readonly [infer Head, ...infer Tail]
  ? Head extends keyof T['obj']
    ? Tail extends readonly string[]
      ? T['obj'][Head] extends Record<string, unknown>
        ? GetResult<{ obj: T['obj'][Head]; path: Tail }>
        : T['obj'][Head]
      : T['obj'][Head]
    : never
  : never;

/**
 * Get HKTF - gets value at path in object
 * Path is a tuple of keys
 */
export interface Get extends HKTF.Base {
  [HKTF.ArgsSymbol]: GetArgs;
  [HKTF.ResultSymbol]: GetResult<HKTF.Args<this>>;
}

export function get<const O extends Record<string, unknown>, const P extends readonly string[]>(obj: O, path: P): HKTF.Apply<Get, {obj: O, path: P}>;
export function get<const T extends GetArgs>(args: T): HKTF.Apply<Get, T>;
export function get<const T extends GetArgs>(...args: [T] | [T["obj"], T["path"]]): HKTF.Apply<Get, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    let current: any = args[0].obj as Record<string, unknown>;
    const path = args[0].path as readonly string[];
    for (const key of path) {
      current = current[key];
    }
    return current as HKTF.Apply<Get, T>;
  }
  let current: any = args[0] as Record<string, unknown>;
  const path = args[1] as readonly string[];
  for (const key of path) {
    current = current[key];
  }
  return current as HKTF.Apply<Get, T>;
}
