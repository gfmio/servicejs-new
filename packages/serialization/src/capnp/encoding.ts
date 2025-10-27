/**
 * Cap'n Proto Encoding
 *
 * Core Cap'n Proto binary format encoding/decoding.
 */

import type { CapnpSchema, CapnpSegment, CapnpField, CapnpPrimitiveType } from './types.js';

/**
 * Cap'n Proto constants
 */
const BYTES_PER_WORD = 8;
const POINTER_SIZE_BYTES = 8;

/**
 * Create a new Cap'n Proto segment
 */
export const createSegment = (sizeInBytes: number): CapnpSegment => {
  return {
    data: new DataView(new ArrayBuffer(sizeInBytes)),
    position: 0,
  };
};

/**
 * Allocate space in a segment
 */
export const allocate = (segment: CapnpSegment, sizeInBytes: number): number => {
  const offset = segment.position;
  segment.position += sizeInBytes;
  return offset;
};

/**
 * Write a struct pointer
 */
export const writeStructPointer = (
  segment: CapnpSegment,
  offset: number,
  targetOffset: number,
  dataWords: number,
  pointers: number
): void => {
  const pointerOffset = (targetOffset - offset - POINTER_SIZE_BYTES) / BYTES_PER_WORD;
  const value = (pointerOffset << 2) | 0; // Type A (struct pointer)

  segment.data.setUint32(offset, value, true);
  segment.data.setUint16(offset + 4, dataWords, true);
  segment.data.setUint16(offset + 6, pointers, true);
};

/**
 * Write a text/data pointer
 */
export const writeListPointer = (
  segment: CapnpSegment,
  offset: number,
  targetOffset: number,
  elementCount: number,
  elementSize: number
): void => {
  const pointerOffset = (targetOffset - offset - POINTER_SIZE_BYTES) / BYTES_PER_WORD;
  const value = (pointerOffset << 2) | 1; // Type B (list pointer)

  segment.data.setUint32(offset, value, true);
  segment.data.setUint32(offset + 4, (elementCount << 3) | elementSize, true);
};

/**
 * Write a primitive field value
 */
export const writePrimitive = (
  segment: CapnpSegment,
  offset: number,
  type: CapnpPrimitiveType,
  value: any
): void => {
  switch (type) {
    case 'bool':
      segment.data.setUint8(offset, value ? 1 : 0);
      break;
    case 'int8':
      segment.data.setInt8(offset, value);
      break;
    case 'int16':
      segment.data.setInt16(offset, value, true);
      break;
    case 'int32':
      segment.data.setInt32(offset, value, true);
      break;
    case 'uint8':
      segment.data.setUint8(offset, value);
      break;
    case 'uint16':
      segment.data.setUint16(offset, value, true);
      break;
    case 'uint32':
      segment.data.setUint32(offset, value, true);
      break;
    case 'float32':
      segment.data.setFloat32(offset, value, true);
      break;
    case 'float64':
      segment.data.setFloat64(offset, value, true);
      break;
    case 'int64':
    case 'uint64':
      // Simplified: use float64 for 64-bit integers (loses precision for large values)
      segment.data.setFloat64(offset, value, true);
      break;
  }
};

/**
 * Read a primitive field value
 */
export const readPrimitive = (
  segment: CapnpSegment,
  offset: number,
  type: CapnpPrimitiveType
): any => {
  switch (type) {
    case 'bool':
      return segment.data.getUint8(offset) !== 0;
    case 'int8':
      return segment.data.getInt8(offset);
    case 'int16':
      return segment.data.getInt16(offset, true);
    case 'int32':
      return segment.data.getInt32(offset, true);
    case 'uint8':
      return segment.data.getUint8(offset);
    case 'uint16':
      return segment.data.getUint16(offset, true);
    case 'uint32':
      return segment.data.getUint32(offset, true);
    case 'float32':
      return segment.data.getFloat32(offset, true);
    case 'float64':
      return segment.data.getFloat64(offset, true);
    case 'int64':
    case 'uint64':
      // Simplified: use float64 for 64-bit integers
      return segment.data.getFloat64(offset, true);
    case 'void':
      return null;
    default:
      return null;
  }
};

/**
 * Write text to segment
 */
export const writeText = (segment: CapnpSegment, text: string): number => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const offset = allocate(segment, bytes.length + 1); // +1 for null terminator

  for (let i = 0; i < bytes.length; i++) {
    segment.data.setUint8(offset + i, bytes[i]);
  }
  segment.data.setUint8(offset + bytes.length, 0); // null terminator

  // Align to word boundary
  const padding = (BYTES_PER_WORD - ((bytes.length + 1) % BYTES_PER_WORD)) % BYTES_PER_WORD;
  allocate(segment, padding);

  return offset;
};

/**
 * Read text from segment
 */
export const readText = (segment: CapnpSegment, pointerOffset: number): string => {
  const pointer = segment.data.getUint32(pointerOffset, true);
  const offset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
  const lengthInfo = segment.data.getUint32(pointerOffset + 4, true);
  const elementCount = lengthInfo >> 3;

  const bytes = new Uint8Array(elementCount - 1); // -1 for null terminator
  for (let i = 0; i < elementCount - 1; i++) {
    bytes[i] = segment.data.getUint8(offset + i);
  }

  return new TextDecoder().decode(bytes);
};

/**
 * Get field offset in data section
 */
export const getFieldOffset = (field: CapnpField): number => {
  const typeSize = getTypeSize(field.type);
  return field.slot * typeSize;
};

/**
 * Get size in bytes for a type
 */
export const getTypeSize = (type: CapnpPrimitiveType | 'struct'): number => {
  switch (type) {
    case 'void':
      return 0;
    case 'bool':
    case 'int8':
    case 'uint8':
      return 1;
    case 'int16':
    case 'uint16':
      return 2;
    case 'int32':
    case 'uint32':
    case 'float32':
      return 4;
    case 'int64':
    case 'uint64':
    case 'float64':
      return 8;
    case 'text':
    case 'data':
    case 'struct':
      return 8; // pointer
    default:
      return 0;
  }
};
