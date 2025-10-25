import { describe, test, expect } from 'bun:test';
import {
  createURN,
  safeCreateURN,
  parseURN,
  validateURN,
  equalURN,
  type URN,
} from '../src/urn';

describe('URN', () => {
  describe('createURN', () => {
    test('creates URN with namespace and id', () => {
      const urn = createURN('app', 'counter-123');

      expect(urn.namespace).toBe('app');
      expect(urn.id).toBe('counter-123');
    });

    test('toString returns correct format', () => {
      const urn = createURN('app', 'counter-123');

      expect(urn.toString()).toBe('urn:app:counter-123');
    });

    test('handles different namespaces', () => {
      const urn1 = createURN('app', 'counter-1');
      const urn2 = createURN('system', 'logger-1');

      expect(urn1.toString()).toBe('urn:app:counter-1');
      expect(urn2.toString()).toBe('urn:system:logger-1');
    });

    test('handles ids with hyphens, underscores, dots', () => {
      const urn = createURN('app', 'my-component_v1.0');

      expect(urn.toString()).toBe('urn:app:my-component_v1.0');
    });
  });

  describe('validateURN', () => {
    test('accepts valid namespace and id', () => {
      const result = validateURN('app', 'counter-123');

      expect(result.isOk()).toBe(true);
    });

    test('rejects empty namespace', () => {
      const result = validateURN('', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('EMPTY_NAMESPACE');
      }
    });

    test('rejects whitespace-only namespace', () => {
      const result = validateURN('   ', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('EMPTY_NAMESPACE');
      }
    });

    test('rejects empty id', () => {
      const result = validateURN('app', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('EMPTY_ID');
      }
    });

    test('rejects namespace with colons', () => {
      const result = validateURN('app:sub', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_CHARACTERS');
        expect(result.error.field).toBe('namespace');
      }
    });

    test('rejects id with colons', () => {
      const result = validateURN('app', 'counter:123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_CHARACTERS');
        expect(result.error.field).toBe('id');
      }
    });

    test('rejects namespace with special characters', () => {
      const result = validateURN('app@test', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_CHARACTERS');
      }
    });

    test('accepts alphanumeric, hyphens, underscores, dots', () => {
      const result = validateURN('app-test_v1.0', 'counter_123-v2.0');

      expect(result.isOk()).toBe(true);
    });
  });

  describe('safeCreateURN', () => {
    test('creates URN for valid inputs', () => {
      const result = safeCreateURN('app', 'counter-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.toString()).toBe('urn:app:counter-123');
      }
    });

    test('returns error for invalid namespace', () => {
      const result = safeCreateURN('', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('EMPTY_NAMESPACE');
      }
    });

    test('returns error for invalid id', () => {
      const result = safeCreateURN('app', '');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('EMPTY_ID');
      }
    });

    test('returns error for special characters', () => {
      const result = safeCreateURN('app@test', 'counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_CHARACTERS');
      }
    });
  });

  describe('parseURN', () => {
    test('parses valid URN string', () => {
      const result = parseURN('urn:app:counter-123');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.namespace).toBe('app');
        expect(result.value.id).toBe('counter-123');
      }
    });

    test('parses URN with complex id', () => {
      const result = parseURN('urn:system:logger-v1.0_main');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.namespace).toBe('system');
        expect(result.value.id).toBe('logger-v1.0_main');
      }
    });

    test('rejects id with colons (invalid character)', () => {
      const result = parseURN('urn:app:path:to:component');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_CHARACTERS');
        expect(result.error.field).toBe('id');
      }
    });

    test('rejects invalid format - missing urn prefix', () => {
      const result = parseURN('app:counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });

    test('rejects invalid format - only one colon', () => {
      const result = parseURN('urn:app');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });

    test('rejects empty string', () => {
      const result = parseURN('');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });

    test('rejects invalid namespace in parsed URN', () => {
      const result = parseURN('urn::counter-123');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });

    test('rejects invalid id in parsed URN', () => {
      const result = parseURN('urn:app:');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('INVALID_FORMAT');
      }
    });
  });

  describe('equalURN', () => {
    test('returns true for equal URNs', () => {
      const urn1 = createURN('app', 'counter-1');
      const urn2 = createURN('app', 'counter-1');

      expect(equalURN(urn1, urn2)).toBe(true);
    });

    test('returns false for different namespaces', () => {
      const urn1 = createURN('app', 'counter-1');
      const urn2 = createURN('system', 'counter-1');

      expect(equalURN(urn1, urn2)).toBe(false);
    });

    test('returns false for different ids', () => {
      const urn1 = createURN('app', 'counter-1');
      const urn2 = createURN('app', 'counter-2');

      expect(equalURN(urn1, urn2)).toBe(false);
    });

    test('returns false for different namespace and id', () => {
      const urn1 = createURN('app', 'counter-1');
      const urn2 = createURN('system', 'logger-1');

      expect(equalURN(urn1, urn2)).toBe(false);
    });
  });

  describe('round-trip', () => {
    test('create -> toString -> parse produces equal URN', () => {
      const original = createURN('app', 'counter-123');
      const str = original.toString();
      const parsed = parseURN(str);

      expect(parsed.isOk()).toBe(true);
      if (parsed.isOk()) {
        expect(equalURN(original, parsed.value)).toBe(true);
      }
    });

    test('handles complex URNs in round-trip', () => {
      const original = createURN('my-app_v1.0', 'component-123_test.v2');
      const str = original.toString();
      const parsed = parseURN(str);

      expect(parsed.isOk()).toBe(true);
      if (parsed.isOk()) {
        expect(equalURN(original, parsed.value)).toBe(true);
      }
    });
  });
});
