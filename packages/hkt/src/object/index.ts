/**
 * Object/Record HKTFs
 *
 * Type-level operations on object types.
 */

export * from './Assign';
export * from './DeepMerge';
export * from './DeepPartial';
export * from './DeepReadonly';
export * from './DeepRequired';
export * from './Delete';
export * from './Diff';
export * from './Entries';
export * from './Filter';
export * from './Flatten';
export * from './FromEntries';
export * from './Get';
export * from './Has';
export * from './Invert';
export * from './Keys';
export * from './KeysOfType';
export * from './MapKeys';
export * from './MapValues';
export * from './Merge';
export * from './ObjectMap';
export * from './Omit';
export * from './OmitByType';
export * from './Partial';
export * from './Pick';
export * from './PickByType';
export * from './Readonly';
export * from './Rename';
export * from './Required';
export * from './Set';
export * from './Unflatten';
export * from './Update';
export * from './Values';

// Backward compatibility aliases
export type { Entries as EntriesHKTF } from './Entries';
export type { Get as GetHKTF } from './Get';
export type { Keys as KeysHKTF } from './Keys';
export type { MapKeys as MapKeysHKTF } from './MapKeys';
export type { MapValues as MapValuesHKTF } from './MapValues';
export type { Merge as MergeHKTF } from './Merge';
export type { Omit as OmitHKTF } from './Omit';
export type { Pick as PickHKTF } from './Pick';
export type { Set as SetHKTF } from './Set';
export type { Values as ValuesHKTF } from './Values';

