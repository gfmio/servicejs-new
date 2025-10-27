
// Generated Cap'n Proto TypeScript class
// Schema: ComplexMessage
// Data words: 9, Pointer count: 3

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
import { User } from './User.js';
import { Metadata } from './Metadata.js';

const BYTES_PER_WORD = 8;
const POINTER_SIZE_BYTES = 8;

export class ComplexMessage {
  // Cached offsets for performance
  private readonly dataSize: number;
  private readonly pointerSection: number;

  constructor(
    private segment: CapnpSegment,
    private offset: number
  ) {
    this.dataSize = 9 * BYTES_PER_WORD;
    this.pointerSection = offset + this.dataSize;
  }

  // Getters and Setters

  get id(): number {
    return this.segment.data.getUint32(this.offset + 0, true);
  }

  set id(value: number) {
    this.segment.data.setUint32(this.offset + 0, value, true);
  }

  get timestamp(): number {
    return this.segment.data.getFloat64(this.offset + 8, true);
  }

  set timestamp(value: number) {
    this.segment.data.setFloat64(this.offset + 8, value, true);
  }

  get user(): User | null {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 0) return null; // Not a struct pointer
    const targetOffset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
    return new User(this.segment, targetOffset);
  }

  get tags(): string[] {
    const pointerOffset = this.pointerSection + 1 * POINTER_SIZE_BYTES;
    return readListGeneric(this.segment, pointerOffset, "text");
  }

  set tags(value: string[]) {
    // List writing will be handled in serialize method
  }

  get metadata(): Metadata | null {
    const pointerOffset = this.pointerSection + 2 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 0) return null; // Not a struct pointer
    const targetOffset = pointerOffset + POINTER_SIZE_BYTES + ((pointer >> 2) * BYTES_PER_WORD);
    return new Metadata(this.segment, targetOffset);
  }

  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, 96);
    const instance = new ComplexMessage(segment, structOffset);

    if (value.id !== undefined) {
      instance.id = value.id;
    }
    if (value.timestamp !== undefined) {
      instance.timestamp = value.timestamp;
    }
    if (value.user) {
      const nestedOffset = User.serialize(segment, value.user);
      const pointerOffset = structOffset + 72 + 0 * POINTER_SIZE_BYTES;
      writeStructPointer(segment, pointerOffset, nestedOffset, 1, 3);
    }
    if (Array.isArray(value.tags)) {
      const listOffset = writeList(segment, "text", value.tags);
      const pointerOffset = structOffset + 72 + 1 * POINTER_SIZE_BYTES;
      const elementSizeCode = getElementSizeCode("text");
      writeListPointer(segment, pointerOffset, listOffset, value.tags.length, elementSizeCode);
    }
    if (value.metadata) {
      const nestedOffset = Metadata.serialize(segment, value.metadata);
      const pointerOffset = structOffset + 72 + 2 * POINTER_SIZE_BYTES;
      writeStructPointer(segment, pointerOffset, nestedOffset, 1, 2);
    }

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): ComplexMessage {
    return new ComplexMessage(segment, offset);
  }

  // Helper method for compatibility - converts to plain object
  toObject(): any {
    return {
      id: this.id,
      timestamp: this.timestamp,
      user: this.user?.toObject() ?? null,
      tags: this.tags,
      metadata: this.metadata?.toObject() ?? null,
    };
  }
}
