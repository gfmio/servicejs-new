import { ok, err, type Result } from '@servicejs/result';
import { parse as parseYAMLLib } from 'yaml';
import { parse as parseTOMLLib } from 'smol-toml';
import { parse as parseINILib } from 'ini';
import { parse as parseJSONCLib } from 'jsonc-parser';
import JSON5 from 'json5';
import type { ParseError, Parser, ConfigFormat } from './types.js';

/**
 * Creates a ParseError with the given format and error details.
 */
const createParseError = (
  format: ConfigFormat,
  error: unknown
): ParseError => {
  const message =
    error instanceof Error ? error.message : String(error);
  return {
    format,
    message: `Failed to parse ${format.toUpperCase()}: ${message}`,
    cause: error,
  };
};

/**
 * Parser for standard JSON format.
 *
 * @param content - JSON string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseJSON: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const parsed = JSON.parse(content);
    return ok(parsed);
  } catch (error) {
    return err(createParseError('json', error));
  }
};

/**
 * Parser for JSON with Comments (JSONC) format.
 * Supports single-line (//) and multi-line (/* *\/) comments.
 *
 * @param content - JSONC string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseJSONC: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const errors: any[] = [];
    const parsed = parseJSONCLib(content, errors, {
      allowTrailingComma: true,
    });

    if (errors.length > 0) {
      return err(createParseError('jsonc', errors[0]));
    }

    return ok(parsed);
  } catch (error) {
    return err(createParseError('jsonc', error));
  }
};

/**
 * Parser for JSON5 format.
 * Supports comments, trailing commas, unquoted keys, single quotes, and more.
 *
 * @param content - JSON5 string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseJSON5: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const parsed = JSON5.parse(content);
    return ok(parsed);
  } catch (error) {
    return err(createParseError('json5', error));
  }
};

/**
 * Parser for YAML format.
 *
 * @param content - YAML string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseYAML: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const parsed = parseYAMLLib(content);
    return ok(parsed);
  } catch (error) {
    return err(createParseError('yaml', error));
  }
};

/**
 * Parser for TOML format.
 *
 * @param content - TOML string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseTOML: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const parsed = parseTOMLLib(content);
    return ok(parsed);
  } catch (error) {
    return err(createParseError('toml', error));
  }
};

/**
 * Parser for INI format.
 *
 * @param content - INI string to parse
 * @returns Result containing parsed object or parse error
 */
export const parseINI: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    const parsed = parseINILib(content);
    return ok(parsed);
  } catch (error) {
    return err(createParseError('ini', error));
  }
};

/**
 * Parser for TypeScript/JavaScript configuration files.
 * Evaluates the code and returns the default export or module.exports.
 *
 * SECURITY WARNING: This uses eval and should only be used with trusted configuration files.
 * Consider using a sandboxed environment for untrusted inputs.
 *
 * @param content - TypeScript/JavaScript code to evaluate
 * @returns Result containing parsed object or parse error
 */
export const parseTypeScript: Parser = (content: string): Result<unknown, ParseError> => {
  try {
    // This is a simplified implementation
    // In a production environment, you'd want to use a proper TypeScript compiler
    // or a sandboxed evaluation environment

    // Remove TypeScript-specific syntax (basic stripping)
    const jsContent = content
      .replace(/export\s+default\s+/g, 'module.exports = ')
      .replace(/export\s+(const|let|var)\s+/g, '$1 ')
      .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
      .replace(/interface\s+\w+\s*{[^}]*}/g, '')
      .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');

    // Create a module context
    const module = { exports: {} };
    const exports = module.exports;

    // Evaluate the code
    const func = new Function('module', 'exports', jsContent);
    func(module, exports);

    // Return the exported value
    const result = module.exports;
    return ok(result);
  } catch (error) {
    return err(createParseError('typescript', error));
  }
};

/**
 * Alias for parseTypeScript - they're handled the same way.
 */
export const parseJavaScript: Parser = parseTypeScript;

/**
 * Map of format names to their corresponding parsers.
 */
export const PARSERS: Record<ConfigFormat, Parser> = {
  json: parseJSON,
  jsonc: parseJSONC,
  json5: parseJSON5,
  yaml: parseYAML,
  toml: parseTOML,
  ini: parseINI,
  typescript: parseTypeScript,
  javascript: parseJavaScript,
};

/**
 * Gets the appropriate parser for a given format.
 *
 * @param format - The configuration format
 * @returns The parser function for the format
 */
export const getParser = (format: ConfigFormat): Parser => {
  return PARSERS[format];
};
