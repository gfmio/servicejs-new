/**
 * Cap'n Proto Orphans
 *
 * Orphans are detached message data that can be moved between messages
 * without copying. This is useful for efficient message construction
 * and advanced memory management.
 */

import type { CapnpOrphan, CapnpSegment, CapnpType, CapnpMessage } from './types.js';
import { createSegment } from './encoding.js';

/**
 * Create an orphan from segment data
 *
 * @param segment - Segment containing the data
 * @param offset - Offset of the data
 * @param size - Size of the data in bytes
 * @param type - Type of the data
 * @returns Orphan object
 */
export const createOrphan = (
  segment: CapnpSegment,
  offset: number,
  size: number,
  type: CapnpType
): CapnpOrphan => {
  return {
    segment,
    offset,
    size,
    type,
  };
};

/**
 * Adopt an orphan into a message
 *
 * This moves the orphan's data into the message's first segment.
 * The orphan is invalidated after adoption.
 *
 * @param message - Target message
 * @param orphan - Orphan to adopt
 * @returns Offset of the adopted data in the target message
 */
export const adoptOrphan = (message: CapnpMessage, orphan: CapnpOrphan): number => {
  const targetSegment = message.segments[0];
  if (!targetSegment) {
    throw new Error('Cannot adopt orphan into empty message');
  }

  // Allocate space in target segment
  const targetOffset = targetSegment.position;
  targetSegment.position += orphan.size;

  // Ensure target segment has enough space
  if (targetSegment.position > targetSegment.data.byteLength) {
    throw new Error('Target segment too small for orphan adoption');
  }

  // Copy data from orphan to target
  const sourceData = new Uint8Array(
    orphan.segment.data.buffer,
    orphan.segment.data.byteOffset + orphan.offset,
    orphan.size
  );
  const targetData = new Uint8Array(
    targetSegment.data.buffer,
    targetSegment.data.byteOffset + targetOffset,
    orphan.size
  );
  targetData.set(sourceData);

  return targetOffset;
};

/**
 * Disown data from a message, creating an orphan
 *
 * This creates a copy of the data as an orphan, leaving the original intact.
 *
 * @param segment - Segment containing the data
 * @param offset - Offset of the data
 * @param size - Size of the data
 * @param type - Type of the data
 * @returns Orphan object
 */
export const disownData = (
  segment: CapnpSegment,
  offset: number,
  size: number,
  type: CapnpType
): CapnpOrphan => {
  // Create a new segment for the orphan
  const orphanSegment = createSegment(size);

  // Copy data to orphan segment
  const sourceData = new Uint8Array(
    segment.data.buffer,
    segment.data.byteOffset + offset,
    size
  );
  const orphanData = new Uint8Array(orphanSegment.data.buffer, 0, size);
  orphanData.set(sourceData);

  orphanSegment.position = size;

  return createOrphan(orphanSegment, 0, size, type);
};

/**
 * Get the size of an orphan in bytes
 *
 * @param orphan - Orphan object
 * @returns Size in bytes
 */
export const getOrphanSize = (orphan: CapnpOrphan): number => {
  return orphan.size;
};

/**
 * Get the type of an orphan
 *
 * @param orphan - Orphan object
 * @returns Type of the orphaned data
 */
export const getOrphanType = (orphan: CapnpOrphan): CapnpType => {
  return orphan.type;
};
