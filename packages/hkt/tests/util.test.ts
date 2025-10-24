import { describe, expect, it } from 'bun:test';
import { HKTF, Util } from '../src/index.js';

describe('Util', () => {
  describe('IsNever', () => {
    it('should return true for never', () => {
      type Result = HKTF.Apply<Util.IsNever, { type: never }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for non-never', () => {
      type Result = HKTF.Apply<Util.IsNever, { type: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsAny', () => {
    it('should return true for any', () => {
      type Result = HKTF.Apply<Util.IsAny, { type: any }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for non-any', () => {
      type Result = HKTF.Apply<Util.IsAny, { type: unknown }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsUnknown', () => {
    it('should return true for unknown', () => {
      type Result = HKTF.Apply<Util.IsUnknown, { type: unknown }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for concrete type', () => {
      type Result = HKTF.Apply<Util.IsUnknown, { type: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('Equals', () => {
    it('should return true for equal types', () => {
      type Result = HKTF.Apply<Util.Equals, { type1: number; type2: number }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for different types', () => {
      type Result = HKTF.Apply<Util.Equals, { type1: number; type2: string }>;

      const result: Result = false;
      expect(result).toBe(false);
    });

    it('should distinguish literal types', () => {
      type Result = HKTF.Apply<Util.Equals, { type1: 42; type2: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('Extends', () => {
    it('should return true if type1 extends type2', () => {
      type Result = HKTF.Apply<
        Util.Extends,
        { type1: 42; type2: number }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false if type1 does not extend type2', () => {
      type Result = HKTF.Apply<
        Util.Extends,
        { type1: number; type2: string }
      >;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsTuple', () => {
    it('should return true for tuple', () => {
      type Result = HKTF.Apply<
        Util.IsTuple,
        { type: readonly [1, 2, 3] }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for array', () => {
      type Result = HKTF.Apply<Util.IsTuple, { type: number[] }>;

      const result: Result = false;
      expect(result).toBe(false);
    });

    it('should return false for non-array', () => {
      type Result = HKTF.Apply<Util.IsTuple, { type: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsArray', () => {
    it('should return true for array', () => {
      type Result = HKTF.Apply<Util.IsArray, { type: number[] }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return true for tuple', () => {
      type Result = HKTF.Apply<
        Util.IsArray,
        { type: readonly [1, 2, 3] }
      >;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for non-array', () => {
      type Result = HKTF.Apply<Util.IsArray, { type: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsObject', () => {
    it('should return true for object', () => {
      type Result = HKTF.Apply<Util.IsObject, { type: { a: 1 } }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for array', () => {
      type Result = HKTF.Apply<Util.IsObject, { type: number[] }>;

      const result: Result = false;
      expect(result).toBe(false);
    });

    it('should return false for function', () => {
      type Result = HKTF.Apply<Util.IsObject, { type: () => void }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });

  describe('IsFunction', () => {
    it('should return true for function', () => {
      type Result = HKTF.Apply<Util.IsFunction, { type: () => void }>;

      const result: Result = true;
      expect(result).toBe(true);
    });

    it('should return false for non-function', () => {
      type Result = HKTF.Apply<Util.IsFunction, { type: number }>;

      const result: Result = false;
      expect(result).toBe(false);
    });
  });
});
