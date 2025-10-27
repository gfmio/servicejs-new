/**
 * Cap'n Proto Serializer
 *
 * Simplified Cap'n Proto implementation focusing on dynamic schema generation
 * and practical usage for ServiceJS message passing.
 *
 * This implementation provides:
 * - Dynamic schema definition
 * - Runtime serialization/deserialization
 * - Schema compiler for generating TypeScript code
 *
 * Note: This is a simplified implementation. For full Cap'n Proto features,
 * consider using the official capnp-ts library when it matures.
 */

import { ok, err } from '@servicejs/result';
import type { Serializer } from './serializer.js';
import { serializationError } from './serializer.js';
import type {
  CapnpSchema,
  CapnpField,
  CapnpSegment,
  CapnpType,
  CapnpPrimitiveType,
  CapnpListType,
  CapnpStructType,
  CapnpEnumType,
  CapnpUnionType,
  CapnpGroupType,
  CapnpAnyPointerType,
  CapnpConstant,
  CapnpAnnotation,
  TraversalLimits,
} from './capnp/types.js';
import {
  createSegment,
  allocate,
  writeStruct,
  readStruct,
  decodeMessage,
} from './capnp/encoding.js';
import { pack, unpack } from './capnp/packed.js';

export type {
  CapnpSchema,
  CapnpField,
  CapnpType,
  CapnpListType,
  CapnpStructType,
  CapnpEnumType,
  CapnpUnionType,
  CapnpGroupType,
  CapnpAnyPointerType,
  CapnpConstant,
  CapnpAnnotation,
  CapnpGenericParameter,
  TraversalLimits,
  TraversalContext,
  CapnpOrphan,
} from './capnp/types.js';

/**
 * Create a dynamic Cap'n Proto schema
 *
 * @param config - Schema configuration
 * @returns Cap'n Proto schema
 *
 * @example
 * ```typescript
 * const MessageSchema = createCapnpSchema({
 *   name: 'Message',
 *   fields: [
 *     { name: 'id', type: 'uint32', slot: 0 },
 *     { name: 'text', type: 'text', slot: 0 },
 *   ],
 * });
 * ```
 */
/**
 * Helper: Create a list type
 */
export const list = (elementType: CapnpType): CapnpListType => ({
  kind: 'list',
  elementType,
});

/**
 * Helper: Create an enum type
 */
export const enumType = (
  name: string,
  enumerants: Array<{ name: string; value: number }>
): CapnpEnumType => ({
  kind: 'enum',
  name,
  enumerants,
});

/**
 * Helper: Create a struct type reference
 */
export const structType = (schema: CapnpSchema): CapnpStructType => ({
  kind: 'struct',
  schema,
});

/**
 * Helper: Create a union type
 */
export const unionType = (
  name: string | undefined,
  tagSlot: number,
  fields: Array<{ name: string; type: CapnpType; discriminant: number }>
): CapnpUnionType => {
  const result: CapnpUnionType = {
    kind: 'union',
    tagSlot,
    fields,
  };
  if (name !== undefined) {
    result.name = name;
  }
  return result;
};

/**
 * Helper: Create a group type
 *
 * Groups are organizational - fields are laid out directly in parent struct.
 * Groups don't add runtime overhead, just schema organization.
 */
export const groupType = (name: string, fields: CapnpField[]): CapnpGroupType => ({
  kind: 'group',
  name,
  fields,
});

/**
 * Helper: Create an AnyPointer type
 *
 * AnyPointer can hold any pointer type (struct, list, text, data).
 * Useful for generic containers and dynamic typing.
 */
export const anyPointer = (): CapnpAnyPointerType => ({
  kind: 'anyPointer',
});

/**
 * Helper: Create a constant
 */
export const constant = (name: string, type: CapnpType, value: any): CapnpConstant => ({
  name,
  type,
  value,
});

/**
 * Helper: Create an annotation
 */
export const annotation = (
  name: string,
  type: CapnpType,
  targets: Array<'field' | 'struct' | 'enum' | 'union' | 'group' | 'interface' | 'method' | 'param' | 'annotation' | 'const' | 'enumerant'>
): CapnpAnnotation => ({
  name,
  type,
  targets,
});

// Re-export utility functions
export { pack, unpack } from './capnp/packed.js';
export {
  createTraversalContext,
  DEFAULT_TRAVERSAL_LIMITS,
  enterTraversal,
  exitTraversal,
  recordTraversal,
  checkPointerCycle,
  validateStructPointer,
  validateListPointer,
  validateFarPointer,
} from './capnp/security.js';
export {
  canonicalizeMessage,
  isCanonical,
  hashCanonical,
} from './capnp/canonical.js';
export {
  createOrphan,
  adoptOrphan,
  disownData,
  getOrphanSize,
  getOrphanType,
} from './capnp/orphans.js';

export const createCapnpSchema = (config: {
  name: string;
  fields: Array<{
    name: string;
    type: CapnpType;
    slot: number;
    defaultValue?: any;
  }>;
  unions?: CapnpUnionType[];
}): CapnpSchema => {
  // Count data words and pointers
  let dataWordCount = 0;
  let pointerCount = 0;

  const isPointerType = (type: CapnpType): boolean => {
    if (typeof type === 'string') {
      return type === 'text' || type === 'data';
    }
    return type.kind === 'list' || type.kind === 'struct';
  };

  const getDataSize = (type: CapnpType): number => {
    if (typeof type === 'string') {
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
        default:
          return 0;
      }
    }
    if (typeof type === 'object' && type.kind === 'enum') {
      return 2; // uint16
    }
    return 0;
  };

  // Helper to process fields recursively (including group fields)
  const processField = (field: CapnpField) => {
    if (typeof field.type === 'object' && field.type.kind === 'group') {
      // Groups: recursively process their fields
      for (const groupField of field.type.fields) {
        processField(groupField);
      }
    } else if (isPointerType(field.type)) {
      pointerCount = Math.max(pointerCount, field.slot + 1);
    } else {
      // Calculate data word count based on field size
      const fieldSize = getDataSize(field.type);
      const byteOffset = field.slot * fieldSize;
      const wordOffset = Math.ceil((byteOffset + fieldSize) / 8);
      dataWordCount = Math.max(dataWordCount, wordOffset);
    }
  };

  for (const field of config.fields) {
    processField(field);
  }

  // Account for union discriminants
  let discriminantCount = 0;
  if (config.unions && config.unions.length > 0) {
    for (const union of config.unions) {
      discriminantCount++;
      // Union tag takes up 2 bytes (uint16)
      const tagWordOffset = Math.ceil((union.tagSlot * 2 + 2) / 8);
      dataWordCount = Math.max(dataWordCount, tagWordOffset);
    }
  }

  const result: CapnpSchema = {
    name: config.name,
    fields: config.fields,
    dataWordCount,
    pointerCount,
  };

  if (config.unions) {
    result.unions = config.unions;
  }

  if (discriminantCount > 0) {
    result.discriminantCount = discriminantCount;
  }

  return result;
};

/**
 * Cap'n Proto serializer options
 */
export interface CapnpSerializerOptions {
  /**
   * Enable multi-segment messages
   * @default false
   */
  multiSegment?: boolean;

  /**
   * Initial segment size in bytes (for multi-segment mode)
   * @default 8192 (8KB)
   */
  segmentSize?: number;

  /**
   * Enable packed encoding for smaller wire size
   * @default false
   */
  packed?: boolean;

  /**
   * Enable traversal limits for security
   * @default true
   */
  enableTraversalLimits?: boolean;

  /**
   * Custom traversal limits (if enableTraversalLimits is true)
   */
  traversalLimits?: Partial<TraversalLimits>;

  /**
   * Enable canonical form (single segment, deterministic)
   * @default false
   */
  canonical?: boolean;
}

/**
 * Create a Cap'n Proto serializer from a schema
 *
 * @param schema - Cap'n Proto schema
 * @param options - Serializer options
 * @returns Serializer
 *
 * @example
 * ```typescript
 * const schema = createCapnpSchema({
 *   name: 'Person',
 *   fields: [
 *     { name: 'id', type: 'uint32', slot: 0 },
 *     { name: 'name', type: 'text', slot: 0 },
 *     { name: 'age', type: 'uint16', slot: 2 },
 *   ],
 * });
 *
 * const serializer = createCapnpSerializer(schema);
 *
 * const person = { id: 123, name: 'Alice', age: 30 };
 * const encoded = serializer.serialize(person);
 * ```
 */
export const createCapnpSerializer = <T extends Record<string, any>>(
  schema: CapnpSchema,
  options?: CapnpSerializerOptions
): Serializer<T> => {
  const multiSegment = options?.multiSegment ?? false;
  const usePacked = options?.packed ?? false;

  return {
    format: 'capnp',

    serialize(value: T) {
      try {
        // Calculate required size (conservative estimate)
        const dataSize = schema.dataWordCount * 8;
        const pointerSize = schema.pointerCount * 8;
        const headerSize = 8; // segment header
        const structSize = dataSize + pointerSize;

        // Estimate additional space for nested data (strings, lists, structs)
        // Use larger buffer for complex schemas with lists/nested structs
        const hasComplexTypes = schema.fields.some(
          (f) =>
            typeof f.type === 'object' &&
            (f.type.kind === 'list' || f.type.kind === 'struct')
        );
        let additionalSize = hasComplexTypes ? 8192 : 2048; // 8KB for complex, 2KB for simple

        const segment = createSegment(headerSize + structSize + additionalSize);

        // Write segment header (simplified - single segment)
        segment.data.setUint32(0, 0, true); // segment count - 1
        segment.position = 8;

        // Allocate root struct
        const structOffset = allocate(segment, structSize);

        // Write struct using the comprehensive encoding function
        writeStruct(segment, structOffset, schema, value);

        // Update segment size in header
        const totalSize = segment.position;
        segment.data.setUint32(4, Math.ceil(totalSize / 8), true); // segment size in words

        // Extract used portion of segment
        let bytes = new Uint8Array(segment.data.buffer, 0, segment.position);

        // Apply packed encoding if enabled
        if (usePacked) {
          bytes = pack(bytes);
        }

        return ok(bytes);
      } catch (error) {
        return err(
          serializationError(
            `Failed to serialize with Cap'n Proto: ${error instanceof Error ? error.message : String(error)}`,
            'SERIALIZE_FAILED',
            error
          )
        );
      }
    },

    deserialize(data: Uint8Array) {
      try {
        // Unpack if packed encoding was used
        let unpacked = data;
        if (usePacked) {
          unpacked = unpack(data);
        }

        if (multiSegment) {
          // Multi-segment deserialization
          const message = decodeMessage(unpacked);
          const rootSegment = message.segments[0];

          if (!rootSegment) {
            throw new Error('No segments in decoded message');
          }

          // Root struct starts at beginning of first segment
          const result = readStruct(rootSegment, 0, schema);
          return ok(result as T);
        } else {
          // Single-segment deserialization
          const segment: CapnpSegment = {
            data: new DataView(unpacked.buffer, unpacked.byteOffset, unpacked.byteLength),
            position: 0,
          };

          // Root struct starts after header (8 bytes)
          const structOffset = 8;

          // Read struct using the comprehensive decoding function
          const result = readStruct(segment, structOffset, schema);

          return ok(result as T);
        }
      } catch (error) {
        return err(
          serializationError(
            `Failed to deserialize Cap'n Proto data: ${error instanceof Error ? error.message : String(error)}`,
            'DESERIALIZE_FAILED',
            error
          )
        );
      }
    },
  };
};

/**
 * Generate TypeScript code from a Cap'n Proto schema
 *
 * This generates TypeScript interfaces and accessor functions for a schema.
 *
 * @param schema - Cap'n Proto schema
 * @returns Generated TypeScript code
 *
 * @example
 * ```typescript
 * const schema = createCapnpSchema({
 *   name: 'Person',
 *   fields: [
 *     { name: 'id', type: 'uint32', slot: 0 },
 *     { name: 'name', type: 'text', slot: 0 },
 *   ],
 * });
 *
 * const code = generateTypeScriptCode(schema);
 * // Writes to person.capnp.ts
 * ```
 */
export const generateTypeScriptCode = (schema: CapnpSchema): string => {
  const lines: string[] = [];

  // Header
  lines.push('/**');
  lines.push(` * Generated Cap'n Proto code for ${schema.name}`);
  lines.push(' * Do not edit manually');
  lines.push(' */');
  lines.push('');
  lines.push("import { createCapnpSchema, createCapnpSerializer } from '@servicejs/serialization';");
  lines.push('');

  // Interface
  lines.push(`export interface ${schema.name} {`);
  for (const field of schema.fields) {
    const tsType = capnpTypeToTypeScript(field.type);
    lines.push(`  ${field.name}: ${tsType};`);
  }
  lines.push('}');
  lines.push('');

  // Schema
  lines.push(`export const ${schema.name}Schema = createCapnpSchema({`);
  lines.push(`  name: '${schema.name}',`);
  lines.push('  fields: [');
  for (const field of schema.fields) {
    lines.push(`    { name: '${field.name}', type: '${field.type}', slot: ${field.slot} },`);
  }
  lines.push('  ],');
  lines.push('});');
  lines.push('');

  // Serializer
  lines.push(`export const ${schema.name}Serializer = createCapnpSerializer<${schema.name}>(${schema.name}Schema);`);
  lines.push('');

  return lines.join('\n');
};

/**
 * Convert Cap'n Proto type to TypeScript type
 */
const capnpTypeToTypeScript = (type: CapnpType): string => {
  if (typeof type === 'string') {
    switch (type) {
      case 'void':
        return 'null';
      case 'bool':
        return 'boolean';
      case 'int8':
      case 'int16':
      case 'int32':
      case 'int64':
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'float32':
      case 'float64':
        return 'number';
      case 'text':
        return 'string';
      case 'data':
        return 'Uint8Array';
      default:
        return 'unknown';
    }
  }

  if (typeof type === 'object') {
    if (type.kind === 'list') {
      const elementType = capnpTypeToTypeScript(type.elementType);
      return `${elementType}[]`;
    }
    if (type.kind === 'struct') {
      return type.schema.name;
    }
    if (type.kind === 'enum') {
      return type.name;
    }
    if (type.kind === 'union') {
      return type.fields.map((f) => capnpTypeToTypeScript(f.type)).join(' | ');
    }
    if (type.kind === 'group') {
      return 'object';
    }
  }

  return 'unknown';
};

/**
 * Parse a simplified Cap'n Proto schema file
 *
 * This parser handles a simplified subset of Cap'n Proto schema syntax.
 *
 * @param schemaText - Schema file content
 * @returns Parsed schema
 *
 * @example
 * ```capnp
 * struct Person {
 *   id @0 :UInt32;
 *   name @1 :Text;
 *   age @2 :UInt16;
 * }
 * ```
 */
export const parseCapnpSchema = (schemaText: string): CapnpSchema => {
  const lines = schemaText.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

  let structName = '';
  const fields: Array<{
    name: string;
    type: CapnpField['type'];
    slot: number;
  }> = [];

  for (const line of lines) {
    // Parse struct definition
    const structMatch = line.match(/struct\s+(\w+)\s*\{/);
    if (structMatch && structMatch[1]) {
      structName = structMatch[1];
      continue;
    }

    // Parse field definition: name @slot :Type;
    const fieldMatch = line.match(/(\w+)\s+@(\d+)\s*:\s*(\w+);/);
    if (fieldMatch) {
      const name = fieldMatch[1];
      const slotStr = fieldMatch[2];
      const typeStr = fieldMatch[3];

      if (name && slotStr && typeStr) {
        const slot = parseInt(slotStr, 10);
        const type = capnpTypeFromString(typeStr);
        fields.push({ name, type, slot });
      }
    }
  }

  return createCapnpSchema({ name: structName, fields });
};

/**
 * Convert Cap'n Proto type string to internal type
 */
const capnpTypeFromString = (typeStr: string): CapnpType => {
  const normalized = typeStr.toLowerCase();

  const primitiveTypes: Record<string, CapnpPrimitiveType> = {
    void: 'void',
    bool: 'bool',
    int8: 'int8',
    int16: 'int16',
    int32: 'int32',
    int64: 'int64',
    uint8: 'uint8',
    uint16: 'uint16',
    uint32: 'uint32',
    uint64: 'uint64',
    float32: 'float32',
    float64: 'float64',
    text: 'text',
    data: 'data',
  };

  return primitiveTypes[normalized] || 'text';
};
