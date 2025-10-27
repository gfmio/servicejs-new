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
 * - Special tags 0x00 and 0xff for runs of zeros and runs of 0xff
 */

/**
 * Pack a message using Cap'n Proto packed encoding
 *
 * @param data - Unpacked message data
 * @returns Packed message data
 */
export const pack = (data: Uint8Array): Uint8Array => {
  const result: number[] = [];
  let i = 0;

  while (i < data.length) {
    // Process 8-byte words
    const wordStart = i;
    const wordEnd = Math.min(i + 8, data.length);
    const word = data.slice(wordStart, wordEnd);

    // Pad word to 8 bytes if needed
    while (word.length < 8) {
      const padded = new Uint8Array(8);
      padded.set(word);
      word.set(padded);
    }

    // Check for special cases: all zeros or all 0xff
    const allZero = word.every((b) => b === 0);
    const allFF = word.every((b) => b === 0xff);

    if (allZero) {
      // Count consecutive zero words
      let zeroCount = 1;
      let j = i + 8;
      while (j < data.length && zeroCount < 255) {
        const nextWord = data.slice(j, Math.min(j + 8, data.length));
        if (nextWord.length === 8 && nextWord.every((b) => b === 0)) {
          zeroCount++;
          j += 8;
        } else {
          break;
        }
      }

      // Write tag 0x00 followed by count
      result.push(0x00, zeroCount);
      i += zeroCount * 8;
    } else if (allFF) {
      // Count consecutive 0xff words
      let ffCount = 1;
      let j = i + 8;
      while (j < data.length && ffCount < 255) {
        const nextWord = data.slice(j, Math.min(j + 8, data.length));
        if (nextWord.length === 8 && nextWord.every((b) => b === 0xff)) {
          ffCount++;
          j += 8;
        } else {
          break;
        }
      }

      // Write tag 0xff followed by count
      result.push(0xff, ffCount);
      i += ffCount * 8;
    } else {
      // Normal word: create tag byte
      let tag = 0;
      const nonZeroBytes: number[] = [];

      for (let j = 0; j < 8; j++) {
        const byte = word[j];
        if (byte !== undefined && byte !== 0) {
          tag |= 1 << j;
          nonZeroBytes.push(byte);
        }
      }

      // Write tag followed by non-zero bytes
      result.push(tag, ...nonZeroBytes);
      i += 8;
    }
  }

  return new Uint8Array(result);
};

/**
 * Unpack a message from Cap'n Proto packed encoding
 *
 * @param data - Packed message data
 * @returns Unpacked message data
 */
export const unpack = (data: Uint8Array): Uint8Array => {
  const result: number[] = [];
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
      for (let j = 0; j < count * 8; j++) {
        result.push(0);
      }
    } else if (tag === 0xff) {
      // Run of 0xff words
      if (i >= data.length) {
        throw new Error('Packed encoding error: missing count after 0xff tag');
      }
      const count = data[i++];
      if (count === undefined) {
        throw new Error('Packed encoding error: missing count');
      }
      for (let j = 0; j < count * 8; j++) {
        result.push(0xff);
      }
    } else {
      // Normal word: tag indicates which bytes are non-zero
      for (let bit = 0; bit < 8; bit++) {
        if (tag & (1 << bit)) {
          if (i >= data.length) {
            throw new Error('Packed encoding error: unexpected end of data');
          }
          const byte = data[i++];
          if (byte !== undefined) {
            result.push(byte);
          }
        } else {
          result.push(0);
        }
      }
    }
  }

  return new Uint8Array(result);
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
