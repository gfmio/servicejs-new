/**
 * Cap'n Proto Packed Encoding
 *
 * Packed encoding is a compression scheme that reduces wire size
 * by encoding runs of zero bytes efficiently. It adds about 2 bytes
 * per 2KB of data in the worst case, but typically saves 30-50% space.
 *
 * Algorithm:
 * - For each 8-byte word, write a tag byte indicating which bytes are non-zero
 * - Only write the non-zero bytes
 * - Special tag 0x00: followed by count N = next N words are all zeros (skip)
 * - Special tag 0xff: followed by count N = next N words are literal/unpacked (copy N*8 bytes as-is)
 */

/**
 * Pack a message using Cap'n Proto packed encoding (optimized)
 *
 * @param data - Unpacked message data
 * @returns Packed message data
 */
export const pack = (data: Uint8Array): Uint8Array => {
  // Pre-allocate worst-case size (2x + overhead for tags)
  const maxSize = data.length * 2;
  const result = new Uint8Array(maxSize);
  let resultPos = 0;
  let i = 0;

  while (i < data.length) {
    // Process 8-byte words
    const wordEnd = Math.min(i + 8, data.length);
    const wordSize = wordEnd - i;

    // Fast path: check if word is all zeros
    let allZero = true;
    for (let j = i; j < wordEnd; j++) {
      if (data[j] !== 0) {
        allZero = false;
        break;
      }
    }

    const isFullWord = wordSize === 8;

    if (allZero && isFullWord) {
      // Count consecutive zero words
      let zeroCount = 1;
      let j = i + 8;
      while (j + 7 < data.length && zeroCount < 255) {
        let isZeroWord = true;
        for (let k = j; k < j + 8; k++) {
          if (data[k] !== 0) {
            isZeroWord = false;
            break;
          }
        }
        if (isZeroWord) {
          zeroCount++;
          j += 8;
        } else {
          break;
        }
      }

      // Write tag 0x00 followed by count
      result[resultPos++] = 0x00;
      result[resultPos++] = zeroCount;
      i += zeroCount * 8;
    } else {
      // Normal word: create tag byte and collect non-zero bytes
      let tag = 0;
      const nonZeroStart = resultPos + 1; // Reserve space for tag
      let nonZeroPos = nonZeroStart;

      for (let j = 0; j < 8; j++) {
        const byte = i + j < data.length ? data[i + j]! : 0;
        if (byte !== 0) {
          tag |= 1 << j;
          result[nonZeroPos++] = byte;
        }
      }

      // Write tag
      result[resultPos] = tag;
      resultPos = nonZeroPos;
      i += 8;
    }
  }

  // Return trimmed result
  return result.subarray(0, resultPos);
};

/**
 * Unpack a message from Cap'n Proto packed encoding (optimized)
 *
 * @param data - Packed message data
 * @returns Unpacked message data
 */
export const unpack = (data: Uint8Array): Uint8Array => {
  // Estimate unpacked size (worst case: every tag represents 8 bytes)
  const estimatedSize = data.length * 8;
  const result = new Uint8Array(estimatedSize);
  let resultPos = 0;
  let i = 0;

  while (i < data.length) {
    const tag = data[i++];
    if (tag === undefined) break;

    if (tag === 0x00) {
      // Run of zero words
      if (i >= data.length) {
        throw new Error('Packed encoding error: missing count after 0x00 tag');
      }
      const count = data[i++];
      if (count === undefined) {
        throw new Error('Packed encoding error: missing count');
      }
      // Fill zeros (already zero in Uint8Array, just advance position)
      resultPos += count * 8;
    } else {
      // Normal word: tag indicates which bytes are non-zero
      for (let bit = 0; bit < 8; bit++) {
        if (tag & (1 << bit)) {
          if (i >= data.length) {
            throw new Error('Packed encoding error: unexpected end of data');
          }
          result[resultPos++] = data[i++]!;
        } else {
          // Zero byte (already zero, just advance)
          resultPos++;
        }
      }
    }
  }

  // Return trimmed result
  return result.subarray(0, resultPos);
};

/**
 * Estimate packed size for a buffer
 *
 * This is a conservative estimate used for buffer allocation.
 * Actual packed size may be smaller.
 *
 * @param unpackedSize - Size of unpacked data
 * @returns Estimated packed size
 */
export const estimatePackedSize = (unpackedSize: number): number => {
  // Worst case: 1 tag byte per 8 bytes of data
  // Plus 2 bytes per 2KB (statistical overhead)
  const words = Math.ceil(unpackedSize / 8);
  const worstCase = words + words; // tag + all bytes non-zero
  const overhead = Math.ceil(unpackedSize / 1024);
  return worstCase + overhead;
};
