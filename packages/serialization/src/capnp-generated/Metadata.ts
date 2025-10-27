
// Generated Cap'n Proto TypeScript class
// Schema: Metadata
// Data words: 1, Pointer count: 2

import type { CapnpSegment } from '../capnp/types.js';
import {
  allocate,
  writeText,
  readText,
  writeListPointer,
  readList as readListGeneric,
  writeList,
  writeStructPointer,
  getElementSizeCode
} from '../capnp/encoding.js';
const BYTES_PER_WORD = 8;
const POINTER_SIZE_BYTES = 8;

export class Metadata {
  // Cached offsets for performance
  private readonly dataSize: number;
  private readonly pointerSection: number;

  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {
    this.dataSize = 1 * BYTES_PER_WORD;
    this.pointerSection = offset + this.dataSize;
  }

  // Getters and Setters

  get source(): string {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set source(value: string) {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    const { offset: textOffset, byteLength } = writeText(this.segment, value);
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get priority(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set priority(value: number) {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get flags(): boolean[] {
    const pointerOffset = this.pointerSection + 1 * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, "bool");
  }

  set flags(value: boolean[]) {
    // List writing will be handled in serialize method
  }

  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, 24);
    const instance = new Metadata(segment, structOffset);

    if (value.source !== undefined && value.source !== null) {
      instance.source = value.source;
    }
    if (value.priority !== undefined) {
      instance.priority = value.priority;
    }
    if (Array.isArray(value.flags)) {
      const listOffset = writeList(segment, "bool", value.flags);
      const pointerOffset = structOffset + 8 + 1 * POINTER_SIZE_BYTES;
      const elementSizeCode = getElementSizeCode("bool");
      writeListPointer(segment, pointerOffset, listOffset, value.flags.length, elementSizeCode);
    }

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): Metadata {
    return new Metadata(segment, offset);
  }

  // Helper method for compatibility - converts to plain object
  toObject(): any {
    return {
      source: this.source,
      priority: this.priority,
      flags: this.flags,
    };
  }
}
