import type * as HKTF from '../hktf';

export interface TemplateArgs {
  str: string;
  values: Record<string, string>;
}

// Type-level template is complex, simplified
export type TemplateResult<_T extends TemplateArgs> = string;

/**
 * Template HKTF - replaces {key} placeholders with values
 */
export interface Template extends HKTF.Base {
  [HKTF.ArgsSymbol]: TemplateArgs;
  [HKTF.ResultSymbol]: TemplateResult<HKTF.Args<this>>;
}

export function template<const S extends string, const V extends Record<string, string>>(str: S, values: V): HKTF.Apply<Template, {str: S, values: V}>;
export function template<const T extends TemplateArgs>(args: T): HKTF.Apply<Template, T>;
export function template<const T extends TemplateArgs>(...args: [T] | [T["str"], T["values"]]): HKTF.Apply<Template, T> {
  if (typeof args[0] === 'object' && 'str' in args[0]) {
    let result = args[0].str;
    for (const [key, value] of Object.entries(args[0].values)) {
      result = result.replaceAll(`{${key}}`, value);
    }
    return result as unknown as HKTF.Apply<Template, T>;
  }
  let result = args[0] as string;
  for (const [key, value] of Object.entries(args[1] as Record<string, string>)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result as unknown as HKTF.Apply<Template, T>;
}
