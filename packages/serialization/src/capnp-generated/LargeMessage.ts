
// Generated Cap'n Proto TypeScript class
// Schema: LargeMessage
// Data words: 1, Pointer count: 3

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

export class LargeMessage {
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

  get id(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set id(value: number) {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get coordinates(): number[] {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, "float64");
  }

  set coordinates(value: number[]) {
    // List writing will be handled in serialize method
  }

  get labels(): string[] {
    const pointerOffset = this.pointerSection + 1 * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, "text");
  }

  set labels(value: string[]) {
    // List writing will be handled in serialize method
  }

  get matrix(): number[][] {
    const pointerOffset = this.pointerSection + 2 * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, {"kind":"list","elementType":"float64"});
  }

  set matrix(value: number[][]) {
    // List writing will be handled in serialize method
  }

  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, 32);
    const instance = new LargeMessage(segment, structOffset);

    if (value.id !== undefined) {
      instance.id = value.id;
    }
    if (Array.isArray(value.coordinates)) {
      const listOffset = writeList(segment, "float64", value.coordinates);
      const pointerOffset = structOffset + 8 + 0 * POINTER_SIZE_BYTES;
      const elementSizeCode = getElementSizeCode("float64");
      writeListPointer(segment, pointerOffset, listOffset, value.coordinates.length, elementSizeCode);
    }
    if (Array.isArray(value.labels)) {
      const listOffset = writeList(segment, "text", value.labels);
      const pointerOffset = structOffset + 8 + 1 * POINTER_SIZE_BYTES;
      const elementSizeCode = getElementSizeCode("text");
      writeListPointer(segment, pointerOffset, listOffset, value.labels.length, elementSizeCode);
    }
    if (Array.isArray(value.matrix)) {
      const listOffset = writeList(segment, {"kind":"list","elementType":"float64"}, value.matrix);
      const pointerOffset = structOffset + 8 + 2 * POINTER_SIZE_BYTES;
      writeListPointer(segment, pointerOffset, listOffset, value.matrix.length, 6);
    }

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): LargeMessage {
    return new LargeMessage(segment, offset);
  }

  // Helper method for compatibility - converts to plain object
  toObject(): any {
    return {
      id: this.id,
      coordinates: this.coordinates,
      labels: this.labels,
      matrix: this.matrix,
    };
  }
}
