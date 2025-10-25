/**
 * @servicejs/core - URN (Uniform Resource Name)
 *
 * URNs provide unique identifiers for components, primarily for debugging and tracing.
 * They are NOT used for component lookup - that would violate the capability model.
 *
 * Format: urn:namespace:id
 * Example: urn:app:counter-123
 */

import { ok, err, isErr, type Result } from '@servicejs/result';

/**
 * A Uniform Resource Name (URN) for identifying components.
 *
 * URNs are used for:
 * - Debugging and tracing
 * - Logging and observability
 * - Human-readable component identification
 *
 * URNs are NOT used for:
 * - Component lookup (use capabilities instead)
 * - Security decisions
 * - Message routing
 *
 * @example
 * ```typescript
 * const urn = createURN('app', 'counter-123');
 * console.log(urn.toString()); // 'urn:app:counter-123'
 * ```
 */
export interface URN {
  /**
   * The namespace part of the URN (e.g., 'app', 'system')
   */
  readonly namespace: string;

  /**
   * The identifier part of the URN (e.g., 'counter-123')
   */
  readonly id: string;

  /**
   * Convert URN to string representation
   */
  toString(): string;
}

/**
 * Error types for URN operations
 */
export type URNError =
  | { readonly type: 'INVALID_FORMAT'; readonly urn: string; readonly message: string }
  | { readonly type: 'EMPTY_NAMESPACE'; readonly message: string }
  | { readonly type: 'EMPTY_ID'; readonly message: string }
  | { readonly type: 'INVALID_CHARACTERS'; readonly field: 'namespace' | 'id'; readonly value: string };

/**
 * Create a URN from namespace and id.
 *
 * @param namespace - The namespace (e.g., 'app', 'system')
 * @param id - The unique identifier within the namespace
 * @returns A URN object
 *
 * @example
 * ```typescript
 * const urn = createURN('app', 'counter-123');
 * console.log(urn.namespace); // 'app'
 * console.log(urn.id); // 'counter-123'
 * console.log(urn.toString()); // 'urn:app:counter-123'
 * ```
 */
export function createURN(namespace: string, id: string): URN {
  return {
    namespace,
    id,
    toString(): string {
      return `urn:${namespace}:${id}`;
    },
  };
}

/**
 * Validate URN components.
 *
 * Valid namespace and id:
 * - Non-empty
 * - Alphanumeric, hyphens, underscores, dots
 * - No colons (reserved as separator)
 *
 * @param namespace - The namespace to validate
 * @param id - The id to validate
 * @returns Ok if valid, Err with details if invalid
 */
export function validateURN(namespace: string, id: string): Result<void, URNError> {
  if (!namespace || namespace.trim() === '') {
    return err({ type: 'EMPTY_NAMESPACE', message: 'Namespace cannot be empty' });
  }

  if (!id || id.trim() === '') {
    return err({ type: 'EMPTY_ID', message: 'ID cannot be empty' });
  }

  // Check for invalid characters (no colons allowed as they're the separator)
  const validPattern = /^[a-zA-Z0-9\-_.]+$/;

  if (!validPattern.test(namespace)) {
    return err({
      type: 'INVALID_CHARACTERS',
      field: 'namespace',
      value: namespace,
    });
  }

  if (!validPattern.test(id)) {
    return err({
      type: 'INVALID_CHARACTERS',
      field: 'id',
      value: id,
    });
  }

  return ok(undefined);
}

/**
 * Create a URN with validation.
 *
 * @param namespace - The namespace
 * @param id - The unique identifier
 * @returns Ok with URN if valid, Err if invalid
 *
 * @example
 * ```typescript
 * const result = safeCreateURN('app', 'counter-123');
 * if (result.ok) {
 *   console.log(result.value.toString());
 * } else {
 *   console.error('Invalid URN:', result.error);
 * }
 * ```
 */
export function safeCreateURN(namespace: string, id: string): Result<URN, URNError> {
  const validation = validateURN(namespace, id);
  if (isErr(validation)) {
    return validation as Result<URN, URNError>;
  }

  return ok(createURN(namespace, id));
}

/**
 * Parse a URN string.
 *
 * @param urnString - The URN string to parse (e.g., 'urn:app:counter-123')
 * @returns Ok with parsed URN if valid, Err if invalid format
 *
 * @example
 * ```typescript
 * const result = parseURN('urn:app:counter-123');
 * if (result.ok) {
 *   console.log(result.value.namespace); // 'app'
 *   console.log(result.value.id); // 'counter-123'
 * }
 * ```
 */
export function parseURN(urnString: string): Result<URN, URNError> {
  const match = urnString.match(/^urn:([^:]+):(.+)$/);

  if (!match) {
    return err({
      type: 'INVALID_FORMAT',
      urn: urnString,
      message: 'URN must be in format "urn:namespace:id"',
    });
  }

  const [, namespace, id] = match;

  return safeCreateURN(namespace!, id!);
}

/**
 * Check if two URNs are equal.
 *
 * @param a - First URN
 * @param b - Second URN
 * @returns True if URNs are equal
 *
 * @example
 * ```typescript
 * const urn1 = createURN('app', 'counter-1');
 * const urn2 = createURN('app', 'counter-1');
 * const urn3 = createURN('app', 'counter-2');
 *
 * console.log(equalURN(urn1, urn2)); // true
 * console.log(equalURN(urn1, urn3)); // false
 * ```
 */
export function equalURN(a: URN, b: URN): boolean {
  return a.namespace === b.namespace && a.id === b.id;
}
