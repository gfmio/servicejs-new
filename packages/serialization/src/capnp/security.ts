/**
 * Cap'n Proto Security Features
 *
 * Traversal limits and pointer validation to prevent DoS attacks
 * and ensure message integrity.
 */

import type { TraversalLimits, TraversalContext, CapnpSegment } from './types.js';

/**
 * Default traversal limits
 */
export const DEFAULT_TRAVERSAL_LIMITS: TraversalLimits = {
  maxDepth: 64, // Maximum nesting depth
  maxWords: 8 * 1024 * 1024, // 64MB maximum traversal
};

/**
 * Create a new traversal context
 *
 * @param limits - Traversal limits (optional, uses defaults if not provided)
 * @returns New traversal context
 */
export const createTraversalContext = (limits?: Partial<TraversalLimits>): TraversalContext => {
  return {
    depth: 0,
    wordsTraversed: 0,
    limits: {
      ...DEFAULT_TRAVERSAL_LIMITS,
      ...limits,
    },
    visited: new Set<string>(),
  };
};

/**
 * Enter a new traversal level
 *
 * @param context - Traversal context
 * @throws Error if depth limit exceeded
 */
export const enterTraversal = (context: TraversalContext): void => {
  context.depth++;
  if (context.depth > context.limits.maxDepth) {
    throw new Error(`Traversal depth limit exceeded: ${context.limits.maxDepth}`);
  }
};

/**
 * Exit a traversal level
 *
 * @param context - Traversal context
 */
export const exitTraversal = (context: TraversalContext): void => {
  context.depth--;
};

/**
 * Record words traversed
 *
 * @param context - Traversal context
 * @param words - Number of words traversed
 * @throws Error if word limit exceeded
 */
export const recordTraversal = (context: TraversalContext, words: number): void => {
  context.wordsTraversed += words;
  if (context.wordsTraversed > context.limits.maxWords) {
    throw new Error(`Traversal size limit exceeded: ${context.limits.maxWords} words`);
  }
};

/**
 * Check if a pointer has been visited (cycle detection)
 *
 * @param context - Traversal context
 * @param segmentIndex - Segment index
 * @param offset - Pointer offset
 * @returns True if pointer was already visited
 */
export const checkPointerCycle = (
  context: TraversalContext,
  segmentIndex: number,
  offset: number
): boolean => {
  const key = `${segmentIndex}:${offset}`;
  if (context.visited.has(key)) {
    return true; // Cycle detected
  }
  context.visited.add(key);
  return false;
};

/**
 * Validate a struct pointer
 *
 * @param segment - Segment containing the pointer
 * @param offset - Pointer offset
 * @param targetOffset - Target offset
 * @param dataWords - Data word count
 * @param pointers - Pointer count
 * @throws Error if pointer is invalid
 */
export const validateStructPointer = (
  segment: CapnpSegment,
  offset: number,
  targetOffset: number,
  dataWords: number,
  pointers: number
): void => {
  // Check that pointer is within segment bounds
  if (offset < 0 || offset + 8 > segment.data.byteLength) {
    throw new Error(`Struct pointer out of bounds: offset ${offset}`);
  }

  // Check that target is within segment bounds
  const targetSize = (dataWords + pointers) * 8;
  if (targetOffset < 0 || targetOffset + targetSize > segment.data.byteLength) {
    throw new Error(`Struct pointer target out of bounds: offset ${targetOffset}, size ${targetSize}`);
  }

  // Check that pointer doesn't overlap with itself
  if (offset >= targetOffset && offset < targetOffset + targetSize) {
    throw new Error('Struct pointer overlaps with its target');
  }
};

/**
 * Validate a list pointer
 *
 * @param segment - Segment containing the pointer
 * @param offset - Pointer offset
 * @param targetOffset - Target offset
 * @param elementCount - Number of elements
 * @param elementSize - Size of each element
 * @throws Error if pointer is invalid
 */
export const validateListPointer = (
  segment: CapnpSegment,
  offset: number,
  targetOffset: number,
  elementCount: number,
  elementSize: number
): void => {
  // Check that pointer is within segment bounds
  if (offset < 0 || offset + 8 > segment.data.byteLength) {
    throw new Error(`List pointer out of bounds: offset ${offset}`);
  }

  // Check that target is within segment bounds
  const targetSize = elementCount * elementSize;
  if (targetOffset < 0 || targetOffset + targetSize > segment.data.byteLength) {
    throw new Error(`List pointer target out of bounds: offset ${targetOffset}, size ${targetSize}`);
  }

  // Check that pointer doesn't overlap with itself
  if (offset >= targetOffset && offset < targetOffset + targetSize) {
    throw new Error('List pointer overlaps with its target');
  }
};

/**
 * Validate a far pointer
 *
 * @param segments - All message segments
 * @param currentSegmentIndex - Current segment index
 * @param targetSegmentIndex - Target segment index
 * @param targetOffset - Target offset
 * @throws Error if pointer is invalid
 */
export const validateFarPointer = (
  segments: CapnpSegment[],
  currentSegmentIndex: number,
  targetSegmentIndex: number,
  targetOffset: number
): void => {
  // Check that target segment exists
  if (targetSegmentIndex < 0 || targetSegmentIndex >= segments.length) {
    throw new Error(`Far pointer to invalid segment: ${targetSegmentIndex}`);
  }

  const targetSegment = segments[targetSegmentIndex];
  if (!targetSegment) {
    throw new Error(`Far pointer to invalid segment: ${targetSegmentIndex}`);
  }

  // Check that target offset is within segment bounds
  if (targetOffset < 0 || targetOffset > targetSegment.data.byteLength) {
    throw new Error(`Far pointer target out of bounds: offset ${targetOffset}`);
  }

  // Check that far pointer doesn't point to same segment (unnecessary)
  if (targetSegmentIndex === currentSegmentIndex) {
    throw new Error('Far pointer points to same segment (should use normal pointer)');
  }
};

/**
 * Canonicalize a pointer value
 *
 * Ensures pointer is in canonical form (smallest possible representation)
 *
 * @param offset - Pointer offset
 * @param target - Target offset
 * @returns Canonical pointer value
 */
export const canonicalizePointer = (offset: number, target: number): number => {
  // Calculate relative offset in words
  const relativeOffset = Math.floor((target - offset - 8) / 8);
  return relativeOffset;
};
