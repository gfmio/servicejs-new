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
 * Cap'n Proto AnyPointer type (can hold any pointer type)
 */
export interface CapnpAnyPointerType {
  kind: 'anyPointer';
}

/**
 * Cap'n Proto generic parameter reference (e.g., T in struct Foo<T>)
 */
export interface CapnpGenericParameterType {
  kind: 'genericParameter';
  /** Parameter name */
  name: string;
  /** Parameter index */
  index: number;
}

/**
 * Cap'n Proto bound generic type (e.g., List<Int32>)
 */
export interface CapnpBoundGenericType {
  kind: 'boundGeneric';
  /** Base schema with generic parameters */
  schema: CapnpSchema;
  /** Type arguments bound to generic parameters */
  typeArguments: CapnpType[];
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
  | CapnpGroupType
  | CapnpAnyPointerType
  | CapnpGenericParameterType
  | CapnpBoundGenericType;

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
 * Cap'n Proto constant definition
 */
export interface CapnpConstant {
  /** Constant name */
  name: string;
  /** Constant type */
  type: CapnpType;
  /** Constant value */
  value: any;
}

/**
 * Cap'n Proto annotation definition
 */
export interface CapnpAnnotation {
  /** Annotation name */
  name: string;
  /** Annotation type */
  type: CapnpType;
  /** Target types (field, struct, enum, etc.) */
  targets: Array<'field' | 'struct' | 'enum' | 'union' | 'group' | 'interface' | 'method' | 'param' | 'annotation' | 'const' | 'enumerant'>;
}

/**
 * Cap'n Proto generic parameter
 */
export interface CapnpGenericParameter {
  /** Parameter name */
  name: string;
  /** Index in parameter list */
  index: number;
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
  /** Constants defined in this schema */
  constants?: CapnpConstant[];
  /** Annotations on this schema */
  annotations?: Map<string, any>;
  /** Generic parameters */
  genericParameters?: CapnpGenericParameter[];
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

/**
 * Traversal limits for security
 */
export interface TraversalLimits {
  /** Maximum traversal depth (default: 64) */
  maxDepth: number;
  /** Maximum words traversed (default: 8 * 1024 * 1024 = 64MB) */
  maxWords: number;
}

/**
 * Traversal context for tracking limits
 */
export interface TraversalContext {
  /** Current traversal depth */
  depth: number;
  /** Words traversed so far */
  wordsTraversed: number;
  /** Traversal limits */
  limits: TraversalLimits;
  /** Visited pointers (for cycle detection) */
  visited: Set<string>;
}

/**
 * Orphan - detached message data that can be moved between messages
 */
export interface CapnpOrphan {
  /** Segment containing the orphaned data */
  segment: CapnpSegment;
  /** Offset of the orphaned data */
  offset: number;
  /** Size in bytes */
  size: number;
  /** Type of the orphaned data */
  type: CapnpType;
}
