
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
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set name(value: string) {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 0 * POINTER_SIZE_BYTES;
    const textOffset = writeText(this.segment, value);
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(value).length;
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get email(): string {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 1 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set email(value: string) {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 1 * POINTER_SIZE_BYTES;
    const textOffset = writeText(this.segment, value);
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(value).length;
    writeListPointer(this.segment, pointerOffset, textOffset, byteLength + 1, 2);
  }

  get role(): string {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 2 * POINTER_SIZE_BYTES;
    const pointer = this.segment.data.getUint32(pointerOffset, true);
    if ((pointer & 3) !== 1) return ''; // Not a list pointer
    return readText(this.segment, pointerOffset);
  }

  set role(value: string) {
    const dataSize = 1 * BYTES_PER_WORD;
    const pointerOffset = this.offset + dataSize + 2 * POINTER_SIZE_BYTES;
    const textOffset = writeText(this.segment, value);
    const encoder = new TextEncoder();
    const byteLength = encoder.encode(value).length;
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

  static deserialize(segment: CapnpSegment, offset: number): any {
    const instance = new User(segment, offset);
    return {
      id: instance.id,
      name: instance.name,
      email: instance.email,
      role: instance.role,
    };
  }
}
