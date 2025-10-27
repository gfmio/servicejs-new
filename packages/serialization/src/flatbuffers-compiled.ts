/**
 * FlatBuffers Compiled Schemas
 *
 * These schemas use flatc-generated TypeScript code for optimal performance.
 * Supports nested structures, arrays, and all FlatBuffers features.
 */

import { Builder, ByteBuffer } from 'flatbuffers';
import type { FlatBuffersSchema } from './flatbuffers.js';
import { SimpleMessage } from '../schemas/generated/benchmark/simple-message.js';
import { ComplexMessage } from '../schemas/generated/benchmark/complex-message.js';
import { User } from '../schemas/generated/benchmark/user.js';
import { Metadata } from '../schemas/generated/benchmark/metadata.js';
import { LargeMessage } from '../schemas/generated/benchmark/large-message.js';
import { MatrixRow } from '../schemas/generated/benchmark/matrix-row.js';

/**
 * Simple message schema (compiled)
 */
export interface SimpleMessageData {
  id: number;
  name: string;
  active: boolean;
  score: number;
}

export const simpleMessageCompiledSchema: FlatBuffersSchema<SimpleMessageData> = {
  encode(builder: Builder, value: SimpleMessageData): number {
    const nameOffset = builder.createString(value.name);

    return SimpleMessage.createSimpleMessage(
      builder,
      value.id,
      nameOffset,
      value.active,
      value.score
    );
  },

  decode(buffer: ByteBuffer): SimpleMessageData {
    const msg = SimpleMessage.getRootAsSimpleMessage(buffer);
    return {
      id: msg.id(),
      name: msg.name() ?? '',
      active: msg.active(),
      score: msg.score(),
    };
  },
};

/**
 * Complex message schema (compiled)
 */
export interface ComplexMessageData {
  id: number;
  timestamp: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  tags: string[];
  metadata: {
    source: string;
    priority: number;
    flags: boolean[];
  };
}

export const complexMessageCompiledSchema: FlatBuffersSchema<ComplexMessageData> = {
  encode(builder: Builder, value: ComplexMessageData): number {
    // Create strings first
    const userNameOffset = builder.createString(value.user.name);
    const userEmailOffset = builder.createString(value.user.email);
    const userRoleOffset = builder.createString(value.user.role);

    // Create user
    User.startUser(builder);
    User.addId(builder, value.user.id);
    User.addName(builder, userNameOffset);
    User.addEmail(builder, userEmailOffset);
    User.addRole(builder, userRoleOffset);
    const userOffset = User.endUser(builder);

    // Create tags array
    const tagOffsets = value.tags.map(tag => builder.createString(tag));
    const tagsOffset = ComplexMessage.createTagsVector(builder, tagOffsets);

    // Create metadata
    const metadataSourceOffset = builder.createString(value.metadata.source);
    const metadataFlagsOffset = Metadata.createFlagsVector(builder, value.metadata.flags);
    Metadata.startMetadata(builder);
    Metadata.addSource(builder, metadataSourceOffset);
    Metadata.addPriority(builder, value.metadata.priority);
    Metadata.addFlags(builder, metadataFlagsOffset);
    const metadataOffset = Metadata.endMetadata(builder);

    // Create complex message
    ComplexMessage.startComplexMessage(builder);
    ComplexMessage.addId(builder, value.id);
    ComplexMessage.addTimestamp(builder, BigInt(value.timestamp));
    ComplexMessage.addUser(builder, userOffset);
    ComplexMessage.addTags(builder, tagsOffset);
    ComplexMessage.addMetadata(builder, metadataOffset);
    return ComplexMessage.endComplexMessage(builder);
  },

  decode(buffer: ByteBuffer): ComplexMessageData {
    const msg = ComplexMessage.getRootAsComplexMessage(buffer);
    const user = msg.user()!;
    const metadata = msg.metadata()!;

    const tags: string[] = [];
    for (let i = 0; i < msg.tagsLength(); i++) {
      const tag = msg.tags(i);
      if (tag) tags.push(tag);
    }

    const flags: boolean[] = [];
    for (let i = 0; i < metadata.flagsLength(); i++) {
      flags.push(metadata.flags(i));
    }

    return {
      id: msg.id(),
      timestamp: Number(msg.timestamp()),
      user: {
        id: user.id(),
        name: user.name() ?? '',
        email: user.email() ?? '',
        role: user.role() ?? '',
      },
      tags,
      metadata: {
        source: metadata.source() ?? '',
        priority: metadata.priority(),
        flags,
      },
    };
  },
};

/**
 * Large message schema (compiled)
 */
export interface LargeMessageData {
  id: number;
  coordinates: number[];
  labels: string[];
  matrix: number[][];
}

export const largeMessageCompiledSchema: FlatBuffersSchema<LargeMessageData> = {
  encode(builder: Builder, value: LargeMessageData): number {
    // Create coordinates array
    const coordinatesOffset = LargeMessage.createCoordinatesVector(builder, value.coordinates);

    // Create labels array
    const labelOffsets = value.labels.map(label => builder.createString(label));
    const labelsOffset = LargeMessage.createLabelsVector(builder, labelOffsets);

    // Create matrix (array of MatrixRow)
    const matrixRowOffsets: number[] = [];
    for (const row of value.matrix) {
      const rowValuesOffset = MatrixRow.createValuesVector(builder, row);
      MatrixRow.startMatrixRow(builder);
      MatrixRow.addValues(builder, rowValuesOffset);
      matrixRowOffsets.push(MatrixRow.endMatrixRow(builder));
    }
    const matrixOffset = LargeMessage.createMatrixVector(builder, matrixRowOffsets);

    // Create large message
    LargeMessage.startLargeMessage(builder);
    LargeMessage.addId(builder, value.id);
    LargeMessage.addCoordinates(builder, coordinatesOffset);
    LargeMessage.addLabels(builder, labelsOffset);
    LargeMessage.addMatrix(builder, matrixOffset);
    return LargeMessage.endLargeMessage(builder);
  },

  decode(buffer: ByteBuffer): LargeMessageData {
    const msg = LargeMessage.getRootAsLargeMessage(buffer);

    const coordinates: number[] = [];
    for (let i = 0; i < msg.coordinatesLength(); i++) {
      coordinates.push(msg.coordinates(i));
    }

    const labels: string[] = [];
    for (let i = 0; i < msg.labelsLength(); i++) {
      const label = msg.labels(i);
      if (label) labels.push(label);
    }

    const matrix: number[][] = [];
    for (let i = 0; i < msg.matrixLength(); i++) {
      const row = msg.matrix(i)!;
      const values: number[] = [];
      for (let j = 0; j < row.valuesLength(); j++) {
        values.push(row.values(j));
      }
      matrix.push(values);
    }

    return {
      id: msg.id(),
      coordinates,
      labels,
      matrix,
    };
  },
};
