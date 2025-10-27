/**
 * Cap'n Proto List Upgrade Support
 *
 * Schema evolution support for upgrading primitive lists to struct lists.
 *
 * When a schema changes from List(Primitive) to List(Struct) where the
 * struct has a single field of that primitive type, old messages can be
 * automatically upgraded during deserialization.
 *
 * Example:
 * - Old: List(Int32) = [1, 2, 3]
 * - New: List(Point) where Point { x: Int32 }
 * - Upgrade: [{x: 1}, {x: 2}, {x: 3}]
 */

import type {
  CapnpType,
  CapnpPrimitiveType,
  CapnpSchema,
  CapnpStructType,
  CapnpListType,
} from './types.js';

/**
 * Check if a list type can be upgraded
 *
 * A list can be upgraded if:
 * 1. The expected type is List(Struct)
 * 2. The struct has exactly one field
 * 3. The field type matches the primitive type in the data
 *
 * @param dataElementType - Element type in the encoded data
 * @param schemaElementType - Element type in the schema
 * @returns True if upgrade is possible
 */
export const canUpgradeList = (
  dataElementType: CapnpType,
  schemaElementType: CapnpType
): boolean => {
  // Check if schema expects a struct
  if (typeof schemaElementType !== 'object' || schemaElementType.kind !== 'struct') {
    return false;
  }

  const structType = schemaElementType as CapnpStructType;
  const schema = structType.schema;

  // Struct must have exactly one field
  if (schema.fields.length !== 1) {
    return false;
  }

  const field = schema.fields[0];
  if (!field) {
    return false;
  }

  // Field type must match data element type
  return isTypeCompatible(dataElementType, field.type);
};

/**
 * Check if two types are compatible for upgrading
 *
 * @param dataType - Type in the encoded data
 * @param schemaType - Type in the schema
 * @returns True if types are compatible
 */
const isTypeCompatible = (dataType: CapnpType, schemaType: CapnpType): boolean => {
  // Exact match
  if (dataType === schemaType) {
    return true;
  }

  // Both must be primitives for compatibility
  if (typeof dataType === 'string' && typeof schemaType === 'string') {
    return dataType === schemaType;
  }

  // For list types, check element compatibility
  if (
    typeof dataType === 'object' &&
    'kind' in dataType &&
    dataType.kind === 'list' &&
    typeof schemaType === 'object' &&
    'kind' in schemaType &&
    schemaType.kind === 'list'
  ) {
    const dataList = dataType as CapnpListType;
    const schemaList = schemaType as CapnpListType;
    return isTypeCompatible(dataList.elementType, schemaList.elementType);
  }

  return false;
};

/**
 * Upgrade a primitive value to a struct value
 *
 * Wraps the primitive value in a struct with a single field.
 *
 * @param value - Primitive value
 * @param structSchema - Target struct schema
 * @returns Struct value containing the primitive
 */
export const upgradePrimitiveToStruct = (value: any, structSchema: CapnpSchema): any => {
  if (structSchema.fields.length !== 1) {
    throw new Error('Cannot upgrade to struct with multiple fields');
  }

  const field = structSchema.fields[0];
  if (!field) {
    throw new Error('Cannot upgrade to struct with no fields');
  }

  return {
    [field.name]: value,
  };
};

/**
 * Upgrade a primitive list to a struct list
 *
 * Wraps each primitive value in a struct.
 *
 * @param primitiveList - Array of primitive values
 * @param structSchema - Target struct schema
 * @returns Array of struct values
 */
export const upgradePrimitiveList = (primitiveList: any[], structSchema: CapnpSchema): any[] => {
  return primitiveList.map((value) => upgradePrimitiveToStruct(value, structSchema));
};

/**
 * Detect the actual element type from encoded list data
 *
 * This is a simplified implementation that infers the type from the element size code.
 * A full implementation would need to track the actual encoded type.
 *
 * @param elementSizeCode - Element size code from list pointer
 * @returns Inferred element type
 */
export const inferElementType = (elementSizeCode: number): CapnpType => {
  switch (elementSizeCode) {
    case 0: // Void
      return 'void';
    case 1: // Bit
      return 'bool';
    case 2: // Byte (could be int8 or uint8)
      return 'int8';
    case 3: // Two bytes (could be int16 or uint16)
      return 'int16';
    case 4: // Four bytes (could be int32, uint32, or float32)
      return 'int32';
    case 5: // Eight bytes (could be int64, uint64, or float64)
      return 'int64';
    case 6: // Pointer
      return { kind: 'anyPointer' };
    case 7: // Inline composite (struct)
      // Return a placeholder struct type
      return {
        kind: 'struct',
        schema: {
          name: 'Unknown',
          fields: [],
          dataWordCount: 0,
          pointerCount: 0,
        },
      };
    default:
      return 'void';
  }
};

/**
 * Get the element size code for a type
 *
 * @param elementType - Element type
 * @returns Element size code (0-7)
 */
export const getElementSizeCode = (elementType: CapnpType): number => {
  if (typeof elementType === 'string') {
    const primitiveType = elementType as CapnpPrimitiveType;
    switch (primitiveType) {
      case 'void':
        return 0;
      case 'bool':
        return 1;
      case 'int8':
      case 'uint8':
        return 2;
      case 'int16':
      case 'uint16':
        return 3;
      case 'int32':
      case 'uint32':
      case 'float32':
        return 4;
      case 'int64':
      case 'uint64':
      case 'float64':
        return 5;
      case 'text':
      case 'data':
        return 6; // Pointer
      default:
        return 0;
    }
  } else if (typeof elementType === 'object' && 'kind' in elementType) {
    if (elementType.kind === 'struct') {
      return 7; // Inline composite
    } else if (elementType.kind === 'list' || elementType.kind === 'anyPointer') {
      return 6; // Pointer
    }
  }
  return 0;
};

/**
 * Check if a type is a primitive type
 *
 * @param type - Type to check
 * @returns True if type is primitive
 */
export const isPrimitiveType = (type: CapnpType): boolean => {
  return typeof type === 'string';
};

/**
 * Check if a struct schema is suitable for list upgrade
 *
 * A struct is suitable for upgrade if it has exactly one primitive field.
 *
 * @param schema - Struct schema
 * @returns True if struct can be used for upgrade
 */
export const isUpgradeableStruct = (schema: CapnpSchema): boolean => {
  if (schema.fields.length !== 1) {
    return false;
  }

  const field = schema.fields[0];
  if (!field) {
    return false;
  }

  return isPrimitiveType(field.type);
};
