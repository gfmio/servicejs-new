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
import type { CapnpSchema, CapnpField, CapnpSegment } from './capnp/types.js';
import {
  createSegment,
  allocate,
  writePrimitive,
  readPrimitive,
  writeText,
  readText,
  getFieldOffset,
  writeListPointer,
} from './capnp/encoding.js';

export type { CapnpSchema, CapnpField } from './capnp/types.js';

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
export const createCapnpSchema = (config: {
  name: string;
  fields: Array<{
    name: string;
    type: CapnpField['type'];
    slot: number;
    defaultValue?: any;
    structSchema?: CapnpSchema;
  }>;
}): CapnpSchema => {
  // Count data words and pointers
  let dataWordCount = 0;
  let pointerCount = 0;

  for (const field of config.fields) {
    if (field.type === 'text' || field.type === 'data' || field.type === 'struct') {
      pointerCount = Math.max(pointerCount, field.slot + 1);
    } else {
      // Calculate data word count based on field size
      const slotEnd = field.slot + 1;
      dataWordCount = Math.max(dataWordCount, slotEnd);
    }
  }

  return {
    name: config.name,
    fields: config.fields,
    dataWordCount,
    pointerCount,
  };
};

/**
 * Create a Cap'n Proto serializer from a schema
 *
 * @param schema - Cap'n Proto schema
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
  schema: CapnpSchema
): Serializer<T> => {
  return {
    format: 'capnp',

    serialize(value: T) {
      try {
        // Calculate required size
        const dataSize = schema.dataWordCount * 8;
        const pointerSize = schema.pointerCount * 8;
        const headerSize = 8; // segment header
        const structSize = dataSize + pointerSize;

        // Estimate text size
        let textSize = 0;
        for (const field of schema.fields) {
          if (field.type === 'text' && typeof value[field.name] === 'string') {
            textSize += value[field.name].length + 8; // text + padding
          }
        }

        const segment = createSegment(headerSize + structSize + textSize + 128);

        // Write segment header (simplified - single segment)
        segment.data.setUint32(0, 0, true); // segment count - 1
        segment.data.setUint32(4, (structSize + textSize + 128) / 8, true); // segment size in words
        segment.position = 8;

        // Allocate root struct
        const structOffset = allocate(segment, structSize);

        // Write data section
        for (const field of schema.fields) {
          const fieldValue = value[field.name];

          if (field.type === 'text') {
            // Write text field
            if (typeof fieldValue === 'string') {
              // Encode to get actual byte length (important for multi-byte UTF-8)
              const encoder = new TextEncoder();
              const byteLength = encoder.encode(fieldValue).length;
              const textOffset = writeText(segment, fieldValue);
              const pointerOffset = structOffset + dataSize + field.slot * 8;
              writeListPointer(segment, pointerOffset, textOffset, byteLength + 1, 2); // byte list
            }
          } else if (field.type !== 'struct') {
            // Write primitive field
            const offset = structOffset + getFieldOffset(field);
            writePrimitive(segment, offset, field.type, fieldValue ?? field.defaultValue ?? 0);
          }
        }

        // Extract used portion of segment
        const bytes = new Uint8Array(segment.data.buffer, 0, segment.position);
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
        const segment: CapnpSegment = {
          data: new DataView(data.buffer, data.byteOffset, data.byteLength),
          position: 0,
        };

        // Read segment header
        // const segmentCount = segment.data.getUint32(0, true) + 1;
        // const segmentSize = segment.data.getUint32(4, true);

        // Root struct starts after header
        const structOffset = 8;
        const dataSize = schema.dataWordCount * 8;

        const result: any = {};

        // Read fields
        for (const field of schema.fields) {
          if (field.type === 'text') {
            // Read text field
            const pointerOffset = structOffset + dataSize + field.slot * 8;
            try {
              result[field.name] = readText(segment, pointerOffset);
            } catch {
              result[field.name] = field.defaultValue ?? '';
            }
          } else if (field.type !== 'struct') {
            // Read primitive field
            const offset = structOffset + getFieldOffset(field);
            result[field.name] = readPrimitive(segment, offset, field.type);
          }
        }

        return ok(result as T);
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
const capnpTypeToTypeScript = (type: CapnpField['type']): string => {
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
    case 'struct':
      return 'object';
    default:
      return 'unknown';
  }
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
const capnpTypeFromString = (typeStr: string): CapnpField['type'] => {
  const normalized = typeStr.toLowerCase();

  const typeMap: Record<string, CapnpField['type']> = {
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

  return typeMap[normalized] || 'text';
};
