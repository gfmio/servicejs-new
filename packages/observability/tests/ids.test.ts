import { describe, test, expect } from 'bun:test';
import {
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  formatTraceparent,
  parseTraceparent,
  formatTracestate,
  parseTracestate,
} from '../src/ids';

describe('ID Generation', () => {
  test('generateTraceId creates valid trace IDs', () => {
    const traceId = generateTraceId();
    expect(traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(isValidTraceId(traceId)).toBe(true);
  });

  test('generateSpanId creates valid span IDs', () => {
    const spanId = generateSpanId();
    expect(spanId).toMatch(/^[0-9a-f]{16}$/);
    expect(isValidSpanId(spanId)).toBe(true);
  });

  test('trace IDs are unique', () => {
    const id1 = generateTraceId();
    const id2 = generateTraceId();
    expect(id1).not.toBe(id2);
  });

  test('span IDs are unique', () => {
    const id1 = generateSpanId();
    const id2 = generateSpanId();
    expect(id1).not.toBe(id2);
  });
});

describe('ID Validation', () => {
  test('isValidTraceId accepts valid trace IDs', () => {
    expect(isValidTraceId('1234567890abcdef1234567890abcdef')).toBe(true);
    expect(isValidTraceId('ffffffffffffffffffffffffffffffff')).toBe(true);
  });

  test('isValidTraceId rejects invalid trace IDs', () => {
    expect(isValidTraceId('00000000000000000000000000000000')).toBe(false);
    expect(isValidTraceId('123')).toBe(false);
    expect(isValidTraceId('not-a-valid-trace-id')).toBe(false);
    expect(isValidTraceId('1234567890ABCDEF1234567890ABCDEF')).toBe(false); // uppercase
  });

  test('isValidSpanId accepts valid span IDs', () => {
    expect(isValidSpanId('1234567890abcdef')).toBe(true);
    expect(isValidSpanId('ffffffffffffffff')).toBe(true);
  });

  test('isValidSpanId rejects invalid span IDs', () => {
    expect(isValidSpanId('0000000000000000')).toBe(false);
    expect(isValidSpanId('123')).toBe(false);
    expect(isValidSpanId('not-valid')).toBe(false);
    expect(isValidSpanId('1234567890ABCDEF')).toBe(false); // uppercase
  });
});

describe('W3C Trace Context', () => {
  test('formatTraceparent creates valid traceparent header', () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const spanId = '00f067aa0ba902b7';
    const traceparent = formatTraceparent(traceId, spanId, true);

    expect(traceparent).toBe('00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01');
  });

  test('formatTraceparent handles sampled flag', () => {
    const traceId = '4bf92f3577b34da6a3ce929d0e0e4736';
    const spanId = '00f067aa0ba902b7';

    const sampled = formatTraceparent(traceId, spanId, true);
    expect(sampled).toMatch(/-01$/);

    const notSampled = formatTraceparent(traceId, spanId, false);
    expect(notSampled).toMatch(/-00$/);
  });

  test('parseTraceparent extracts trace context', () => {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparent(traceparent);

    expect(parsed).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      sampled: true,
    });
  });

  test('parseTraceparent returns null for invalid traceparent', () => {
    expect(parseTraceparent('invalid')).toBeNull();
    expect(parseTraceparent('01-trace-span-01')).toBeNull(); // wrong version
    expect(parseTraceparent('00-invalid-00f067aa0ba902b7-01')).toBeNull(); // invalid trace ID
  });
});

describe('W3C Tracestate', () => {
  test('formatTracestate creates valid tracestate header', () => {
    const baggage = {
      vendor1: 'value1',
      vendor2: 'value2',
    };
    const tracestate = formatTracestate(baggage);

    expect(tracestate).toBe('vendor1=value1,vendor2=value2');
  });

  test('parseTracestate extracts baggage', () => {
    const tracestate = 'vendor1=value1,vendor2=value2';
    const baggage = parseTracestate(tracestate);

    expect(baggage).toEqual({
      vendor1: 'value1',
      vendor2: 'value2',
    });
  });

  test('parseTracestate handles empty tracestate', () => {
    const baggage = parseTracestate('');
    expect(baggage).toEqual({});
  });

  test('formatTracestate and parseTracestate round-trip', () => {
    const original = {
      key1: 'value1',
      key2: 'value2',
      key3: 'value3',
    };
    const formatted = formatTracestate(original);
    const parsed = parseTracestate(formatted);

    expect(parsed).toEqual(original);
  });
});
