
// Generated Cap'n Proto TypeScript class
// Schema: SimpleMessage
// Data words: 9, Pointer count: 1

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

export class SimpleMessage {
  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {}

  // Getters and Setters

  get id(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set id(value: number) {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get name(): string {
    const dataSize = 9 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set name(value: string) {
    const dataSize = 9 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const textOffset = writeText(this.segment, value);
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(value).length;
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get active(): boolean {
    return this.segment.data.getUint8(this.offset + 4) !== 0;
  }

  set active(value: boolean) {
    this.segment.data.setUint8(this.offset + 4, value ? 1 : 0);
  }

  get score(): number {
    return this.segment.data.getFloat64(this.offset + 8, true);
  }

  set score(value: number) {
    this.segment.data.setFloat64(this.offset + 8, value, true);
  }

  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, 80);
    const instance = new SimpleMessage(segment, structOffset);

    if (value.id !== undefined) {
      instance.id = value.id;
    }
    if (value.name !== undefined && value.name !== null) {
      instance.name = value.name;
    }
    if (value.active !== undefined) {
      instance.active = value.active;
    }
    if (value.score !== undefined) {
      instance.score = value.score;
    }

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): any {
    const instance = new SimpleMessage(segment, offset);
    return {
      id: instance.id,
      name: instance.name,
      active: instance.active,
      score: instance.score,
    };
  }
}
