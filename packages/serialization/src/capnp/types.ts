/**
 * Cap'n Proto Type Definitions
 *
 * Type definitions for Cap'n Proto schemas and serialization.
 */

/**
 * Cap'n Proto primitive types
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
 * Cap'n Proto field definition
 */
export interface CapnpField {
  /** Field name */
  name: string;
  /** Field type */
  type: CapnpPrimitiveType | 'struct';
  /** Field slot/offset */
  slot: number;
  /** Default value */
  defaultValue?: any;
  /** For struct types, the struct schema */
  structSchema?: CapnpSchema;
}

/**
 * Cap'n Proto struct schema
 */
export interface CapnpSchema {
  /** Struct name */
  name: string;
  /** Fields in the struct */
  fields: CapnpField[];
  /** Data section size in words (8 bytes) */
  dataWordCount: number;
  /** Pointer section size in pointers */
  pointerCount: number;
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
