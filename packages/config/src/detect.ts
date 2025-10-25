import { ok, err, isOk, isErr, type Result } from '@servicejs/result';
import type { ConfigFormat, ParseError } from './types.js';
import { getParser } from './parsers.js';

/**
 * Detects the configuration format based on file extension.
 *
 * @param path - File path to analyze
 * @returns The detected format, or undefined if unknown
 */
export const detectFormatFromPath = (path: string): ConfigFormat | undefined => {
  const extension = path.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'json':
      return 'json';
    case 'jsonc':
      return 'jsonc';
    case 'json5':
      return 'json5';
    case 'yaml':
    case 'yml':
      return 'yaml';
    case 'toml':
      return 'toml';
    case 'ini':
      return 'ini';
    case 'ts':
      return 'typescript';
    case 'js':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    default:
      return undefined;
  }
};

/**
 * Detects the configuration format based on content analysis.
 * Tries to infer the format from the content structure.
 *
 * @param content - Configuration content to analyze
 * @returns The detected format, or undefined if unknown
 */
export const detectFormatFromContent = (content: string): ConfigFormat | undefined => {
  const trimmed = content.trim();

  // Empty content
  if (!trimmed) {
    return undefined;
  }

  // JSON/JSONC/JSON5 - starts with { or [
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    // Check for comments (JSONC/JSON5)
    if (trimmed.includes('//') || trimmed.includes('/*')) {
      // Try to distinguish between JSONC and JSON5
      // JSON5 has more features like unquoted keys, single quotes, trailing commas
      if (
        trimmed.includes("'") ||
        /\w+\s*:/.test(trimmed) || // Unquoted keys
        /,\s*[}\]]/.test(trimmed)   // Trailing commas
      ) {
        return 'json5';
      }
      return 'jsonc';
    }
    return 'json';
  }

  // YAML - common indicators
  const firstLine = trimmed.split('\n')[0];
  if (
    (firstLine && /^\w+:\s*$/.test(firstLine)) || // Key without value on first line
    /^-\s+\w+/.test(trimmed) ||                     // Array item
    trimmed.includes('\n  ') ||                     // Indentation
    /^---/.test(trimmed)                            // Document separator
  ) {
    return 'yaml';
  }

  // TOML - section headers
  if (/^\[\w+\]/.test(trimmed) || /^\[\[/.test(trimmed)) {
    return 'toml';
  }

  // INI - section headers (simpler than TOML)
  if (/^\[\w+\]/.test(trimmed) && !trimmed.includes('[[')) {
    // Could be TOML or INI, prefer INI if no TOML-specific features
    if (!trimmed.includes('[[') && !/\w+\s*=\s*\{/.test(trimmed)) {
      return 'ini';
    }
  }

  // TypeScript/JavaScript - export, module, const, etc.
  if (
    trimmed.includes('export') ||
    trimmed.includes('module.exports') ||
    /^(const|let|var)\s+/.test(trimmed)
  ) {
    // Prefer typescript if it has type annotations
    if (trimmed.includes(': ') && /:\s*\w+/.test(trimmed)) {
      return 'typescript';
    }
    return 'javascript';
  }

  return undefined;
};

/**
 * Attempts to parse content by trying multiple formats in order of likelihood.
 * Returns the first successful parse result.
 *
 * @param content - Configuration content to parse
 * @param preferredFormats - Optional array of formats to try in order
 * @returns Result containing parsed object and detected format, or parse error
 */
export const parseWithDetection = (
  content: string,
  preferredFormats?: ConfigFormat[]
): Result<{ value: unknown; format: ConfigFormat }, ParseError> => {
  // Default order of formats to try
  const formatsToTry: ConfigFormat[] = preferredFormats || [
    'json',
    'jsonc',
    'json5',
    'yaml',
    'toml',
    'ini',
  ];

  const errors: ParseError[] = [];

  // Try each format
  for (const format of formatsToTry) {
    const parser = getParser(format);
    const result = parser(content);

    if (isOk(result)) {
      return ok({ value: result.value, format });
    }
    // Use type guard to access error
    if (isErr(result)) {
      errors.push(result.error);
    }
  }

  // All formats failed
  return err({
    format: 'json', // Default
    message: `Failed to parse configuration with any supported format. Tried: ${formatsToTry.join(', ')}`,
    cause: errors,
  });
};

/**
 * Parses content with automatic format detection.
 * First tries to detect from content, then falls back to trying all formats.
 *
 * @param content - Configuration content to parse
 * @param path - Optional file path for better format detection
 * @returns Result containing parsed object and detected format, or parse error
 */
export const parseAuto = (
  content: string,
  path?: string
): Result<{ value: unknown; format: ConfigFormat }, ParseError> => {
  // Try to detect format from path first
  if (path) {
    const pathFormat = detectFormatFromPath(path);
    if (pathFormat) {
      const parser = getParser(pathFormat);
      const result = parser(content);
      if (isOk(result)) {
        return ok({ value: result.value, format: pathFormat });
      }
      // If path-based detection failed, continue with content detection
    }
  }

  // Try to detect format from content
  const contentFormat = detectFormatFromContent(content);
  if (contentFormat) {
    const parser = getParser(contentFormat);
    const result = parser(content);
    if (isOk(result)) {
      return ok({ value: result.value, format: contentFormat });
    }
  }

  // Fall back to trying all formats
  return parseWithDetection(content);
};
