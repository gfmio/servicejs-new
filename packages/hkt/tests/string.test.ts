import { describe, it, expect } from 'bun:test';
import { HKTF, StringHKTF } from '../src/index.js';

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
});
