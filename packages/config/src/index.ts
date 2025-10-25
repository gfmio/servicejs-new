/**
 * @servicejs/config
 *
 * Configuration reading, parsing, validation and transformation capability for ServiceJS.
 *
 * This package provides:
 * - **Secret and PII types**: Protect sensitive data from accidental exposure
 * - **Format parsers**: JSON, JSONC, JSON5, YAML, TOML, INI, TypeScript/JavaScript
 * - **Auto-detection**: Automatically detect and parse configuration formats
 * - **Environment variables**: Read and substitute environment variables
 * - **Merging**: Merge and extend configurations with flexible strategies
 * - **Validation**: Schema validation with Zod
 *
 * @example
 * ```typescript
 * import {
 *   Secret,
 *   PII,
 *   parseAuto,
 *   createEnvSubstitution,
 *   merge,
 *   validate,
 * } from '@servicejs/config';
 * import { z } from 'zod';
 *
 * // Protect sensitive data
 * const apiKey = Secret.create('sk-1234567890');
 * const email = PII.create('user@example.com', 'partial');
 *
 * // Parse configuration with auto-detection
 * const result = parseAuto(configString, 'config.yaml');
 *
 * // Substitute environment variables
 * const substitute = createEnvSubstitution();
 * const withEnv = substitute(config);
 *
 * // Merge configurations
 * const merged = merge([baseConfig, envConfig, localConfig]);
 *
 * // Validate configuration
 * const schema = z.object({
 *   port: z.number().int().positive(),
 *   host: z.string(),
 * });
 * const validated = validate(merged, schema);
 * ```
 *
 * @packageDocumentation
 */

// Secret and PII types
export { PII, type RedactionStrategy } from './pii.js';
export { Secret } from './secret.js';

// Types
export type {
  ConfigFormat, ConfigSource, EnvSubstitutionOptions, MergeOptions, MergeStrategy, ParseError,
  Parser
} from './types.js';

// Parsers
export {
  getParser, parseINI, parseJavaScript, parseJSON, parseJSON5, parseJSONC, PARSERS, parseTOML, parseTypeScript, parseYAML
} from './parsers.js';

// Format detection and auto-parsing
export {
  detectFormatFromContent, detectFormatFromPath, parseAuto, parseWithDetection
} from './detect.js';

// Environment variable substitution
export {
  createEnvSubstitution,
  readEnvConfig, substituteEnv, substituteEnvInString
} from './env.js';
export type { EnvSubstitutionError } from './env.js';

// Configuration merging
export {
  deepClone,
  extend, merge, mergeWithEnvironment
} from './merge.js';

// Validation
export {
  coerceFromEnv, createValidator, schemas, validate, validateAndTransform
} from './validation.js';
export type { ValidationError } from './validation.js';

