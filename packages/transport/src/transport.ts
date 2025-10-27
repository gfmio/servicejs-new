/**
 * Transport Abstraction
 *
 * Defines the core transport interface for location-transparent communication.
 */

import type { Message, URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';

/**
 * Transport error types
 */
export type TransportError =
  | { type: 'NOT_CONNECTED'; urn?: URN }
  | { type: 'SEND_FAILED'; urn?: URN; error: unknown }
  | { type: 'SERIALIZATION_FAILED'; message: Message; error: unknown }
  | { type: 'DESERIALIZATION_FAILED'; data: unknown; error: unknown }
  | { type: 'INVALID_MESSAGE'; data: unknown; reason: string }
  | { type: 'CONNECTION_CLOSED'; urn?: URN }
  | { type: 'CONNECTION_FAILED'; urn?: URN; error: unknown };

/**
 * Message envelope for transport
 *
 * Wraps messages with metadata for routing and delivery.
 */
export interface MessageEnvelope {
  /** Source URN (sender) */
  readonly from: URN;
  /** Destination URN (receiver) */
  readonly to: URN;
  /** The actual message payload */
  readonly message: Message;
  /** Optional correlation ID for request-reply */
  readonly correlationId?: string;
  /** Timestamp when message was sent */
  readonly timestamp?: number;
}

/**
 * Transport interface
 *
 * Abstracts the underlying communication mechanism for location-transparent messaging.
 *
 * Transports handle:
 * - Establishing connections
 * - Sending messages
 * - Receiving messages
 * - Connection lifecycle
 */
export interface Transport {
  /**
   * Connect to the transport endpoint
   *
   * @param urn - Optional URN of the remote endpoint
   * @returns Result indicating success or failure
   */
  connect(urn?: URN): Promise<Result<void, TransportError>>;

  /**
   * Disconnect from the transport
   *
   * @returns Result indicating success or failure
   */
  disconnect(): Promise<Result<void, TransportError>>;

  /**
   * Send a message through the transport
   *
   * @param envelope - Message envelope to send
   * @returns Result indicating success or failure
   */
  send(envelope: MessageEnvelope): Promise<Result<void, TransportError>>;

  /**
   * Register a handler for receiving messages
   *
   * @param handler - Callback invoked when messages are received
   */
  onReceive(handler: (envelope: MessageEnvelope) => void): void;

  /**
   * Register a handler for connection errors
   *
   * @param handler - Callback invoked when errors occur
   */
  onError(handler: (error: TransportError) => void): void;

  /**
   * Check if transport is connected
   *
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Get the local URN for this transport
   *
   * @returns The URN identifying this transport endpoint
   */
  getLocalUrn(): URN;
}

/**
 * Transport factory function type
 */
export type TransportFactory = (config?: unknown) => Transport;
