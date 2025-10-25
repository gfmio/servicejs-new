import type { FunctionHKTF } from '@servicejs/hkt-core';
import type { HKTF } from '@servicejs/hkt-core';

export interface UpdateArgs {
  obj: Record<string, unknown>;
  path: readonly string[];
  updater: FunctionHKTF.Fn1<unknown, unknown>;
}

// Type-level update is complex, simplified version
export type UpdateResult<_T extends UpdateArgs> = Record<string, unknown>;

/**
 * Update HKTF - updates value at path by applying a function
 * Returns new object with updated value
 */
export interface Update extends HKTF.Base {
  [HKTF.ArgsSymbol]: UpdateArgs;
  [HKTF.ResultSymbol]: UpdateResult<HKTF.Args<this>>;
}

export function update<const O extends Record<string, unknown>, const P extends readonly string[], const U extends FunctionHKTF.Fn1<unknown, unknown>>(obj: O, path: P, updater: U): HKTF.Apply<Update, {obj: O, path: P, updater: U}>;
export function update<const T extends UpdateArgs>(args: T): HKTF.Apply<Update, T>;
export function update<const T extends UpdateArgs>(...args: [T] | [T["obj"], T["path"], T["updater"]]): HKTF.Apply<Update, T> {
  if (typeof args[0] === 'object' && 'obj' in args[0]) {
    const path = args[0].path as readonly string[];
    if (path.length === 0) {
      return (args[0].updater as any)(args[0].obj) as HKTF.Apply<Update, T>;
    }
    const result = { ...(args[0].obj as Record<string, unknown>) };
    let current: any = result;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!;
      if (!(key in current)) {
        return result as unknown as HKTF.Apply<Update, T>;
      }
      current[key] = { ...current[key] };
      current = current[key];
    }
    const lastKey = path[path.length - 1]!;
    if (lastKey in current) {
      current[lastKey] = (args[0].updater as any)(current[lastKey]);
    }
    return result as unknown as HKTF.Apply<Update, T>;
  }
  const path = args[1] as readonly string[];
  const updater = args[2] as any;
  if (path.length === 0) {
    return updater(args[0]) as HKTF.Apply<Update, T>;
  }
  const result = { ...(args[0] as Record<string, unknown>) };
  let current: any = result;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!(key in current)) {
      return result as unknown as HKTF.Apply<Update, T>;
    }
    current[key] = { ...current[key] };
    current = current[key];
  }
  const lastKey = path[path.length - 1]!;
  if (lastKey in current) {
    current[lastKey] = updater(current[lastKey]);
  }
  return result as unknown as HKTF.Apply<Update, T>;
}
