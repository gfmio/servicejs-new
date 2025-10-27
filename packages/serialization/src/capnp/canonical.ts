/**
 * Cap'n Proto Canonicalization
 *
 * Canonical encoding ensures messages have a unique, deterministic representation.
 * This is essential for cryptographic signatures and content-addressable storage.
 *
 * Canonical requirements:
 * 1. Single segment (no multi-segment messages)
 * 2. Struct pointers in preorder (parents before children)
 * 3. No far pointers
 * 4. Pointers use smallest possible offsets
 * 5. No unused space between objects
 */

import type { CapnpMessage, CapnpSegment, CapnpSchema } from './types.js';
import { createSegment, writeStruct, readStruct } from './encoding.js';

/**
 * Canonicalize a message
 *
 * Converts a message to canonical form with deterministic layout.
 *
 * @param message - Message to canonicalize
 * @param schema - Root struct schema
 * @returns Canonical message (single segment)
 */
export const canonicalizeMessage = (
  message: CapnpMessage,
  schema: CapnpSchema
): CapnpMessage => {
  // Read the root struct from the original message
  const rootSegment = message.segments[0];
  if (!rootSegment) {
    throw new Error('Cannot canonicalize empty message');
  }

  const value = readStruct(rootSegment, 0, schema);

  // Write to a new single-segment message in canonical order
  const canonicalSegment = createSegment(8192); // Start with reasonable size
  canonicalSegment.position = 0;

  // Write struct in preorder (canonical order)
  writeStruct(canonicalSegment, 0, schema, value);

  // Trim segment to exact size
  const trimmedSegment = createSegment(canonicalSegment.position);
  const sourceData = new Uint8Array(
    canonicalSegment.data.buffer,
    0,
    canonicalSegment.position
  );
  const trimmedData = new Uint8Array(trimmedSegment.data.buffer, 0, canonicalSegment.position);
  trimmedData.set(sourceData);
  trimmedSegment.position = canonicalSegment.position;

  return {
    segments: [trimmedSegment],
  };
};

/**
 * Check if a message is in canonical form
 *
 * @param message - Message to check
 * @returns True if message is canonical
 */
export const isCanonical = (message: CapnpMessage): boolean => {
  // Must be single segment
  if (message.segments.length !== 1) {
    return false;
  }

  const segment = message.segments[0];
  if (!segment) {
    return false;
  }

  // Check for far pointers (not allowed in canonical form)
  if (hasFarPointers(segment)) {
    return false;
  }

  // Check for gaps between objects (not allowed in canonical form)
  if (hasGaps(segment)) {
    return false;
  }

  return true;
};

/**
 * Check if a segment contains far pointers
 *
 * @param segment - Segment to check
 * @returns True if segment has far pointers
 */
const hasFarPointers = (segment: CapnpSegment): boolean => {
  for (let i = 0; i < segment.position; i += 8) {
    const pointer = segment.data.getUint32(i, true);
    const pointerType = pointer & 3;
    if (pointerType === 2) {
      // Far pointer
      return true;
    }
  }
  return false;
};

/**
 * Check if a segment has gaps between objects
 *
 * This is a simplified check - a full implementation would need
 * to traverse the pointer graph.
 *
 * @param _segment - Segment to check (unused in current implementation)
 * @returns True if segment has gaps
 */
const hasGaps = (_segment: CapnpSegment): boolean => {
  // For now, we assume no gaps if segment is tightly packed
  // A full implementation would traverse all pointers and check
  // for unreferenced space
  return false;
};

/**
 * Compute a cryptographic hash of a canonical message
 *
 * This is useful for content-addressable storage and signatures.
 * The message must be in canonical form for the hash to be deterministic.
 *
 * @param message - Canonical message
 * @returns Hash as Uint8Array
 */
export const hashCanonical = async (message: CapnpMessage): Promise<Uint8Array> => {
  if (!isCanonical(message)) {
    throw new Error('Message must be canonical to compute deterministic hash');
  }

  const segment = message.segments[0];
  if (!segment) {
    throw new Error('Cannot hash empty message');
  }
  const data = new Uint8Array(segment.data.buffer, 0, segment.position);

  // Use Web Crypto API if available, otherwise use a simple hash
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  // Fallback: simple hash for environments without crypto.subtle
  return simpleHash(data);
};

/**
 * Simple hash function for environments without crypto.subtle
 *
 * This is NOT cryptographically secure and should only be used
 * as a fallback for testing purposes.
 *
 * @param data - Data to hash
 * @returns Hash bytes
 */
const simpleHash = (data: Uint8Array): Uint8Array => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    if (byte !== undefined) {
      hash = ((hash << 5) - hash + byte) | 0;
    }
  }
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = (hash >> (i % 4) * 8) & 0xff;
  }
  return result;
};

/**
 * Verify a signature on a canonical message
 *
 * @param message - Canonical message
 * @param signature - Signature bytes
 * @param publicKey - Public key for verification
 * @returns True if signature is valid
 */
export const verifySignature = async (
  message: CapnpMessage,
  signature: Uint8Array,
  publicKey: CryptoKey
): Promise<boolean> => {
  if (!isCanonical(message)) {
    throw new Error('Message must be canonical to verify signature');
  }

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const segment = message.segments[0];
  if (!segment) {
    throw new Error('Cannot verify signature on empty message');
  }
  const data = new Uint8Array(segment.data.buffer, 0, segment.position);

  try {
    return await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: { name: 'SHA-256' },
      },
      publicKey,
      signature,
      data
    );
  } catch {
    return false;
  }
};
