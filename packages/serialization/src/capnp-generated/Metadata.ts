
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
  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {}

  // Getters and Setters

  get source(): string {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set source(value: string) {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const textOffset = writeText(this.segment, value);
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(value).length;
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get priority(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set priority(value: number) {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get flags(): boolean[] {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 1 * POINTER_SIZE_BYTES;
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

  static deserialize(segment: CapnpSegment, offset: number): any {
    const instance = new Metadata(segment, offset);
    return {
      source: instance.source,
      priority: instance.priority,
      flags: instance.flags,
    };
  }
}
