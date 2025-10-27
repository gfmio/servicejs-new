/**
 * Cap'n Proto Generics
 *
 * Support for generic types (parameterized types) in Cap'n Proto.
 *
 * Generics allow schemas to be parameterized over types, enabling
 * reusable data structures like Box<T>, Result<T, E>, etc.
 */

import type {
  CapnpType,
  CapnpSchema,
  CapnpField,
  CapnpGenericParameterType,
  CapnpBoundGenericType,
  CapnpStructType,
  CapnpListType,
  CapnpUnionType,
  CapnpGroupType,
} from './types.js';

/**
 * Create a generic parameter type reference
 *
 * @param name - Parameter name
 * @param index - Parameter index
 * @returns Generic parameter type
 */
export const genericParameter = (name: string, index: number): CapnpGenericParameterType => ({
  kind: 'genericParameter',
  name,
  index,
});

/**
 * Bind generic parameters to create a concrete type
 *
 * @param schema - Generic schema
 * @param typeArguments - Type arguments for generic parameters
 * @returns Bound generic type
 */
export const bindGeneric = (
  schema: CapnpSchema,
  typeArguments: CapnpType[]
): CapnpBoundGenericType => {
  // Validate that type arguments match generic parameters
  const paramCount = schema.genericParameters?.length ?? 0;
  if (typeArguments.length !== paramCount) {
    throw new Error(
      `Schema ${schema.name} expects ${paramCount} type arguments, got ${typeArguments.length}`
    );
  }

  return {
    kind: 'boundGeneric',
    schema,
    typeArguments,
  };
};

/**
 * Substitute generic parameters in a type
 *
 * Replaces generic parameter references with concrete types.
 *
 * @param type - Type to substitute in
 * @param substitutions - Map from parameter index to concrete type
 * @returns Type with substitutions applied
 */
export const substituteType = (
  type: CapnpType,
  substitutions: Map<number, CapnpType>
): CapnpType => {
  // Handle generic parameter reference
  if (typeof type === 'object' && 'kind' in type && type.kind === 'genericParameter') {
    const param = type as CapnpGenericParameterType;
    const substitution = substitutions.get(param.index);
    if (substitution) {
      return substitution;
    }
    return type;
  }

  // Handle list types
  if (typeof type === 'object' && 'kind' in type && type.kind === 'list') {
    const listType = type as CapnpListType;
    return {
      kind: 'list',
      elementType: substituteType(listType.elementType, substitutions),
    };
  }

  // Handle struct types
  if (typeof type === 'object' && 'kind' in type && type.kind === 'struct') {
    const structType = type as CapnpStructType;
    return {
      kind: 'struct',
      schema: substituteSchema(structType.schema, substitutions),
    };
  }

  // Handle union types
  if (typeof type === 'object' && 'kind' in type && type.kind === 'union') {
    const unionType = type as CapnpUnionType;
    const result: CapnpUnionType = {
      kind: 'union',
      tagSlot: unionType.tagSlot,
      fields: unionType.fields.map((field) => ({
        ...field,
        type: substituteType(field.type, substitutions),
      })),
    };
    if (unionType.name !== undefined) {
      result.name = unionType.name;
    }
    return result;
  }

  // Handle group types
  if (typeof type === 'object' && 'kind' in type && type.kind === 'group') {
    const groupType = type as CapnpGroupType;
    return {
      kind: 'group',
      name: groupType.name,
      fields: groupType.fields.map((field) => ({
        ...field,
        type: substituteType(field.type, substitutions),
      })),
    };
  }

  // Handle bound generic types (recursively substitute)
  if (typeof type === 'object' && 'kind' in type && type.kind === 'boundGeneric') {
    const boundType = type as CapnpBoundGenericType;
    return {
      kind: 'boundGeneric',
      schema: boundType.schema,
      typeArguments: boundType.typeArguments.map((arg) => substituteType(arg, substitutions)),
    };
  }

  // All other types (primitives, enums, anyPointer) are unchanged
  return type;
};

/**
 * Substitute generic parameters in a schema
 *
 * @param schema - Schema to substitute in
 * @param substitutions - Map from parameter index to concrete type
 * @returns Schema with substitutions applied
 */
export const substituteSchema = (
  schema: CapnpSchema,
  substitutions: Map<number, CapnpType>
): CapnpSchema => {
  const result: CapnpSchema = {
    ...schema,
    fields: schema.fields.map((field) => substituteField(field, substitutions)),
  };
  if (schema.unions !== undefined) {
    result.unions = schema.unions.map((union) =>
      substituteType(union, substitutions)
    ) as CapnpUnionType[];
  }
  return result;
};

/**
 * Substitute generic parameters in a field
 *
 * @param field - Field to substitute in
 * @param substitutions - Map from parameter index to concrete type
 * @returns Field with substitutions applied
 */
export const substituteField = (
  field: CapnpField,
  substitutions: Map<number, CapnpType>
): CapnpField => {
  return {
    ...field,
    type: substituteType(field.type, substitutions),
  };
};

/**
 * Instantiate a generic schema with concrete type arguments
 *
 * @param schema - Generic schema
 * @param typeArguments - Type arguments for generic parameters
 * @returns Instantiated schema with substitutions applied
 */
export const instantiateGeneric = (
  schema: CapnpSchema,
  typeArguments: CapnpType[]
): CapnpSchema => {
  const paramCount = schema.genericParameters?.length ?? 0;
  if (typeArguments.length !== paramCount) {
    throw new Error(
      `Schema ${schema.name} expects ${paramCount} type arguments, got ${typeArguments.length}`
    );
  }

  // Build substitution map
  const substitutions = new Map<number, CapnpType>();
  if (schema.genericParameters) {
    schema.genericParameters.forEach((_param, index) => {
      substitutions.set(index, typeArguments[index]!);
    });
  }

  // Apply substitutions
  return substituteSchema(schema, substitutions);
};

/**
 * Check if a type is generic (contains generic parameter references)
 *
 * @param type - Type to check
 * @returns True if type contains generic parameters
 */
export const isGenericType = (type: CapnpType): boolean => {
  if (typeof type === 'object' && 'kind' in type) {
    if (type.kind === 'genericParameter') {
      return true;
    }
    if (type.kind === 'list') {
      return isGenericType((type as CapnpListType).elementType);
    }
    if (type.kind === 'struct') {
      return isGenericSchema((type as CapnpStructType).schema);
    }
    if (type.kind === 'union') {
      return (type as CapnpUnionType).fields.some((field) => isGenericType(field.type));
    }
    if (type.kind === 'group') {
      return (type as CapnpGroupType).fields.some((field) => isGenericType(field.type));
    }
    if (type.kind === 'boundGeneric') {
      return (type as CapnpBoundGenericType).typeArguments.some((arg) => isGenericType(arg));
    }
  }
  return false;
};

/**
 * Check if a schema is generic (has generic parameters or fields)
 *
 * @param schema - Schema to check
 * @returns True if schema is generic
 */
export const isGenericSchema = (schema: CapnpSchema): boolean => {
  if (schema.genericParameters && schema.genericParameters.length > 0) {
    return true;
  }
  return schema.fields.some((field) => isGenericType(field.type));
};

/**
 * Validate a bound generic type
 *
 * Ensures that type arguments match the constraints of generic parameters.
 *
 * @param boundType - Bound generic type to validate
 * @throws Error if validation fails
 */
export const validateBoundGeneric = (boundType: CapnpBoundGenericType): void => {
  const paramCount = boundType.schema.genericParameters?.length ?? 0;
  if (boundType.typeArguments.length !== paramCount) {
    throw new Error(
      `Schema ${boundType.schema.name} expects ${paramCount} type arguments, got ${boundType.typeArguments.length}`
    );
  }

  // Additional validation could be added here for type constraints
  // (e.g., ensuring type arguments satisfy bounds like "T extends Struct")
};
