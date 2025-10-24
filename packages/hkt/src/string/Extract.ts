import type * as HKTF from '../hktf';

export interface ExtractArgs {
  str: string;
  start: string;
  end: string;
}

// Type-level extraction is complex, simplified to return string
export type ExtractResult<_T extends ExtractArgs> = string;

/**
 * Extract HKTF - extracts substring between start and end delimiters
 */
export interface Extract extends HKTF.Base {
  [HKTF.ArgsSymbol]: ExtractArgs;
  [HKTF.ResultSymbol]: ExtractResult<HKTF.Args<this>>;
}

export function extract<const S extends string, const Start extends string, const End extends string>(str: S, start: Start, end: End): HKTF.Apply<Extract, {str: S, start: Start, end: End}>;
export function extract<const T extends ExtractArgs>(args: T): HKTF.Apply<Extract, T>;
export function extract<const T extends ExtractArgs>(...args: [T] | [T["str"], T["start"], T["end"]]): HKTF.Apply<Extract, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    const startIdx = args[0].str.indexOf(args[0].start);
    if (startIdx === -1) return '' as unknown as HKTF.Apply<Extract, T>;

    const searchStart = startIdx + args[0].start.length;
    const endIdx = args[0].str.indexOf(args[0].end, searchStart);
    if (endIdx === -1) return '' as unknown as HKTF.Apply<Extract, T>;

    return args[0].str.slice(searchStart, endIdx) as unknown as HKTF.Apply<Extract, T>;
  }
  const str = args[0] as string;
  const start = args[1] as string;
  const end = args[2] as string;

  const startIdx = str.indexOf(start);
  if (startIdx === -1) return '' as unknown as HKTF.Apply<Extract, T>;

  const searchStart = startIdx + start.length;
  const endIdx = str.indexOf(end, searchStart);
  if (endIdx === -1) return '' as unknown as HKTF.Apply<Extract, T>;

  return str.slice(searchStart, endIdx) as unknown as HKTF.Apply<Extract, T>;
}
