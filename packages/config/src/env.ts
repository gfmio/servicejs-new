import { ok, err, isErr, isOk, type Result } from '@servicejs/result';
import type { EnvSubstitutionOptions } from './types.js';

/**
 * Error type for environment variable substitution failures.
 */
export interface EnvSubstitutionError {
  readonly variable: string;
  readonly message: string;
}

/**
 * Default pattern for environment variable placeholders: ${VAR_NAME} or $VAR_NAME
 */
const DEFAULT_ENV_PATTERN = /\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/g;

/**
 * Substitutes environment variables in a string value.
 *
 * @param value - String containing environment variable placeholders
 * @param getEnv - Function to retrieve environment variable values
 * @param options - Substitution options
 * @returns Result containing substituted string or error
 */
export const substituteEnvInString = (
  value: string,
  getEnv: (name: string) => string | undefined,
  options: EnvSubstitutionOptions = {}
): Result<string, EnvSubstitutionError> => {
  const {
    prefix = '',
    required = false,
    defaults = {},
    pattern = DEFAULT_ENV_PATTERN,
  } = options;

  let result = value;
  const matches = Array.from(value.matchAll(pattern));

  for (const match of matches) {
    const varName = match[1] || match[2]; // ${VAR} or $VAR
    if (!varName) continue; // Skip if no variable name captured

    const fullMatch = match[0];

    // Apply prefix if configured
    const envVarName = prefix + varName;

    // Try to get the value from environment
    let envValue = getEnv(envVarName);

    // Fall back to defaults if not found
    if (envValue === undefined && varName in defaults) {
      envValue = defaults[varName];
    }

    // Handle missing required variables
    if (envValue === undefined && required) {
      return err({
        variable: envVarName,
        message: `Required environment variable '${envVarName}' is not set`,
      });
    }

    // Replace with value or empty string
    result = result.replace(fullMatch, envValue ?? '');
  }

  return ok(result);
};

/**
 * Recursively substitutes environment variables in a configuration object.
 *
 * @param config - Configuration object to process
 * @param getEnv - Function to retrieve environment variable values
 * @param options - Substitution options
 * @returns Result containing processed config or error
 */
export const substituteEnv = (
  config: unknown,
  getEnv: (name: string) => string | undefined,
  options: EnvSubstitutionOptions = {}
): Result<unknown, EnvSubstitutionError> => {
  // Handle null and undefined
  if (config === null || config === undefined) {
    return ok(config);
  }

  // Handle strings
  if (typeof config === 'string') {
    return substituteEnvInString(config, getEnv, options);
  }

  // Handle arrays
  if (Array.isArray(config)) {
    const result: unknown[] = [];
    for (const item of config) {
      const substituted = substituteEnv(item, getEnv, options);
      if (isErr(substituted)) {
        return substituted;
      }
      // TypeScript now knows substituted is Ok
      if (isOk(substituted)) {
        result.push(substituted.value);
      }
    }
    return ok(result);
  }

  // Handle objects
  if (typeof config === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      const substituted = substituteEnv(value, getEnv, options);
      if (isErr(substituted)) {
        return substituted;
      }
      // TypeScript now knows substituted is Ok
      if (isOk(substituted)) {
        result[key] = substituted.value;
      }
    }
    return ok(result);
  }

  // Handle primitives (numbers, booleans, etc.)
  return ok(config);
};

/**
 * Creates a substitution function that uses process.env or Bun.env.
 *
 * @param options - Substitution options
 * @returns Function that performs environment variable substitution
 */
export const createEnvSubstitution = (options: EnvSubstitutionOptions = {}) => {
  const getEnv = (name: string): string | undefined => {
    // Try Bun.env first if available
    if (typeof Bun !== 'undefined' && Bun.env) {
      return Bun.env[name];
    }
    // Fall back to process.env if available
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    return undefined;
  };

  return (config: unknown): Result<unknown, EnvSubstitutionError> => {
    return substituteEnv(config, getEnv, options);
  };
};

/**
 * Reads environment variables into a configuration object.
 * Useful for creating configuration from environment variables only.
 *
 * @param keys - Array of environment variable names to read
 * @param options - Options for reading environment variables
 * @returns Result containing configuration object or error
 */
export const readEnvConfig = (
  keys: string[],
  options: EnvSubstitutionOptions = {}
): Result<Record<string, string>, EnvSubstitutionError> => {
  const { prefix = '', required = false, defaults = {} } = options;

  const getEnv = (name: string): string | undefined => {
    if (typeof Bun !== 'undefined' && Bun.env) {
      return Bun.env[name];
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
    return undefined;
  };

  const result: Record<string, string> = {};

  for (const key of keys) {
    const envVarName = prefix + key;
    let value = getEnv(envVarName);

    // Fall back to defaults
    if (value === undefined && key in defaults) {
      value = defaults[key];
    }

    // Handle missing required variables
    if (value === undefined && required) {
      return err({
        variable: envVarName,
        message: `Required environment variable '${envVarName}' is not set`,
      });
    }

    // Only include defined values
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return ok(result);
};
