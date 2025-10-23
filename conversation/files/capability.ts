import type { Message, Channel } from './channel.js';
import type { Component } from './component.js';

/**
 * A capability object that mediates access to a component.
 * This provides:
 * 1. Security - only holders of the capability can interact with the component
 * 2. Adaptation - messages can be transformed/validated before delivery
 * 3. Session types - the capability can change what operations are available
 */
export interface Capability<TMessage extends Message> {
  /**
   * Send a message through this capability
   */
  send(message: TMessage): void;
}

/**
 * Configuration for creating a capability
 */
export interface CapabilityConfig<TIn extends Message, TOut extends Message> {
  /**
   * The target component to send messages to
   */
  readonly target: Component<any, TOut, any>;
  
  /**
   * Optional transformer to adapt messages from input type to output type
   */
  readonly transform?: (message: TIn) => TOut;
  
  /**
   * Optional validator to check if a message is allowed
   */
  readonly validate?: (message: TIn) => boolean;
}

/**
 * Create a capability that mediates access to a component
 */
export const createCapability = <TIn extends Message, TOut extends Message = TIn>(
  config: CapabilityConfig<TIn, TOut>
): Capability<TIn> => {
  return {
    send(message: TIn): void {
      // Validate if validator is provided
      if (config.validate && !config.validate(message)) {
        // Message is rejected - could emit to error handler instead
        return;
      }
      
      // Transform if transformer is provided
      const outMessage = config.transform ? config.transform(message) : (message as any as TOut);
      
      // Send to target component
      config.target.process(outMessage);
    },
  };
};

/**
 * Convert a capability to a channel for convenience
 */
export const capabilityAsChannel = <TMessage extends Message>(
  capability: Capability<TMessage>
): Channel<TMessage> => {
  return {
    send: (message: TMessage) => capability.send(message),
  };
};

/**
 * Compose multiple capabilities to create a chain of transformations/validations
 */
export const composeCapabilities = <T1 extends Message, T2 extends Message, T3 extends Message>(
  cap1: Capability<T2>,
  transform: (message: T1) => T2
): Capability<T1> => {
  return {
    send(message: T1): void {
      const transformed = transform(message);
      cap1.send(transformed);
    },
  };
};

/**
 * Create a capability that can only send a specific subset of messages
 */
export const restrictCapability = <TMessage extends Message>(
  capability: Capability<TMessage>,
  predicate: (message: TMessage) => boolean
): Capability<TMessage> => {
  return {
    send(message: TMessage): void {
      if (predicate(message)) {
        capability.send(message);
      }
    },
  };
};
