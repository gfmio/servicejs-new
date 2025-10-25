import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  detectFormatFromPath,
  detectFormatFromContent,
  parseAuto,
  parseWithDetection,
} from '../src/detect.js';

describe('detectFormatFromPath', () => {
  test('detects JSON format', () => {
    expect(detectFormatFromPath('config.json')).toBe('json');
  });

  test('detects JSONC format', () => {
    expect(detectFormatFromPath('config.jsonc')).toBe('jsonc');
  });

  test('detects JSON5 format', () => {
    expect(detectFormatFromPath('config.json5')).toBe('json5');
  });

  test('detects YAML format from .yaml', () => {
    expect(detectFormatFromPath('config.yaml')).toBe('yaml');
  });

  test('detects YAML format from .yml', () => {
    expect(detectFormatFromPath('config.yml')).toBe('yaml');
  });

  test('detects TOML format', () => {
    expect(detectFormatFromPath('config.toml')).toBe('toml');
  });

  test('detects INI format', () => {
    expect(detectFormatFromPath('config.ini')).toBe('ini');
  });

  test('detects TypeScript format', () => {
    expect(detectFormatFromPath('config.ts')).toBe('typescript');
  });

  test('detects JavaScript format', () => {
    expect(detectFormatFromPath('config.js')).toBe('javascript');
    expect(detectFormatFromPath('config.mjs')).toBe('javascript');
    expect(detectFormatFromPath('config.cjs')).toBe('javascript');
  });

  test('returns undefined for unknown extensions', () => {
    expect(detectFormatFromPath('config.txt')).toBeUndefined();
    expect(detectFormatFromPath('config.xml')).toBeUndefined();
  });

  test('handles paths with directories', () => {
    expect(detectFormatFromPath('/path/to/config.json')).toBe('json');
    expect(detectFormatFromPath('./config/app.yaml')).toBe('yaml');
  });
});

describe('detectFormatFromContent', () => {
  test('detects JSON from content starting with {', () => {
    expect(detectFormatFromContent('{"name": "test"}')).toBe('json');
  });

  test('detects JSON from content starting with [', () => {
    expect(detectFormatFromContent('[1, 2, 3]')).toBe('json');
  });

  test('detects JSONC from comments', () => {
    const content = '{ "name": "test" // comment }';
    expect(detectFormatFromContent(content)).toBe('jsonc');
  });

  test('detects JSON5 from unquoted keys', () => {
    const content = '{ name: "test" }';
    expect(detectFormatFromContent(content)).toBe('json5');
  });

  test('detects YAML from key without value', () => {
    const content = 'name:\nvalue: 42';
    expect(detectFormatFromContent(content)).toBe('yaml');
  });

  test('detects YAML from indentation', () => {
    const content = 'name: test\n  nested: value';
    expect(detectFormatFromContent(content)).toBe('yaml');
  });

  test('detects TOML from section headers', () => {
    const content = '[section]\nkey = value';
    expect(detectFormatFromContent(content)).toBe('toml');
  });

  test('detects JavaScript from export', () => {
    const content = 'export default { name: "test" }';
    expect(detectFormatFromContent(content)).toBe('javascript');
  });

  test('detects TypeScript from type annotations', () => {
    const content = 'const config: Config = { name: "test" }';
    expect(detectFormatFromContent(content)).toBe('typescript');
  });

  test('returns undefined for empty content', () => {
    expect(detectFormatFromContent('')).toBeUndefined();
    expect(detectFormatFromContent('   ')).toBeUndefined();
  });
});

describe('parseWithDetection', () => {
  test('parses JSON when format is detected', () => {
    const result = parseWithDetection('{"name": "test"}');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test' });
      expect(result.format).toBe('json');
    }
  });

  test('tries formats in order when given', () => {
    const content = 'name: test';
    const result = parseWithDetection(content, ['yaml', 'json']);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.format).toBe('yaml');
    }
  });

  test('fails when no format can parse the content', () => {
    const result = parseWithDetection('this is not valid config');
    expect(isErr(result)).toBe(true);
  });
});

describe('parseAuto', () => {
  test('parses JSON content', () => {
    const result = parseAuto('{"name": "test", "value": 42}');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
      expect(result.format).toBe('json');
    }
  });

  test('uses path hint for format detection', () => {
    const result = parseAuto('name: test\nvalue: 42', 'config.yaml');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.format).toBe('yaml');
    }
  });

  test('falls back to content detection when path detection fails', () => {
    const result = parseAuto('{"name": "test"}', 'config.unknown');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.format).toBe('json');
    }
  });

  test('handles YAML content', () => {
    const content = `
name: test
value: 42
nested:
  key: value
`;
    const result = parseAuto(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.format).toBe('yaml');
      expect(result.value).toEqual({
        name: 'test',
        value: 42,
        nested: { key: 'value' },
      });
    }
  });

  test('handles TOML content', () => {
    const content = `
name = "test"
value = 42
`;
    const result = parseAuto(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.format).toBe('toml');
    }
  });
});
