/**
 * Local Transport
 *
 * In-process transport for local communication without serialization.
 */

import type { URN } from '@servicejs/core';
import type { Result } from '@servicejs/result';
import { ok, err } from '@servicejs/result';
import type { Transport, MessageEnvelope, TransportError } from './transport.js';

/**
 * Local transport configuration
 */
export interface LocalTransportConfig {
  /** URN for this local transport endpoint */
  readonly localUrn: URN;
}

/**
 * Create a local transport
 *
 * Local transports:
 * - Enable in-process communication
 * - Do not serialize messages (direct references)
 * - Have no network overhead
 * - Support multiple endpoints via a shared registry
 *
 * @example
 * ```typescript
 * const transport = createLocalTransport({
 *   localUrn: 'urn:local:component-a'
 * });
 *
 * await transport.connect();
 *
 * transport.onReceive((envelope) => {
 *   console.log('Received:', envelope.message);
 * });
 *
 * await transport.send({
 *   from: 'urn:local:component-a',
 *   to: 'urn:local:component-b',
 *   message: { type: 'hello' }
 * });
 * ```
 */
export const createLocalTransport = (config: LocalTransportConfig): Transport => {
  const { localUrn } = config;

  let connected = false;
  let receiveHandler: ((envelope: MessageEnvelope) => void) | undefined;
  let errorHandler: ((error: TransportError) => void) | undefined;

  const transport: Transport = {
    connect: async (urn?: URN): Promise<Result<void, TransportError>> => {
      if (connected) {
        return ok(undefined);
      }

      // Register this transport in the local registry
      localTransportRegistry.register(localUrn, transport as Transport & { _deliverMessage: (envelope: MessageEnvelope) => void });
      connected = true;

      return ok(undefined);
    },

    disconnect: async (): Promise<Result<void, TransportError>> => {
      if (!connected) {
        return ok(undefined);
      }

      // Unregister from local registry
      localTransportRegistry.unregister(localUrn);
      connected = false;

      return ok(undefined);
    },

    send: async (envelope: MessageEnvelope): Promise<Result<void, TransportError>> => {
      if (!connected) {
        return err({
          type: 'NOT_CONNECTED',
          urn: localUrn,
        });
      }

      try {
        // Look up destination transport in local registry
        const destinationTransport = localTransportRegistry.get(envelope.to);

        if (!destinationTransport) {
          return err({
            type: 'SEND_FAILED',
            urn: envelope.to,
            error: new Error(`No local transport found for URN: ${envelope.to}`),
          });
        }

        // Deliver message directly (no serialization needed for local)
        destinationTransport._deliverMessage(envelope);

        return ok(undefined);
      } catch (error) {
        return err({
          type: 'SEND_FAILED',
          urn: envelope.to,
          error,
        });
      }
    },

    onReceive: (handler: (envelope: MessageEnvelope) => void): void => {
      receiveHandler = handler;
    },

    onError: (handler: (error: TransportError) => void): void => {
      errorHandler = handler;
    },

    isConnected: (): boolean => {
      return connected;
    },

    getLocalUrn: (): URN => {
      return localUrn;
    },

    // Internal method for delivering messages (not part of public API)
    _deliverMessage: (envelope: MessageEnvelope): void => {
      if (receiveHandler) {
        try {
          receiveHandler(envelope);
        } catch (error) {
          if (errorHandler) {
            errorHandler({
              type: 'SEND_FAILED',
              urn: envelope.from,
              error,
            });
          }
        }
      }
    },
  } as Transport & { _deliverMessage: (envelope: MessageEnvelope) => void };

  return transport;
};

/**
 * Local transport registry
 *
 * Maintains a registry of all local transports for in-process routing.
 */
class LocalTransportRegistry {
  private transports = new Map<URN, Transport & { _deliverMessage: (envelope: MessageEnvelope) => void }>();

  register(urn: URN, transport: Transport & { _deliverMessage: (envelope: MessageEnvelope) => void }): void {
    this.transports.set(urn, transport);
  }

  unregister(urn: URN): void {
    this.transports.delete(urn);
  }

  get(urn: URN): (Transport & { _deliverMessage: (envelope: MessageEnvelope) => void }) | undefined {
    return this.transports.get(urn);
  }

  clear(): void {
    this.transports.clear();
  }

  size(): number {
    return this.transports.size;
  }
}

/**
 * Global local transport registry
 */
const localTransportRegistry = new LocalTransportRegistry();

/**
 * Get the local transport registry (for testing)
 */
export const getLocalTransportRegistry = (): {
  clear: () => void;
  size: () => number;
} => ({
  clear: () => localTransportRegistry.clear(),
  size: () => localTransportRegistry.size(),
});
