import type { MergeOptions, MergeStrategy } from './types.js';

/**
 * Checks if a value is a plain object (not an array, null, or other special object).
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
};

/**
 * Merges two values according to the specified strategy.
 *
 * @param target - The target value (base configuration)
 * @param source - The source value (override configuration)
 * @param strategy - The merge strategy to use
 * @param mergeArrays - Whether to merge arrays (default: false, replaces instead)
 * @returns The merged value
 */
const mergeValues = (
  target: unknown,
  source: unknown,
  strategy: MergeStrategy,
  mergeArrays: boolean
): unknown => {
  // Always replace if strategy is 'replace'
  if (strategy === 'replace') {
    return source;
  }

  // If source is undefined or null, keep target
  if (source === undefined || source === null) {
    return target;
  }

  // If target is undefined or null, use source
  if (target === undefined || target === null) {
    return source;
  }

  // Handle arrays
  if (Array.isArray(target) && Array.isArray(source)) {
    if (strategy === 'append') {
      return [...target, ...source];
    }
    if (mergeArrays) {
      // Merge arrays element by element
      const result = [...target];
      source.forEach((item, index) => {
        if (index < result.length) {
          result[index] = mergeValues(result[index], item, strategy, mergeArrays);
        } else {
          result.push(item);
        }
      });
      return result;
    }
    // Default: replace
    return source;
  }

  // Handle objects
  if (isPlainObject(target) && isPlainObject(source)) {
    const result: Record<string, unknown> = { ...target };

    for (const [key, sourceValue] of Object.entries(source)) {
      const targetValue = result[key];
      result[key] = mergeValues(targetValue, sourceValue, strategy, mergeArrays);
    }

    return result;
  }

  // For primitives and mixed types, source wins
  return source;
};

/**
 * Merges multiple configuration objects into one.
 *
 * @param configs - Array of configuration objects to merge (later ones override earlier ones)
 * @param options - Merge options
 * @returns The merged configuration object
 *
 * @example
 * ```typescript
 * const base = { a: 1, b: { c: 2 } };
 * const override = { b: { d: 3 }, e: 4 };
 * const result = merge([base, override]);
 * // Result: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 * ```
 */
export const merge = (
  configs: unknown[],
  options: MergeOptions = {}
): unknown => {
  const {
    strategy = 'merge',
    mergeArrays = false,
    customMerge = {},
  } = options;

  if (configs.length === 0) {
    return {};
  }

  if (configs.length === 1) {
    return configs[0];
  }

  let result = configs[0];

  for (let i = 1; i < configs.length; i++) {
    const source = configs[i];

    // Handle custom merge functions for specific keys
    if (isPlainObject(result) && isPlainObject(source)) {
      const merged: Record<string, unknown> = { ...result };

      for (const [key, sourceValue] of Object.entries(source)) {
        const customMergeFn = customMerge[key];
        if (customMergeFn) {
          // Use custom merge function for this key
          merged[key] = customMergeFn(merged[key], sourceValue);
        } else {
          // Use standard merge
          merged[key] = mergeValues(merged[key], sourceValue, strategy, mergeArrays);
        }
      }

      result = merged;
    } else {
      // For non-objects, use standard merge
      result = mergeValues(result, source, strategy, mergeArrays);
    }
  }

  return result;
};

/**
 * Deep clones a configuration object.
 * Useful for creating independent copies before merging.
 *
 * @param config - Configuration object to clone
 * @returns A deep clone of the configuration
 */
export const deepClone = <T>(config: T): T => {
  if (config === null || config === undefined) {
    return config;
  }

  if (typeof config !== 'object') {
    return config;
  }

  if (Array.isArray(config)) {
    return config.map(deepClone) as T;
  }

  if (isPlainObject(config)) {
    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      cloned[key] = deepClone(value);
    }
    return cloned as T;
  }

  // For other object types (Date, RegExp, etc.), return as-is
  // In a production environment, you might want to handle these specially
  return config;
};

/**
 * Extends a base configuration with overrides.
 * This is a convenience function that clones the base before merging.
 *
 * @param base - Base configuration object
 * @param overrides - Configuration overrides
 * @param options - Merge options
 * @returns New configuration object with overrides applied
 *
 * @example
 * ```typescript
 * const base = { port: 3000, host: 'localhost' };
 * const dev = extend(base, { port: 3001 });
 * // base is unchanged, dev = { port: 3001, host: 'localhost' }
 * ```
 */
export const extend = (
  base: unknown,
  overrides: unknown,
  options: MergeOptions = {}
): unknown => {
  const clonedBase = deepClone(base);
  return merge([clonedBase, overrides], options);
};

/**
 * Merges configurations with a common pattern: base -> environment -> local.
 *
 * @param base - Base configuration (always included)
 * @param environment - Environment-specific configuration (optional)
 * @param local - Local overrides (optional, usually from .local files)
 * @param options - Merge options
 * @returns Merged configuration
 *
 * @example
 * ```typescript
 * const config = mergeWithEnvironment(
 *   baseConfig,
 *   process.env.NODE_ENV === 'production' ? prodConfig : devConfig,
 *   localConfig
 * );
 * ```
 */
export const mergeWithEnvironment = (
  base: unknown,
  environment?: unknown,
  local?: unknown,
  options: MergeOptions = {}
): unknown => {
  const configs = [base];

  if (environment !== undefined) {
    configs.push(environment);
  }

  if (local !== undefined) {
    configs.push(local);
  }

  return merge(configs, options);
};
