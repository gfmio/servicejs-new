/**
 * Cap'n Proto TypeScript Code Generator
 *
 * Generates optimized TypeScript classes from Cap'n Proto schemas
 * for direct memory access without runtime interpretation.
 */

import type { CapnpSchema, CapnpType, CapnpPrimitiveType } from './capnp/types.js';

/**
 * Generate TypeScript code for a Cap'n Proto schema
 */
export function generateCapnpClass(schema: CapnpSchema): string {
  const className = schema.name;
  const dataWords = schema.dataWordCount;
  const pointerCount = schema.pointerCount;

  // Collect nested struct types for imports
  const nestedTypes = new Set<string>();
  for (const field of schema.fields) {
    if (typeof field.type === 'object') {
      if (field.type.kind === 'struct') {
        nestedTypes.add(field.type.schema.name);
      } else if (field.type.kind === 'list' && typeof field.type.elementType === 'object' && field.type.elementType.kind === 'struct') {
        nestedTypes.add(field.type.elementType.schema.name);
      }
    }
  }

  let code = `
// Generated Cap'n Proto TypeScript class
// Schema: ${className}
// Data words: ${dataWords}, Pointer count: ${pointerCount}

import type { CapnpSegment } from '../capnp/types.js';
import {
  allocate,
  writeText,
  readText,
  writeListPointer,
  readList as readListGeneric,
  writeList,
  writeStructPointer,
  getElementSizeCode
} from '../capnp/encoding.js';`;

  // Add imports for nested struct types
  if (nestedTypes.size > 0) {
    code += '\n';
    for (const nestedType of nestedTypes) {
      code += `import { ${nestedType} } from './${nestedType}.js';\n`;
    }
  }

  code += `
const BYTES_PER_WORD = 8;
const POINTER_SIZE_BYTES = 8;

export class ${className} {
  // Cached offsets for performance
  private readonly dataSize: number;
  private readonly pointerSection: number;

  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {
    this.dataSize = ${dataWords} * BYTES_PER_WORD;
    this.pointerSection = offset + this.dataSize;
  }

  // Getters and Setters
`;

  // Generate getters and setters for each field
  for (const field of schema.fields) {
    code += generateFieldAccessors(className, field, dataWords);
  }

  // Generate static serialize method
  code += generateSerializeMethod(className, schema);

  // Generate static deserialize method
  code += generateDeserializeMethod(className, schema);

  code += `}\n`;

  return code;
}

function generateFieldAccessors(className: string, field: any, dataWords: number): string {
  const fieldName = field.name;
  const fieldType = field.type;

  if (typeof fieldType === 'string') {
    if (fieldType === 'text') {
      // Text field (pointer) - optimized with cached offsets
      return `
  get ${fieldName}(): string {
    const pointerOffset = this.pointerSection + ${field.slot} * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set ${fieldName}(value: string) {
    const pointerOffset = this.pointerSection + ${field.slot} * POINTER_SIZE_BYTES;
    const { offset: textOffset, byteLength } = writeText(this.segment, value);
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }
`;
    } else {
      // Primitive field
      const { getter, setter, defaultValue } = getPrimitiveAccessors(fieldType, field.slot);
      return `
  get ${fieldName}(): ${getTypeScriptType(fieldType)} {
    ${getter}
  }

  set ${fieldName}(value: ${getTypeScriptType(fieldType)}) {
    ${setter}
  }
`;
    }
  } else if (fieldType.kind === 'list') {
    // List field - optimized with cached offsets
    const elementType = fieldType.elementType;
    const tsType = getTypeScriptType(elementType);
    return `
  get ${fieldName}(): ${tsType}[] {
    const pointerOffset = this.pointerSection + ${field.slot} * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, ${JSON.stringify(elementType)});
  }

  set ${fieldName}(value: ${tsType}[]) {
    // List writing will be handled in serialize method
  }
`;
  } else if (fieldType.kind === 'struct') {
    // Nested struct field - optimized with cached offsets
    const nestedClassName = fieldType.schema.name;
    return `
  get ${fieldName}(): ${nestedClassName} | null {
    const pointerOffset = this.pointerSection + ${field.slot} * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 0) return null; // Not a struct pointer
    const targetOffset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
    return new ${nestedClassName}(this.segment, targetOffset);
  }
`;
  }

  return '';
}

function getPrimitiveAccessors(type: string, byteOffset: number): {
  getter: string;
  setter: string;
  defaultValue: string;
} {
  // Use DataView directly - V8 is well-optimized for this
  switch (type) {
    case 'bool':
      return {
        getter: `return this.segment.data.getUint8(this.offset + ${byteOffset}) !== 0;`,
        setter: `this.segment.data.setUint8(this.offset + ${byteOffset}, value ? 1 : 0);`,
        defaultValue: 'false',
      };
    case 'uint8':
      return {
        getter: `return this.segment.data.getUint8(this.offset + ${byteOffset});`,
        setter: `this.segment.data.setUint8(this.offset + ${byteOffset}, value);`,
        defaultValue: '0',
      };
    case 'uint16':
      return {
        getter: `return this.segment.data.getUint16(this.offset + ${byteOffset}, true);`,
        setter: `this.segment.data.setUint16(this.offset + ${byteOffset}, value, true);`,
        defaultValue: '0',
      };
    case 'uint32':
      return {
        getter: `return this.segment.data.getUint32(this.offset + ${byteOffset}, true);`,
        setter: `this.segment.data.setUint32(this.offset + ${byteOffset}, value, true);`,
        defaultValue: '0',
      };
    case 'uint64':
    case 'int64':
    case 'float64':
      return {
        getter: `return this.segment.data.getFloat64(this.offset + ${byteOffset}, true);`,
        setter: `this.segment.data.setFloat64(this.offset + ${byteOffset}, value, true);`,
        defaultValue: '0',
      };
    case 'float32':
      return {
        getter: `return this.segment.data.getFloat32(this.offset + ${byteOffset}, true);`,
        setter: `this.segment.data.setFloat32(this.offset + ${byteOffset}, value, true);`,
        defaultValue: '0',
      };
    case 'int32':
      return {
        getter: `return this.segment.data.getInt32(this.offset + ${byteOffset}, true);`,
        setter: `this.segment.data.setInt32(this.offset + ${byteOffset}, value, true);`,
        defaultValue: '0',
      };
    default:
      return {
        getter: `return 0;`,
        setter: `// Unknown type`,
        defaultValue: '0',
      };
  }
}

function getTypeScriptType(type: CapnpType): string {
  if (typeof type === 'string') {
    switch (type) {
      case 'bool':
        return 'boolean';
      case 'text':
        return 'string';
      case 'data':
        return 'Uint8Array';
      case 'float32':
      case 'float64':
      case 'int8':
      case 'int16':
      case 'int32':
      case 'int64':
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
        return 'number';
      default:
        return 'any';
    }
  } else if (typeof type === 'object') {
    if (type.kind === 'list') {
      return `${getTypeScriptType(type.elementType)}[]`;
    } else if (type.kind === 'struct') {
      return type.schema.name;
    }
  }
  return 'any';
}

function generateSerializeMethod(className: string, schema: CapnpSchema): string {
  const dataSize = schema.dataWordCount * 8;
  const pointerSize = schema.pointerCount * 8;
  const totalSize = dataSize + pointerSize;

  let code = `
  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, ${totalSize});
    const instance = new ${className}(segment, structOffset);

`;

  // Write each field
  for (const field of schema.fields) {
    const fieldName = field.name;
    const fieldType = field.type;

    if (typeof fieldType === 'string') {
      if (fieldType === 'text') {
        code += `    if (value.${fieldName} !== undefined && value.${fieldName} !== null) {\n`;
        code += `      instance.${fieldName} = value.${fieldName};\n`;
        code += `    }\n`;
      } else {
        code += `    if (value.${fieldName} !== undefined) {\n`;
        code += `      instance.${fieldName} = value.${fieldName};\n`;
        code += `    }\n`;
      }
    } else if (typeof fieldType === 'object' && fieldType.kind === 'list') {
      // Lists need special handling
      const elementType = fieldType.elementType;
      if (typeof elementType === 'string') {
        // Primitive list
        code += `    if (Array.isArray(value.${fieldName})) {\n`;
        code += `      const listOffset = writeList(segment, ${JSON.stringify(elementType)}, value.${fieldName});\n`;
        code += `      const pointerOffset = structOffset + ${dataSize} + ${field.slot} * POINTER_SIZE_BYTES;\n`;
        code += `      const elementSizeCode = getElementSizeCode(${JSON.stringify(elementType)});\n`;
        code += `      writeListPointer(segment, pointerOffset, listOffset, value.${fieldName}.length, elementSizeCode);\n`;
        code += `    }\n`;
      } else if (typeof elementType === 'object' && elementType.kind === 'struct') {
        // Struct list
        const nestedSchema = elementType.schema;
        code += `    if (Array.isArray(value.${fieldName})) {\n`;
        code += `      const listOffset = writeList(segment, { kind: 'struct', schema: ${nestedSchema.name}Schema }, value.${fieldName});\n`;
        code += `      const pointerOffset = structOffset + ${dataSize} + ${field.slot} * POINTER_SIZE_BYTES;\n`;
        code += `      writeListPointer(segment, pointerOffset, listOffset, value.${fieldName}.length, 7);\n`;
        code += `    }\n`;
      } else if (typeof elementType === 'object' && elementType.kind === 'list') {
        // List of lists (nested list)
        code += `    if (Array.isArray(value.${fieldName})) {\n`;
        code += `      const listOffset = writeList(segment, ${JSON.stringify(elementType)}, value.${fieldName});\n`;
        code += `      const pointerOffset = structOffset + ${dataSize} + ${field.slot} * POINTER_SIZE_BYTES;\n`;
        code += `      writeListPointer(segment, pointerOffset, listOffset, value.${fieldName}.length, 6);\n`;
        code += `    }\n`;
      }
    } else if (typeof fieldType === 'object' && fieldType.kind === 'struct') {
      // Nested struct
      const nestedSchema = fieldType.schema;
      code += `    if (value.${fieldName}) {\n`;
      code += `      const nestedOffset = ${nestedSchema.name}.serialize(segment, value.${fieldName});\n`;
      code += `      const pointerOffset = structOffset + ${dataSize} + ${field.slot} * POINTER_SIZE_BYTES;\n`;
      code += `      writeStructPointer(segment, pointerOffset, nestedOffset, ${nestedSchema.dataWordCount}, ${nestedSchema.pointerCount});\n`;
      code += `    }\n`;
    }
  }

  code += `
    return structOffset;
  }
`;

  return code;
}

function generateDeserializeMethod(className: string, schema: CapnpSchema): string {
  // TRUE ZERO-COPY: Return wrapper class directly, not plain object
  // Users can access fields as needed without deserializing everything upfront
  let code = `
  static deserialize(segment: CapnpSegment, offset: number): ${className} {
    return new ${className}(segment, offset);
  }

  // Helper method for compatibility - converts to plain object
  toObject(): any {
    return {
`;

  for (const field of schema.fields) {
    const fieldType = field.type;

    // Check if this is a nested struct that needs recursive deserialization
    if (typeof fieldType === 'object' && fieldType.kind === 'struct') {
      const nestedClassName = fieldType.schema.name;
      code += `      ${field.name}: this.${field.name}?.toObject() ?? null,\n`;
    } else {
      code += `      ${field.name}: this.${field.name},\n`;
    }
  }

  code += `    };
  }
`;

  return code;
}
