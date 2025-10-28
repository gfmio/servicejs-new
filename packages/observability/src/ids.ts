/**
 * ID generation utilities for trace and span IDs
 * W3C Trace Context compatible
 */

/**
 * Generate a random hex string of specified length
 */
const randomHex = (bytes: number): string => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate a W3C Trace Context compatible trace ID
 * 32 hex characters (16 bytes)
 */
export const generateTraceId = (): string => {
  return randomHex(16);
};

/**
 * Generate a W3C Trace Context compatible span ID
 * 16 hex characters (8 bytes)
 */
export const generateSpanId = (): string => {
  return randomHex(8);
};

/**
 * Validate trace ID format
 */
export const isValidTraceId = (traceId: string): boolean => {
  return /^[0-9a-f]{32}$/.test(traceId) && traceId !== '00000000000000000000000000000000';
};

/**
 * Validate span ID format
 */
export const isValidSpanId = (spanId: string): boolean => {
  return /^[0-9a-f]{16}$/.test(spanId) && spanId !== '0000000000000000';
};

/**
 * Format trace context as W3C traceparent header
 * Format: version-trace_id-span_id-flags
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 */
export const formatTraceparent = (
  traceId: string,
  spanId: string,
  sampled: boolean = true
): string => {
  const flags = sampled ? '01' : '00';
  return `00-${traceId}-${spanId}-${flags}`;
};

/**
 * Parse W3C traceparent header
 */
export const parseTraceparent = (
  traceparent: string
): { traceId: string; spanId: string; sampled: boolean } | null => {
  const parts = traceparent.split('-');
  if (parts.length !== 4) return null;

  const version = parts[0];
  const traceId = parts[1];
  const spanId = parts[2];
  const flags = parts[3];

  if (!version || !traceId || !spanId || !flags) return null;
  if (version !== '00') return null;
  if (!isValidTraceId(traceId)) return null;
  if (!isValidSpanId(spanId)) return null;

  const sampled = flags === '01';

  return { traceId, spanId, sampled };
};

/**
 * Format baggage as W3C tracestate header
 * Format: vendor1=value1,vendor2=value2
 */
export const formatTracestate = (baggage: Record<string, string>): string => {
  return Object.entries(baggage)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
};

/**
 * Parse W3C tracestate header
 */
export const parseTracestate = (tracestate: string): Record<string, string> => {
  const baggage: Record<string, string> = {};

  tracestate.split(',').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key && value) {
      baggage[key.trim()] = value.trim();
    }
  });

  return baggage;
};
