import { describe, test, expect } from 'bun:test';
import { isOk, isErr } from '@servicejs/result';
import {
  parseJSON,
  parseJSONC,
  parseJSON5,
  parseYAML,
  parseTOML,
  parseINI,
  parseJavaScript,
  getParser,
} from '../src/parsers.js';

describe('parseJSON', () => {
  test('parses valid JSON', () => {
    const result = parseJSON('{"name": "test", "value": 42}');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });

  test('handles arrays', () => {
    const result = parseJSON('[1, 2, 3]');
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 2, 3]);
    }
  });

  test('fails on invalid JSON', () => {
    const result = parseJSON('{invalid}');
    expect(isErr(result)).toBe(true);
    if (!result.ok) {
      expect(result.error.format).toBe('json');
      expect(result.error.message).toContain('Failed to parse JSON');
    }
  });

  test('fails on comments', () => {
    const result = parseJSON('{"name": "test" /* comment */}');
    expect(isErr(result)).toBe(true);
  });
});

describe('parseJSONC', () => {
  test('parses JSON with single-line comments', () => {
    const content = `{
      // This is a comment
      "name": "test",
      "value": 42
    }`;
    const result = parseJSONC(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });

  test('parses JSON with multi-line comments', () => {
    const content = `{
      /* This is a
         multi-line comment */
      "name": "test"
    }`;
    const result = parseJSONC(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test' });
    }
  });

  test('parses JSON with trailing commas', () => {
    const content = `{
      "name": "test",
      "value": 42,
    }`;
    const result = parseJSONC(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });
});

describe('parseJSON5', () => {
  test('parses JSON5 with unquoted keys', () => {
    const content = `{
      name: "test",
      value: 42
    }`;
    const result = parseJSON5(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });

  test('parses JSON5 with single quotes', () => {
    const content = `{ name: 'test' }`;
    const result = parseJSON5(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test' });
    }
  });

  test('parses JSON5 with trailing commas', () => {
    const content = `{ name: "test", }`;
    const result = parseJSON5(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test' });
    }
  });

  test('parses JSON5 with comments', () => {
    const content = `{
      // Comment
      name: "test" // Another comment
    }`;
    const result = parseJSON5(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test' });
    }
  });
});

describe('parseYAML', () => {
  test('parses valid YAML', () => {
    const content = `
name: test
value: 42
nested:
  key: value
`;
    const result = parseYAML(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'test',
        value: 42,
        nested: { key: 'value' },
      });
    }
  });

  test('parses YAML arrays', () => {
    const content = `
items:
  - one
  - two
  - three
`;
    const result = parseYAML(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        items: ['one', 'two', 'three'],
      });
    }
  });

  test('fails on invalid YAML', () => {
    const content = `
name: test
  invalid indentation
`;
    const result = parseYAML(content);
    expect(isErr(result)).toBe(true);
  });
});

describe('parseTOML', () => {
  test('parses valid TOML', () => {
    const content = `
name = "test"
value = 42

[nested]
key = "value"
`;
    const result = parseTOML(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'test',
        value: 42,
        nested: { key: 'value' },
      });
    }
  });

  test('parses TOML arrays', () => {
    const content = `
items = ["one", "two", "three"]
`;
    const result = parseTOML(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        items: ['one', 'two', 'three'],
      });
    }
  });

  test('fails on invalid TOML', () => {
    const content = `
[invalid
`;
    const result = parseTOML(content);
    expect(isErr(result)).toBe(true);
  });
});

describe('parseINI', () => {
  test('parses valid INI', () => {
    const content = `
name=test
value=42

[section]
key=value
`;
    const result = parseINI(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        name: 'test',
        value: '42',
        section: { key: 'value' },
      });
    }
  });

  test('handles sections', () => {
    const content = `
[database]
host=localhost
port=5432

[server]
port=3000
`;
    const result = parseINI(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        database: { host: 'localhost', port: '5432' },
        server: { port: '3000' },
      });
    }
  });
});

describe('parseJavaScript', () => {
  test('parses module.exports', () => {
    const content = `
module.exports = {
  name: 'test',
  value: 42
};
`;
    const result = parseJavaScript(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });

  test('parses export default', () => {
    const content = `
export default {
  name: 'test',
  value: 42
};
`;
    const result = parseJavaScript(content);
    expect(isOk(result)).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ name: 'test', value: 42 });
    }
  });

  test('fails on syntax errors', () => {
    const content = `
module.exports = {
  invalid syntax here
`;
    const result = parseJavaScript(content);
    expect(isErr(result)).toBe(true);
  });
});

describe('getParser', () => {
  test('returns correct parser for each format', () => {
    expect(getParser('json')).toBe(parseJSON);
    expect(getParser('jsonc')).toBe(parseJSONC);
    expect(getParser('json5')).toBe(parseJSON5);
    expect(getParser('yaml')).toBe(parseYAML);
    expect(getParser('toml')).toBe(parseTOML);
    expect(getParser('ini')).toBe(parseINI);
    expect(getParser('javascript')).toBe(parseJavaScript);
  });
});
