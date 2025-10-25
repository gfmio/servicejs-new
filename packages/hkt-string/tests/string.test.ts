import { describe, it, expect } from 'bun:test';
import { HKTF } from '@servicejs/hkt-core';
import * as StringHKTF from '../src/index.js';

describe('StringHKTF', () => {
  describe('Concat', () => {
    it('should concatenate two strings', () => {
      type Result = HKTF.Apply<
        StringHKTF.Concat,
        { str1: 'Hello'; str2: ' World' }
      >;

      const result: Result = 'Hello World';
      expect(result).toBe('Hello World');
    });
  });

  describe('Split', () => {
    it('should split string by delimiter', () => {
      type Result = HKTF.Apply<
        StringHKTF.Split,
        { str: 'a,b,c'; delimiter: ',' }
      >;

      const result: Result = ['a', 'b', 'c'];
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle single element', () => {
      type Result = HKTF.Apply<
        StringHKTF.Split,
        { str: 'hello'; delimiter: ',' }
      >;

      const result: Result = ['hello'];
      expect(result).toEqual(['hello']);
    });
  });

  describe('Join', () => {
    it('should join strings with delimiter', () => {
      type Result = HKTF.Apply<
        StringHKTF.Join,
        { strings: readonly ['a', 'b', 'c']; delimiter: '-' }
      >;

      const result: Result = 'a-b-c';
      expect(result).toBe('a-b-c');
    });

    it('should handle empty array', () => {
      type Result = HKTF.Apply<
        StringHKTF.Join,
        { strings: readonly []; delimiter: ',' }
      >;

      const result: Result = '';
      expect(result).toBe('');
    });
  });

  describe('ToUpper', () => {
    it('should convert to uppercase', () => {
      type Result = HKTF.Apply<StringHKTF.ToUpper, { str: 'hello' }>;

      const result: Result = 'HELLO';
      expect(result).toBe('HELLO');
    });
  });

  describe('ToLower', () => {
    it('should convert to lowercase', () => {
      type Result = HKTF.Apply<StringHKTF.ToLower, { str: 'HELLO' }>;

      const result: Result = 'hello';
      expect(result).toBe('hello');
    });
  });

  describe('StartsWith', () => {
    it('should return true if starts with prefix', () => {
      type Result = HKTF.Apply<
        StringHKTF.StartsWith,
        { str: 'hello world'; prefix: 'hello' }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false if does not start with prefix', () => {
      type Result = HKTF.Apply<
        StringHKTF.StartsWith,
        { str: 'hello world'; prefix: 'world' }
      >;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('EndsWith', () => {
    it('should return true if ends with suffix', () => {
      type Result = HKTF.Apply<
        StringHKTF.EndsWith,
        { str: 'hello world'; suffix: 'world' }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false if does not end with suffix', () => {
      type Result = HKTF.Apply<
        StringHKTF.EndsWith,
        { str: 'hello world'; suffix: 'hello' }
      >;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('Replace', () => {
    it('should replace first occurrence', () => {
      type Result = HKTF.Apply<
        StringHKTF.Replace,
        { str: 'hello hello'; search: 'hello'; replacement: 'hi' }
      >;

      const result: Result = 'hi hello';
      expect(result).toBe('hi hello');
    });

    it('should return original if no match', () => {
      type Result = HKTF.Apply<
        StringHKTF.Replace,
        { str: 'hello'; search: 'world'; replacement: 'hi' }
      >;

      const result: Result = 'hello';
      expect(result).toBe('hello');
    });
  });

  describe('ReplaceAll', () => {
    it('should replace all occurrences', () => {
      type Result = HKTF.Apply<
        StringHKTF.ReplaceAll,
        { str: 'hello hello hello'; search: 'hello'; replacement: 'hi' }
      >;

      const result: Result = 'hi hi hi';
      expect(result).toBe('hi hi hi');
    });
  });

  describe('Capitalize', () => {
    it('should capitalize first letter', () => {
      const result = StringHKTF.capitalize('hello');
      expect(result).toBe('Hello');
    });

    it('should handle empty string', () => {
      const result = StringHKTF.capitalize('');
      expect(result).toBe('');
    });

    it('should handle already capitalized', () => {
      const result = StringHKTF.capitalize('Hello');
      expect(result).toBe('Hello');
    });

    it('should work with object args', () => {
      const result = StringHKTF.capitalize({ str: 'world' });
      expect(result).toBe('World');
    });
  });

  describe('Uncapitalize', () => {
    it('should uncapitalize first letter', () => {
      const result = StringHKTF.uncapitalize('Hello');
      expect(result).toBe('hello');
    });

    it('should handle empty string', () => {
      const result = StringHKTF.uncapitalize('');
      expect(result).toBe('');
    });

    it('should handle already uncapitalized', () => {
      const result = StringHKTF.uncapitalize('hello');
      expect(result).toBe('hello');
    });
  });

  describe('Trim', () => {
    it('should trim whitespace from both ends', () => {
      const result = StringHKTF.trim('  hello  ');
      expect(result).toBe('hello');
    });

    it('should handle no whitespace', () => {
      const result = StringHKTF.trim('hello');
      expect(result).toBe('hello');
    });

    it('should handle tabs and newlines', () => {
      const result = StringHKTF.trim('\t\nhello\n\t');
      expect(result).toBe('hello');
    });
  });

  describe('TrimStart', () => {
    it('should trim whitespace from start only', () => {
      const result = StringHKTF.trimStart('  hello  ');
      expect(result).toBe('hello  ');
    });

    it('should handle no leading whitespace', () => {
      const result = StringHKTF.trimStart('hello  ');
      expect(result).toBe('hello  ');
    });

    it('should work with object args', () => {
      const result = StringHKTF.trimStart({ str: '  hello' });
      expect(result).toBe('hello');
    });
  });

  describe('TrimEnd', () => {
    it('should trim whitespace from end only', () => {
      const result = StringHKTF.trimEnd('  hello  ');
      expect(result).toBe('  hello');
    });

    it('should handle no trailing whitespace', () => {
      const result = StringHKTF.trimEnd('  hello');
      expect(result).toBe('  hello');
    });

    it('should work with object args', () => {
      const result = StringHKTF.trimEnd({ str: 'hello  ' });
      expect(result).toBe('hello');
    });
  });

  describe('Slice', () => {
    it('should slice string with start and end', () => {
      const result = StringHKTF.slice('hello world', 0, 5);
      expect(result).toBe('hello');
    });

    it('should slice with start only', () => {
      const result = StringHKTF.slice('hello world', 6);
      expect(result).toBe('world');
    });

    it('should handle negative indices', () => {
      const result = StringHKTF.slice('hello', -2);
      expect(result).toBe('lo');
    });

    it('should work with object args', () => {
      const result = StringHKTF.slice({ str: 'hello', start: 1, end: 4 });
      expect(result).toBe('ell');
    });
  });

  describe('IndexOf', () => {
    it('should find first occurrence', () => {
      const result = StringHKTF.indexOf('hello world', 'o');
      expect(result).toBe(4);
    });

    it('should return -1 if not found', () => {
      const result = StringHKTF.indexOf('hello', 'x');
      expect(result).toBe(-1);
    });

    it('should work with object args', () => {
      const result = StringHKTF.indexOf({ str: 'hello', substring: 'l' });
      expect(result).toBe(2);
    });
  });

  describe('LastIndexOf', () => {
    it('should find last occurrence', () => {
      const result = StringHKTF.lastIndexOf('hello world', 'o');
      expect(result).toBe(7);
    });

    it('should return -1 if not found', () => {
      const result = StringHKTF.lastIndexOf('hello', 'x');
      expect(result).toBe(-1);
    });

    it('should work with object args', () => {
      const result = StringHKTF.lastIndexOf({ str: 'hello', substring: 'l' });
      expect(result).toBe(3);
    });
  });

  describe('CharAt', () => {
    it('should get character at index', () => {
      const result = StringHKTF.charAt('hello', 1);
      expect(result).toBe('e');
    });

    it('should return empty string for out of bounds', () => {
      const result = StringHKTF.charAt('hello', 10);
      expect(result).toBe('');
    });

    it('should work with object args', () => {
      const result = StringHKTF.charAt({ str: 'world', index: 0 });
      expect(result).toBe('w');
    });
  });

  describe('Reverse', () => {
    it('should reverse string', () => {
      const result = StringHKTF.reverse('hello');
      expect(result).toBe('olleh');
    });

    it('should handle empty string', () => {
      const result = StringHKTF.reverse('');
      expect(result).toBe('');
    });

    it('should work with object args', () => {
      const result = StringHKTF.reverse({ str: 'world' });
      expect(result).toBe('dlrow');
    });
  });

  describe('IsEmpty', () => {
    it('should return true for empty string', () => {
      const result = StringHKTF.isEmpty('');
      expect(result).toBe(true);
    });

    it('should return false for non-empty string', () => {
      const result = StringHKTF.isEmpty('hello');
      expect(result).toBe(false);
    });

    it('should work with object args', () => {
      const result = StringHKTF.isEmpty({ str: '' });
      expect(result).toBe(true);
    });
  });

  describe('Words', () => {
    it('should split into words', () => {
      const result = StringHKTF.words('hello world foo');
      expect(result).toEqual(['hello', 'world', 'foo']);
    });

    it('should handle multiple spaces', () => {
      const result = StringHKTF.words('hello   world');
      expect(result).toEqual(['hello', 'world']);
    });

    it('should handle tabs', () => {
      const result = StringHKTF.words('hello\tworld');
      expect(result).toEqual(['hello', 'world']);
    });

    it('should work with object args', () => {
      const result = StringHKTF.words({ str: 'foo bar' });
      expect(result).toEqual(['foo', 'bar']);
    });
  });

  describe('Lines', () => {
    it('should split into lines', () => {
      const result = StringHKTF.lines('hello\nworld');
      expect(result).toEqual(['hello', 'world']);
    });

    it('should handle CRLF', () => {
      const result = StringHKTF.lines('hello\r\nworld');
      expect(result).toEqual(['hello', 'world']);
    });

    it('should work with object args', () => {
      const result = StringHKTF.lines({ str: 'foo\nbar' });
      expect(result).toEqual(['foo', 'bar']);
    });
  });

  describe('KebabCase', () => {
    it('should convert to kebab-case', () => {
      const result = StringHKTF.kebabCase('helloWorld');
      expect(result).toBe('hello-world');
    });

    it('should handle PascalCase', () => {
      const result = StringHKTF.kebabCase('HelloWorld');
      expect(result).toBe('hello-world');
    });

    it('should handle spaces', () => {
      const result = StringHKTF.kebabCase('hello world');
      expect(result).toBe('hello-world');
    });

    it('should handle snake_case', () => {
      const result = StringHKTF.kebabCase('hello_world');
      expect(result).toBe('hello-world');
    });

    it('should work with object args', () => {
      const result = StringHKTF.kebabCase({ str: 'fooBar' });
      expect(result).toBe('foo-bar');
    });
  });

  describe('SnakeCase', () => {
    it('should convert to snake_case', () => {
      const result = StringHKTF.snakeCase('helloWorld');
      expect(result).toBe('hello_world');
    });

    it('should handle PascalCase', () => {
      const result = StringHKTF.snakeCase('HelloWorld');
      expect(result).toBe('hello_world');
    });

    it('should handle spaces', () => {
      const result = StringHKTF.snakeCase('hello world');
      expect(result).toBe('hello_world');
    });

    it('should handle kebab-case', () => {
      const result = StringHKTF.snakeCase('hello-world');
      expect(result).toBe('hello_world');
    });
  });

  describe('CamelCase', () => {
    it('should convert to camelCase', () => {
      const result = StringHKTF.camelCase('hello world');
      expect(result).toBe('helloWorld');
    });

    it('should handle PascalCase', () => {
      const result = StringHKTF.camelCase('HelloWorld');
      expect(result).toBe('helloWorld');
    });

    it('should handle kebab-case', () => {
      const result = StringHKTF.camelCase('hello-world');
      expect(result).toBe('helloWorld');
    });

    it('should handle snake_case', () => {
      const result = StringHKTF.camelCase('hello_world');
      expect(result).toBe('helloWorld');
    });
  });

  describe('PascalCase', () => {
    it('should convert to PascalCase', () => {
      const result = StringHKTF.pascalCase('hello world');
      expect(result).toBe('HelloWorld');
    });

    it('should handle camelCase', () => {
      const result = StringHKTF.pascalCase('helloWorld');
      expect(result).toBe('HelloWorld');
    });

    it('should handle kebab-case', () => {
      const result = StringHKTF.pascalCase('hello-world');
      expect(result).toBe('HelloWorld');
    });

    it('should handle snake_case', () => {
      const result = StringHKTF.pascalCase('hello_world');
      expect(result).toBe('HelloWorld');
    });
  });

  describe('Template', () => {
    it('should replace placeholders', () => {
      const result = StringHKTF.template('Hello {name}!', { name: 'World' });
      expect(result).toBe('Hello World!');
    });

    it('should handle multiple placeholders', () => {
      const result = StringHKTF.template('{greeting} {name}!', { greeting: 'Hi', name: 'there' });
      expect(result).toBe('Hi there!');
    });

    it('should leave unknown placeholders', () => {
      const result = StringHKTF.template('Hello {name}!', { foo: 'bar' });
      expect(result).toBe('Hello {name}!');
    });

    it('should work with object args', () => {
      const result = StringHKTF.template({ str: '{x} + {y}', values: { x: '1', y: '2' } });
      expect(result).toBe('1 + 2');
    });
  });

  describe('Truncate', () => {
    it('should truncate long strings', () => {
      const result = StringHKTF.truncate('hello world', 8);
      expect(result).toBe('hello...');
    });

    it('should not truncate short strings', () => {
      const result = StringHKTF.truncate('hello', 10);
      expect(result).toBe('hello');
    });

    it('should use custom ellipsis', () => {
      const result = StringHKTF.truncate('hello world', 8, '!');
      expect(result).toBe('hello w!');
    });

    it('should work with object args', () => {
      const result = StringHKTF.truncate({ str: 'hello world', length: 8, ellipsis: '...' });
      expect(result).toBe('hello...');
    });
  });

  describe('RemovePrefix', () => {
    it('should remove prefix if present', () => {
      const result = StringHKTF.removePrefix('hello world', 'hello ');
      expect(result).toBe('world');
    });

    it('should leave string unchanged if no prefix', () => {
      const result = StringHKTF.removePrefix('hello world', 'foo');
      expect(result).toBe('hello world');
    });

    it('should work with object args', () => {
      const result = StringHKTF.removePrefix({ str: 'prefix-value', prefix: 'prefix-' });
      expect(result).toBe('value');
    });
  });

  describe('RemoveSuffix', () => {
    it('should remove suffix if present', () => {
      const result = StringHKTF.removeSuffix('hello world', ' world');
      expect(result).toBe('hello');
    });

    it('should leave string unchanged if no suffix', () => {
      const result = StringHKTF.removeSuffix('hello world', 'foo');
      expect(result).toBe('hello world');
    });

    it('should work with object args', () => {
      const result = StringHKTF.removeSuffix({ str: 'value.txt', suffix: '.txt' });
      expect(result).toBe('value');
    });
  });

  describe('Count', () => {
    it('should count occurrences', () => {
      const result = StringHKTF.count('hello hello', 'hello');
      expect(result).toBe(2);
    });

    it('should return 0 if not found', () => {
      const result = StringHKTF.count('hello', 'world');
      expect(result).toBe(0);
    });

    it('should handle empty substring', () => {
      const result = StringHKTF.count('hello', '');
      expect(result).toBe(0);
    });

    it('should work with object args', () => {
      const result = StringHKTF.count({ str: 'aaa', substring: 'a' });
      expect(result).toBe(3);
    });
  });

  describe('Match', () => {
    it('should match pattern', () => {
      const result = StringHKTF.match('hello world', 'hello');
      expect(result).toEqual(['hello']);
    });

    it('should return null if no match', () => {
      const result = StringHKTF.match('hello', 'world');
      expect(result).toBe(null);
    });

    it('should match with regex', () => {
      const result = StringHKTF.match('hello123', '\\d+');
      expect(result).toEqual(['123']);
    });

    it('should work with object args', () => {
      const result = StringHKTF.match({ str: 'test123', pattern: '\\d+' });
      expect(result).toEqual(['123']);
    });
  });

  describe('Extract', () => {
    it('should extract between delimiters', () => {
      const result = StringHKTF.extract('Hello [world]!', '[', ']');
      expect(result).toBe('world');
    });

    it('should return empty if start not found', () => {
      const result = StringHKTF.extract('hello', '[', ']');
      expect(result).toBe('');
    });

    it('should return empty if end not found', () => {
      const result = StringHKTF.extract('[hello', '[', ']');
      expect(result).toBe('');
    });

    it('should work with object args', () => {
      const result = StringHKTF.extract({ str: 'foo{bar}baz', start: '{', end: '}' });
      expect(result).toBe('bar');
    });
  });

  describe('Includes', () => {
    it('should return true if substring exists', () => {
      const result = StringHKTF.includes('hello world', 'world');
      expect(result).toBe(true);
    });

    it('should return false if substring does not exist', () => {
      const result = StringHKTF.includes('hello', 'world');
      expect(result).toBe(false);
    });
  });

  describe('Length', () => {
    it('should return string length', () => {
      const result = StringHKTF.length('hello');
      expect(result).toBe(5);
    });

    it('should return 0 for empty string', () => {
      const result = StringHKTF.length('');
      expect(result).toBe(0);
    });
  });

  describe('PadStart', () => {
    it('should pad start to length', () => {
      const result = StringHKTF.padStart('5', 3, '0');
      expect(result).toBe('005');
    });

    it('should not pad if already long enough', () => {
      const result = StringHKTF.padStart('hello', 3, '0');
      expect(result).toBe('hello');
    });
  });

  describe('PadEnd', () => {
    it('should pad end to length', () => {
      const result = StringHKTF.padEnd('5', 3, '0');
      expect(result).toBe('500');
    });

    it('should not pad if already long enough', () => {
      const result = StringHKTF.padEnd('hello', 3, '0');
      expect(result).toBe('hello');
    });
  });

  describe('Repeat', () => {
    it('should repeat string n times', () => {
      const result = StringHKTF.repeat('ha', 3);
      expect(result).toBe('hahaha');
    });

    it('should return empty for 0 count', () => {
      const result = StringHKTF.repeat('ha', 0);
      expect(result).toBe('');
    });
  });

  describe('Substring', () => {
    it('should extract substring', () => {
      const result = StringHKTF.substring('hello world', 0, 5);
      expect(result).toBe('hello');
    });

    it('should handle start only', () => {
      const result = StringHKTF.substring('hello', 2);
      expect(result).toBe('llo');
    });
  });
});
