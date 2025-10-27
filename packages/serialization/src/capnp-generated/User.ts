
// Generated Cap'n Proto TypeScript class
// Schema: User
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

export class User {
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

  get name(): string {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set name(value: string) {
    const pointerOffset = this.pointerSection + 0 * POINTER_SIZE_BYTES;
    const { offset: textOffset, byteLength } = writeText(this.segment, value);
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get email(): string {
    const pointerOffset = this.pointerSection + 1 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set email(value: string) {
    const pointerOffset = this.pointerSection + 1 * POINTER_SIZE_BYTES;
    const { offset: textOffset, byteLength } = writeText(this.segment, value);
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get role(): string {
    const pointerOffset = this.pointerSection + 2 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set role(value: string) {
    const pointerOffset = this.pointerSection + 2 * POINTER_SIZE_BYTES;
    const { offset: textOffset, byteLength } = writeText(this.segment, value);
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  static serialize(segment: CapnpSegment, value: any): number {
    const structOffset = allocate(segment, 32);
    const instance = new User(segment, structOffset);

    if (value.id !== undefined) {
      instance.id = value.id;
    }
    if (value.name !== undefined && value.name !== null) {
      instance.name = value.name;
    }
    if (value.email !== undefined && value.email !== null) {
      instance.email = value.email;
    }
    if (value.role !== undefined && value.role !== null) {
      instance.role = value.role;
    }

    return structOffset;
  }

  static deserialize(segment: CapnpSegment, offset: number): User {
    return new User(segment, offset);
  }

  // Helper method for compatibility - converts to plain object
  toObject(): any {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }
}
