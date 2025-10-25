/**
 * String HKTFs
 *
 * Type-level string manipulation operations.
 * Requires TypeScript 4.1+ for template literal types.
 */

export * from './CamelCase';
export * from './Capitalize';
export * from './CharAt';
export * from './Concat';
export * from './Count';
export * from './EndsWith';
export * from './Extract';
export * from './Includes';
export * from './IndexOf';
export * from './IsEmpty';
export * from './Join';
export * from './KebabCase';
export * from './LastIndexOf';
export * from './Length';
export * from './Lines';
export * from './Match';
export * from './PadEnd';
export * from './PadStart';
export * from './PascalCase';
export * from './RemovePrefix';
export * from './RemoveSuffix';
export * from './Repeat';
export * from './Replace';
export * from './ReplaceAll';
export * from './Reverse';
export * from './Slice';
export * from './SnakeCase';
export * from './Split';
export * from './StartsWith';
export * from './Substring';
export * from './Template';
export * from './ToLower';
export * from './ToUpper';
export * from './Trim';
export * from './TrimEnd';
export * from './TrimStart';
export * from './Truncate';
export * from './Uncapitalize';
export * from './Words';

// Backward compatibility aliases
export type { Capitalize as CapitalizeHKTF } from './Capitalize';
export type { Uncapitalize as UncapitalizeHKTF } from './Uncapitalize';
