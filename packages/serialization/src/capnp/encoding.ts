/**
 * Cap'n Proto Encoding
 *
 * Complete Cap'n Proto binary format encoding/decoding.
 * Supports primitives, lists, nested structs, unions, enums, and groups.
 */

import type {
  CapnpSchema,
  CapnpSegment,
  CapnpMessage,
  CapnpField,
  CapnpPrimitiveType,
  CapnpType,
  CapnpListType,
  CapnpStructType,
  CapnpEnumType,
  CapnpUnionType,
  CapnpGroupType,
} from './types.js';

/**
 * Cap'n Proto constants
 */
const BYTES_PER_WORD = 8;
const POINTER_SIZE_BYTES = 8;
const DEFAULT_SEGMENT_SIZE = 8192; // 8KB per segment

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
 * Create a new multi-segment message
 */
export const createMessage = (): CapnpMessage => {
  return {
    segments: [createSegment(DEFAULT_SEGMENT_SIZE)],
  };
};

/**
 * Allocate space in a message, potentially creating new segments
 */
export const allocateInMessage = (message: CapnpMessage, sizeInBytes: number): { segmentIndex: number; offset: number } => {
  // Try to allocate in the last segment
  const lastSegmentIndex = message.segments.length - 1;
  const lastSegment = message.segments[lastSegmentIndex];
  const available = lastSegment.data.byteLength - lastSegment.position;

  if (available >= sizeInBytes) {
    // Enough space in current segment
    const offset = lastSegment.position;
    lastSegment.position += sizeInBytes;
    return { segmentIndex: lastSegmentIndex, offset };
  }

  // Need a new segment
  const newSegmentSize = Math.max(DEFAULT_SEGMENT_SIZE, sizeInBytes + 1024);
  const newSegment = createSegment(newSegmentSize);
  message.segments.push(newSegment);
  const offset = 0;
  newSegment.position = sizeInBytes;
  return { segmentIndex: message.segments.length - 1, offset };
};

/**
 * Allocate space in a segment (for single-segment operations)
 */
export const allocate = (segment: CapnpSegment, sizeInBytes: number): number => {
  const offset = segment.position;
  segment.position += sizeInBytes;
  return offset;
};

/**
 * Write a far pointer (points to another segment)
 */
export const writeFarPointer = (
  segment: CapnpSegment,
  offset: number,
  targetSegmentIndex: number,
  targetOffset: number,
  isDoubleFar: boolean = false
): void => {
  const targetWordOffset = targetOffset / BYTES_PER_WORD;
  const value = (targetWordOffset << 3) | (isDoubleFar ? 1 << 2 : 0) | 2; // Type 2 (far pointer)

  segment.data.setUint32(offset, value, true);
  segment.data.setUint32(offset + 4, targetSegmentIndex, true);
};

/**
 * Read a far pointer
 */
export const readFarPointer = (
  segment: CapnpSegment,
  offset: number
): { segmentIndex: number; offset: number; isDoubleFar: boolean } => {
  const word1 = segment.data.getUint32(offset, true);
  const word2 = segment.data.getUint32(offset + 4, true);

  const targetWordOffset = word1 >> 3;
  const isDoubleFar = ((word1 >> 2) & 1) !== 0;
  const segmentIndex = word2;

  return {
    segmentIndex,
    offset: targetWordOffset * BYTES_PER_WORD,
    isDoubleFar,
  };
};

/**
 * Write a struct pointer (within same segment)
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
  if (typeof field.type === 'string') {
    const typeSize = getTypeSize(field.type);
    return field.slot * typeSize;
  } else if (typeof field.type === 'object' && field.type.kind === 'enum') {
    return field.slot * 2; // Enums are uint16
  }
  return field.slot * 8; // Pointers
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

/**
 * Get element size code for list elements
 */
export const getElementSizeCode = (type: CapnpType): number => {
  if (typeof type === 'string') {
    switch (type) {
      case 'void':
        return 0; // void list
      case 'bool':
        return 1; // 1-bit list
      case 'int8':
      case 'uint8':
        return 2; // 1-byte list
      case 'int16':
      case 'uint16':
        return 3; // 2-byte list
      case 'int32':
      case 'uint32':
      case 'float32':
        return 4; // 4-byte list
      case 'int64':
      case 'uint64':
      case 'float64':
        return 5; // 8-byte list
      case 'text':
      case 'data':
        return 6; // pointer list
      default:
        return 0;
    }
  }

  // Complex types
  if (typeof type === 'object' && type.kind === 'struct') {
    return 7; // inline composite
  }
  if (typeof type === 'object' && type.kind === 'list') {
    return 6; // pointer list
  }
  if (typeof type === 'object' && type.kind === 'enum') {
    return 3; // enums are uint16
  }

  return 0;
};

/**
 * Write a list to segment
 */
export const writeList = (
  segment: CapnpSegment,
  elementType: CapnpType,
  elements: any[]
): number => {
  const elementSizeCode = getElementSizeCode(elementType);

  if (typeof elementType === 'string') {
    // Primitive list
    if (elementType === 'text' || elementType === 'data') {
      // List of pointers (text/data)
      const listSize = elements.length * POINTER_SIZE_BYTES;
      const listOffset = allocate(segment, listSize);

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (elementType === 'text') {
          const textOffset = writeText(segment, element);
          const pointerOffset = listOffset + i * POINTER_SIZE_BYTES;
          writeListPointer(segment, pointerOffset, textOffset, element.length + 1, 2);
        }
      }

      return listOffset;
    } else if (elementType === 'bool') {
      // Bit list
      const byteCount = Math.ceil(elements.length / 8);
      const listOffset = allocate(segment, byteCount);

      for (let i = 0; i < elements.length; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        if (elements[i]) {
          const currentByte = segment.data.getUint8(listOffset + byteIndex);
          segment.data.setUint8(listOffset + byteIndex, currentByte | (1 << bitIndex));
        }
      }

      return listOffset;
    } else {
      // Primitive number list
      const elementSize = getTypeSize(elementType);
      const listSize = elements.length * elementSize;
      const listOffset = allocate(segment, listSize);

      for (let i = 0; i < elements.length; i++) {
        writePrimitive(segment, listOffset + i * elementSize, elementType, elements[i]);
      }

      return listOffset;
    }
  } else if (typeof elementType === 'object' && elementType.kind === 'struct') {
    // Struct list (inline composite)
    const schema = elementType.schema;
    const elementSize = (schema.dataWordCount + schema.pointerCount) * BYTES_PER_WORD;

    // Tag word + elements
    const listSize = BYTES_PER_WORD + elements.length * elementSize;
    const listOffset = allocate(segment, listSize);

    // Write tag word (element count + data/pointer sizes)
    const tagValue = (elements.length << 2) | 0; // WirePointer type (struct)
    segment.data.setUint32(listOffset, tagValue, true);
    segment.data.setUint16(listOffset + 4, schema.dataWordCount, true);
    segment.data.setUint16(listOffset + 6, schema.pointerCount, true);

    // Write elements
    for (let i = 0; i < elements.length; i++) {
      const elementOffset = listOffset + BYTES_PER_WORD + i * elementSize;
      writeStruct(segment, elementOffset, schema, elements[i]);
    }

    return listOffset;
  }

  // Default: empty list
  return allocate(segment, 0);
};

/**
 * Read a list from segment
 */
export const readList = (
  segment: CapnpSegment,
  pointerOffset: number,
  elementType: CapnpType
): any[] => {
  const pointer = segment.data.getUint32(pointerOffset, true);
  const pointerType = pointer & 3;

  if (pointerType !== 1) {
    // Not a list pointer
    return [];
  }

  const offset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
  const lengthInfo = segment.data.getUint32(pointerOffset + 4, true);
  const elementSizeCode = lengthInfo & 7;
  const elementCount = lengthInfo >> 3;

  const result: any[] = [];

  if (typeof elementType === 'string') {
    if (elementType === 'text') {
      // List of text pointers
      for (let i = 0; i < elementCount; i++) {
        result.push(readText(segment, offset + i * POINTER_SIZE_BYTES));
      }
    } else if (elementType === 'bool') {
      // Bit list
      for (let i = 0; i < elementCount; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        const byte = segment.data.getUint8(offset + byteIndex);
        result.push((byte & (1 << bitIndex)) !== 0);
      }
    } else {
      // Primitive number list
      const elementSize = getTypeSize(elementType);
      for (let i = 0; i < elementCount; i++) {
        result.push(readPrimitive(segment, offset + i * elementSize, elementType));
      }
    }
  } else if (typeof elementType === 'object' && elementType.kind === 'struct') {
    // Struct list (inline composite)
    const schema = elementType.schema;
    const tagOffset = offset;

    // Read tag word
    const dataWordCount = segment.data.getUint16(tagOffset + 4, true);
    const pointerCount = segment.data.getUint16(tagOffset + 6, true);
    const elementSize = (dataWordCount + pointerCount) * BYTES_PER_WORD;

    for (let i = 0; i < elementCount; i++) {
      const elementOffset = tagOffset + BYTES_PER_WORD + i * elementSize;
      result.push(readStruct(segment, elementOffset, schema));
    }
  }

  return result;
};

/**
 * Write a struct to segment
 */
export const writeStruct = (
  segment: CapnpSegment,
  structOffset: number,
  schema: CapnpSchema,
  value: Record<string, any>
): void => {
  const dataSize = schema.dataWordCount * BYTES_PER_WORD;

  // Handle unions first - write discriminant and determine which field to write
  const activeUnionFields = new Set<string>();

  if (schema.unions) {
    for (const union of schema.unions) {
      // Find which union field is present in the value
      let activeField: typeof union.fields[0] | null = null;

      for (const unionField of union.fields) {
        if (value[unionField.name] !== undefined && value[unionField.name] !== null) {
          activeField = unionField;
          break;
        }
      }

      if (activeField) {
        // Write discriminant
        const discriminantOffset = structOffset + union.tagSlot * 2;
        segment.data.setUint16(discriminantOffset, activeField.discriminant, true);

        // Mark this field as active so we write it below
        activeUnionFields.add(activeField.name);
      } else {
        // Write discriminant 0 (void/unset)
        const discriminantOffset = structOffset + union.tagSlot * 2;
        segment.data.setUint16(discriminantOffset, 0, true);
      }
    }
  }

  for (const field of schema.fields) {
    const fieldValue = value[field.name];

    // Skip union fields that are not active
    if (field.unionIndex !== undefined && !activeUnionFields.has(field.name)) {
      continue;
    }

    if (typeof field.type === 'string') {
      if (field.type === 'text') {
        // Text field
        if (typeof fieldValue === 'string') {
          const encoder = new TextEncoder();
          const byteLength = encoder.encode(fieldValue).length;
          const textOffset = writeText(segment, fieldValue);
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          writeListPointer(segment, pointerOffset, textOffset, byteLength + 1, 2);
        }
      } else if (field.type === 'data') {
        // Data field
        if (fieldValue instanceof Uint8Array) {
          const dataOffset = allocate(segment, fieldValue.length);
          for (let i = 0; i < fieldValue.length; i++) {
            segment.data.setUint8(dataOffset + i, fieldValue[i]);
          }
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          writeListPointer(segment, pointerOffset, dataOffset, fieldValue.length, 2);
        }
      } else {
        // Primitive field
        const offset = structOffset + getFieldOffset(field);
        writePrimitive(segment, offset, field.type, fieldValue ?? field.defaultValue ?? 0);
      }
    } else if (typeof field.type === 'object') {
      if (field.type.kind === 'list') {
        // List field
        if (Array.isArray(fieldValue)) {
          const listOffset = writeList(segment, field.type.elementType, fieldValue);
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          const elementSizeCode = getElementSizeCode(field.type.elementType);
          writeListPointer(segment, pointerOffset, listOffset, fieldValue.length, elementSizeCode);
        }
      } else if (field.type.kind === 'struct') {
        // Nested struct field
        if (fieldValue) {
          const nestedSchema = field.type.schema;
          const nestedSize =
            (nestedSchema.dataWordCount + nestedSchema.pointerCount) * BYTES_PER_WORD;
          const nestedOffset = allocate(segment, nestedSize);
          writeStruct(segment, nestedOffset, nestedSchema, fieldValue);

          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          writeStructPointer(
            segment,
            pointerOffset,
            nestedOffset,
            nestedSchema.dataWordCount,
            nestedSchema.pointerCount
          );
        }
      } else if (field.type.kind === 'enum') {
        // Enum field (stored as uint16)
        const offset = structOffset + getFieldOffset(field);
        const enumValue =
          typeof fieldValue === 'number'
            ? fieldValue
            : field.type.enumerants.find((e) => e.name === fieldValue)?.value ?? 0;
        segment.data.setUint16(offset, enumValue, true);
      } else if (field.type.kind === 'group') {
        // Group field - recursively write group fields
        // Groups are transparent - their fields are laid out in parent struct
        const groupValue = fieldValue ?? {};

        for (const groupField of field.type.fields) {
          const gFieldValue = groupValue[groupField.name];

          if (typeof groupField.type === 'string') {
            if (groupField.type === 'text') {
              // Text field in group
              if (typeof gFieldValue === 'string') {
                const encoder = new TextEncoder();
                const byteLength = encoder.encode(gFieldValue).length;
                const textOffset = writeText(segment, gFieldValue);
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                writeListPointer(segment, pointerOffset, textOffset, byteLength + 1, 2);
              }
            } else if (groupField.type === 'data') {
              // Data field in group
              if (gFieldValue instanceof Uint8Array) {
                const dataOffset = allocate(segment, gFieldValue.length);
                for (let i = 0; i < gFieldValue.length; i++) {
                  segment.data.setUint8(dataOffset + i, gFieldValue[i]);
                }
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                writeListPointer(segment, pointerOffset, dataOffset, gFieldValue.length, 2);
              }
            } else {
              // Primitive field in group
              const offset = structOffset + getFieldOffset(groupField);
              writePrimitive(segment, offset, groupField.type, gFieldValue ?? groupField.defaultValue ?? 0);
            }
          } else if (typeof groupField.type === 'object') {
            // Complex types in group (list, struct, etc.)
            if (groupField.type.kind === 'list') {
              if (Array.isArray(gFieldValue)) {
                const listOffset = writeList(segment, groupField.type.elementType, gFieldValue);
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                const elementSizeCode = getElementSizeCode(groupField.type.elementType);
                writeListPointer(segment, pointerOffset, listOffset, gFieldValue.length, elementSizeCode);
              }
            } else if (groupField.type.kind === 'struct') {
              if (gFieldValue) {
                const nestedSchema = groupField.type.schema;
                const nestedSize = (nestedSchema.dataWordCount + nestedSchema.pointerCount) * BYTES_PER_WORD;
                const nestedOffset = allocate(segment, nestedSize);
                writeStruct(segment, nestedOffset, nestedSchema, gFieldValue);
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                writeStructPointer(
                  segment,
                  pointerOffset,
                  nestedOffset,
                  nestedSchema.dataWordCount,
                  nestedSchema.pointerCount
                );
              }
            } else if (groupField.type.kind === 'enum') {
              const offset = structOffset + getFieldOffset(groupField);
              const enumValue =
                typeof gFieldValue === 'number'
                  ? gFieldValue
                  : groupField.type.enumerants.find((e) => e.name === gFieldValue)?.value ?? 0;
              segment.data.setUint16(offset, enumValue, true);
            }
          }
        }
      }
    }
  }
};

/**
 * Read a struct from segment
 */
export const readStruct = (
  segment: CapnpSegment,
  structOffset: number,
  schema: CapnpSchema
): Record<string, any> => {
  const result: Record<string, any> = {};
  const dataSize = schema.dataWordCount * BYTES_PER_WORD;

  // Handle unions first - read discriminant to determine which field is active
  const activeUnionFields = new Set<string>();

  if (schema.unions) {
    for (const union of schema.unions) {
      // Read discriminant
      const discriminantOffset = structOffset + union.tagSlot * 2;
      const discriminant = segment.data.getUint16(discriminantOffset, true);

      // Find the active field
      const activeField = union.fields.find((f) => f.discriminant === discriminant);

      if (activeField) {
        activeUnionFields.add(activeField.name);
      }
    }
  }

  for (const field of schema.fields) {
    // Skip union fields that are not active
    if (field.unionIndex !== undefined && !activeUnionFields.has(field.name)) {
      continue;
    }

    if (typeof field.type === 'string') {
      if (field.type === 'text') {
        // Text field
        const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
        try {
          result[field.name] = readText(segment, pointerOffset);
        } catch {
          result[field.name] = field.defaultValue ?? '';
        }
      } else if (field.type === 'data') {
        // Data field
        try {
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          const pointer = segment.data.getUint32(pointerOffset, true);
          const offset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
          const lengthInfo = segment.data.getUint32(pointerOffset + 4, true);
          const byteCount = lengthInfo >> 3;
          const bytes = new Uint8Array(byteCount);
          for (let i = 0; i < byteCount; i++) {
            bytes[i] = segment.data.getUint8(offset + i);
          }
          result[field.name] = bytes;
        } catch {
          result[field.name] = field.defaultValue ?? new Uint8Array(0);
        }
      } else {
        // Primitive field
        const offset = structOffset + getFieldOffset(field);
        const value = readPrimitive(segment, offset, field.type);
        // Apply default value if field is zero/false and has a default
        const isZeroValue =
          value === 0 ||
          value === false ||
          value === null ||
          value === undefined;
        if (field.defaultValue !== undefined && isZeroValue) {
          result[field.name] = field.defaultValue;
        } else {
          result[field.name] = value;
        }
      }
    } else if (typeof field.type === 'object') {
      if (field.type.kind === 'list') {
        // List field
        try {
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          result[field.name] = readList(segment, pointerOffset, field.type.elementType);
        } catch {
          result[field.name] = field.defaultValue ?? [];
        }
      } else if (field.type.kind === 'struct') {
        // Nested struct field
        try {
          const pointerOffset = structOffset + dataSize + field.slot * POINTER_SIZE_BYTES;
          const pointer = segment.data.getUint32(pointerOffset, true);
          const nestedOffset =
            pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
          result[field.name] = readStruct(segment, nestedOffset, field.type.schema);
        } catch {
          result[field.name] = field.defaultValue ?? null;
        }
      } else if (field.type.kind === 'enum') {
        // Enum field
        const offset = structOffset + getFieldOffset(field);
        const enumValue = segment.data.getUint16(offset, true);
        const enumerant = field.type.enumerants.find((e) => e.value === enumValue);
        result[field.name] = enumerant?.name ?? enumValue;
      } else if (field.type.kind === 'group') {
        // Group field - recursively read group fields
        // Groups are transparent - their fields are laid out in parent struct
        const groupResult: Record<string, any> = {};

        for (const groupField of field.type.fields) {
          if (typeof groupField.type === 'string') {
            if (groupField.type === 'text') {
              // Text field in group
              const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
              try {
                groupResult[groupField.name] = readText(segment, pointerOffset);
              } catch {
                groupResult[groupField.name] = groupField.defaultValue ?? '';
              }
            } else if (groupField.type === 'data') {
              // Data field in group
              try {
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                const pointer = segment.data.getUint32(pointerOffset, true);
                const offset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
                const lengthInfo = segment.data.getUint32(pointerOffset + 4, true);
                const byteCount = lengthInfo >> 3;
                const bytes = new Uint8Array(byteCount);
                for (let i = 0; i < byteCount; i++) {
                  bytes[i] = segment.data.getUint8(offset + i);
                }
                groupResult[groupField.name] = bytes;
              } catch {
                groupResult[groupField.name] = groupField.defaultValue ?? new Uint8Array(0);
              }
            } else {
              // Primitive field in group
              const offset = structOffset + getFieldOffset(groupField);
              const value = readPrimitive(segment, offset, groupField.type);
              const isZeroValue =
                value === 0 ||
                value === false ||
                value === null ||
                value === undefined;
              if (groupField.defaultValue !== undefined && isZeroValue) {
                groupResult[groupField.name] = groupField.defaultValue;
              } else {
                groupResult[groupField.name] = value;
              }
            }
          } else if (typeof groupField.type === 'object') {
            // Complex types in group
            if (groupField.type.kind === 'list') {
              try {
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                groupResult[groupField.name] = readList(segment, pointerOffset, groupField.type.elementType);
              } catch {
                groupResult[groupField.name] = groupField.defaultValue ?? [];
              }
            } else if (groupField.type.kind === 'struct') {
              try {
                const pointerOffset = structOffset + dataSize + groupField.slot * POINTER_SIZE_BYTES;
                const pointer = segment.data.getUint32(pointerOffset, true);
                const nestedOffset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
                groupResult[groupField.name] = readStruct(segment, nestedOffset, groupField.type.schema);
              } catch {
                groupResult[groupField.name] = groupField.defaultValue ?? null;
              }
            } else if (groupField.type.kind === 'enum') {
              const offset = structOffset + getFieldOffset(groupField);
              const enumValue = segment.data.getUint16(offset, true);
              const enumerant = groupField.type.enumerants.find((e) => e.value === enumValue);
              groupResult[groupField.name] = enumerant?.name ?? enumValue;
            }
          }
        }
        result[field.name] = groupResult;
      }
    }
  }

  return result;
};

/**
 * Encode a multi-segment message to Uint8Array
 */
export const encodeMessage = (message: CapnpMessage): Uint8Array => {
  const segmentCount = message.segments.length;

  // Calculate header size
  const headerWords = 1 + segmentCount; // segment count word + size words
  const headerSize = headerWords * 4; // 4 bytes per word
  const headerPadding = headerSize % 8 === 0 ? 0 : 4; // Pad to 8-byte boundary
  const totalHeaderSize = headerSize + headerPadding;

  // Calculate total size
  let totalSize = totalHeaderSize;
  const segmentSizes: number[] = [];
  for (const segment of message.segments) {
    segmentSizes.push(segment.position);
    totalSize += segment.position;
  }

  // Create output buffer
  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);

  // Write header
  view.setUint32(0, segmentCount - 1, true); // Segment count minus 1
  for (let i = 0; i < segmentCount; i++) {
    const sizeInWords = Math.ceil(segmentSizes[i] / BYTES_PER_WORD);
    view.setUint32(4 + i * 4, sizeInWords, true);
  }

  // Copy segment data
  let offset = totalHeaderSize;
  for (const segment of message.segments) {
    const segmentData = new Uint8Array(segment.data.buffer, 0, segment.position);
    output.set(segmentData, offset);
    offset += segment.position;
  }

  return output;
};

/**
 * Decode a multi-segment message from Uint8Array
 */
export const decodeMessage = (data: Uint8Array): CapnpMessage => {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  // Read header
  const segmentCountMinus1 = view.getUint32(0, true);
  const segmentCount = segmentCountMinus1 + 1;

  // Read segment sizes
  const segmentSizes: number[] = [];
  for (let i = 0; i < segmentCount; i++) {
    const sizeInWords = view.getUint32(4 + i * 4, true);
    segmentSizes.push(sizeInWords * BYTES_PER_WORD);
  }

  // Calculate header size with padding
  const headerWords = 1 + segmentCount;
  const headerSize = headerWords * 4;
  const headerPadding = headerSize % 8 === 0 ? 0 : 4;
  const totalHeaderSize = headerSize + headerPadding;

  // Create segments
  const segments: CapnpSegment[] = [];
  let offset = totalHeaderSize;
  for (let i = 0; i < segmentCount; i++) {
    const segmentSize = segmentSizes[i];
    const segmentData = new DataView(data.buffer, data.byteOffset + offset, segmentSize);
    segments.push({
      data: segmentData,
      position: segmentSize, // Position at end since it's already populated
    });
    offset += segmentSize;
  }

  return { segments };
};
