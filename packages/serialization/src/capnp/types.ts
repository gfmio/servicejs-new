/**
 * Cap'n Proto Type Definitions
 *
 * Complete type definitions for Cap'n Proto schemas and serialization.
 */

/**
 * Cap'n Proto primitive scalar types
 */
export type CapnpPrimitiveType =
  | 'void'
  | 'bool'
  | 'int8'
  | 'int16'
  | 'int32'
  | 'int64'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'float32'
  | 'float64'
  | 'text'
  | 'data';

/**
 * Cap'n Proto list type
 */
export interface CapnpListType {
  kind: 'list';
  /** Element type */
  elementType: CapnpType;
}

/**
 * Cap'n Proto enum type
 */
export interface CapnpEnumType {
  kind: 'enum';
  /** Enum name */
  name: string;
  /** Enum values */
  enumerants: Array<{ name: string; value: number }>;
}

/**
 * Cap'n Proto struct type
 */
export interface CapnpStructType {
  kind: 'struct';
  /** Struct schema */
  schema: CapnpSchema;
}

/**
 * Cap'n Proto union field
 */
export interface CapnpUnionField {
  /** Field name */
  name: string;
  /** Field type */
  type: CapnpType;
  /** Discriminant value */
  discriminant: number;
}

/**
 * Cap'n Proto union type
 */
export interface CapnpUnionType {
  kind: 'union';
  /** Union name (optional, can be anonymous) */
  name?: string;
  /** Tag slot (which slot holds the discriminant) */
  tagSlot: number;
  /** Union fields */
  fields: CapnpUnionField[];
}

/**
 * Cap'n Proto group type (inline struct)
 */
export interface CapnpGroupType {
  kind: 'group';
  /** Group name */
  name: string;
  /** Group fields */
  fields: CapnpField[];
}

/**
 * Complete Cap'n Proto type
 */
export type CapnpType =
  | CapnpPrimitiveType
  | CapnpListType
  | CapnpEnumType
  | CapnpStructType
  | CapnpUnionType
  | CapnpGroupType;

/**
 * Cap'n Proto field definition
 */
export interface CapnpField {
  /** Field name */
  name: string;
  /** Field type */
  type: CapnpType;
  /** Field slot/offset */
  slot: number;
  /** Default value */
  defaultValue?: any;
  /** Whether this field is part of a union */
  unionIndex?: number;
  /** Discriminant value (for union fields) */
  discriminant?: number;
}

/**
 * Cap'n Proto struct schema
 */
export interface CapnpSchema {
  /** Struct name */
  name: string;
  /** Fields in the struct */
  fields: CapnpField[];
  /** Unions in the struct */
  unions?: CapnpUnionType[];
  /** Data section size in words (8 bytes) */
  dataWordCount: number;
  /** Pointer section size in pointers */
  pointerCount: number;
  /** Discriminant count (for unions) */
  discriminantCount?: number;
}

/**
 * Cap'n Proto segment
 */
export interface CapnpSegment {
  /** Segment data */
  data: DataView;
  /** Current write position in bytes */
  position: number;
}

/**
 * Cap'n Proto message
 */
export interface CapnpMessage {
  /** Message segments */
  segments: CapnpSegment[];
}
