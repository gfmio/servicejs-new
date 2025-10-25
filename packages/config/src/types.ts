import type { Result } from '@servicejs/result';

/**
 * Supported configuration file formats.
 */
export type ConfigFormat =
  | 'json'
  | 'jsonc'
  | 'json5'
  | 'yaml'
  | 'toml'
  | 'ini'
  | 'typescript'
  | 'javascript';

/**
 * Parse error that includes format information.
 */
export interface ParseError {
  readonly format: ConfigFormat;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Parser function that converts a string to a configuration object.
 */
export type Parser = (content: string) => Result<unknown, ParseError>;

/**
 * Configuration merge strategy.
 */
export type MergeStrategy =
  | 'replace'      // Replace with new value
  | 'merge'        // Deep merge objects, replace primitives
  | 'append';      // Append to arrays, merge objects, replace primitives

/**
 * Options for merging configurations.
 */
export interface MergeOptions {
  /** Strategy for merging values */
  readonly strategy?: MergeStrategy;
  /** Whether to merge arrays (default: false, replaces instead) */
  readonly mergeArrays?: boolean;
  /** Custom merge function for specific keys */
  readonly customMerge?: Record<string, (a: unknown, b: unknown) => unknown>;
}

/**
 * Environment variable substitution options.
 */
export interface EnvSubstitutionOptions {
  /** Prefix for environment variables (e.g., 'APP_') */
  readonly prefix?: string;
  /** Whether to fail if an environment variable is not found */
  readonly required?: boolean;
  /** Default values for missing environment variables */
  readonly defaults?: Record<string, string>;
  /** Pattern to match environment variable placeholders (default: ${VAR_NAME}) */
  readonly pattern?: RegExp;
}

/**
 * Configuration source descriptor.
 */
export interface ConfigSource {
  /** Content of the configuration */
  readonly content: string;
  /** Format of the configuration */
  readonly format: ConfigFormat;
  /** Optional path for error messages */
  readonly path?: string;
}
