/**
 * @servicejs/core - Capability
 *
 * Capabilities are the ONLY way to interact with components in ServiceJS.
 * They provide structural security - without a capability reference, you cannot access a component.
 *
 * Capabilities enforce:
 * - Principle of least privilege
 * - No ambient authority
 * - Explicit dependency injection
 * - Easy testing and mocking
 */

import type { Message } from './message.js';

/**
 * A capability that provides access to a component.
 *
 * Capabilities are unforgeable references that grant the ability to send messages to a component.
 * They are the foundation of ServiceJS's capability-based security model.
 *
 * Key properties:
 * - **Unforgeable**: Can only be created by authorized code
 * - **Transferable**: Can be passed to other components
 * - **Attenuatable**: Can be restricted before passing on
 * - **Composable**: Can be wrapped and combined
 *
 * @typeParam TMsg - The type of messages this capability accepts
 *
 * @example
 * ```typescript
 * type CounterMessage =
 *   | { type: 'increment'; amount: number }
 *   | { type: 'decrement'; amount: number };
 *
 * const counterCap: Capability<CounterMessage> = {
 *   send: (msg) => {
 *     console.log('Received:', msg);
 *   },
 * };
 *
 * counterCap.send({ type: 'increment', amount: 5 });
 * ```
 */
export interface Capability<TMsg extends Message> {
  /**
   * Send a message to the component.
   *
   * This is a fire-and-forget operation - it does not return a value.
   * For request/reply patterns, include a reply capability in the message.
   *
   * @param message - The message to send
   *
   * @example
   * ```typescript
   * cap.send({ type: 'increment', amount: 5 });
   * ```
   */
  send(message: TMsg): void;
}

/**
 * Create a basic capability from a send function.
 *
 * This is the simplest way to create a capability.
 *
 * @param send - The function to call when messages are sent
 * @returns A capability object
 *
 * @example
 * ```typescript
 * const cap = createCapability<MyMessage>((msg) => {
 *   console.log('Received:', msg);
 * });
 *
 * cap.send({ type: 'test' });
 * ```
 */
export function createCapability<TMsg extends Message>(
  send: (message: TMsg) => void
): Capability<TMsg> {
  return { send };
}

/**
 * Map a capability to accept different message types.
 *
 * This creates a new capability that transforms messages before sending them.
 *
 * @param capability - The target capability
 * @param transform - Function to transform messages
 * @returns A new capability that accepts different messages
 *
 * @example
 * ```typescript
 * type InternalMsg = { type: 'internal'; value: number };
 * type ExternalMsg = { type: 'external'; data: string };
 *
 * const internalCap: Capability<InternalMsg> = ...;
 *
 * const externalCap = mapCapability(
 *   internalCap,
 *   (msg: ExternalMsg) => ({ type: 'internal', value: parseInt(msg.data) })
 * );
 *
 * externalCap.send({ type: 'external', data: '42' });
 * // Sends { type: 'internal', value: 42 } to internalCap
 * ```
 */
export function mapCapability<TMsg extends Message, UMsg extends Message>(
  capability: Capability<TMsg>,
  transform: (message: UMsg) => TMsg
): Capability<UMsg> {
  return createCapability((message: UMsg) => {
    capability.send(transform(message));
  });
}

/**
 * Filter messages sent to a capability.
 *
 * Creates a new capability that only forwards messages matching a predicate.
 * Messages that don't match are silently dropped.
 *
 * @param capability - The target capability
 * @param predicate - Function to test messages
 * @returns A new capability that filters messages
 *
 * @example
 * ```typescript
 * type CounterMsg = { type: 'increment' | 'decrement'; amount: number };
 *
 * const cap: Capability<CounterMsg> = ...;
 *
 * // Only allow increments of 10 or less
 * const limited = filterCapability(cap, (msg) =>
 *   msg.type === 'increment' ? msg.amount <= 10 : true
 * );
 * ```
 */
export function filterCapability<TMsg extends Message>(
  capability: Capability<TMsg>,
  predicate: (message: TMsg) => boolean
): Capability<TMsg> {
  return createCapability((message: TMsg) => {
    if (predicate(message)) {
      capability.send(message);
    }
  });
}

/**
 * Compose multiple capabilities into one.
 *
 * Creates a capability that forwards messages to all provided capabilities.
 * Useful for broadcasting or logging.
 *
 * @param capabilities - Array of capabilities to compose
 * @returns A new capability that sends to all
 *
 * @example
 * ```typescript
 * const processorCap: Capability<MyMsg> = ...;
 * const loggerCap: Capability<MyMsg> = ...;
 *
 * const composed = composeCapabilities([processorCap, loggerCap]);
 *
 * composed.send({ type: 'test' });
 * // Sends to both processorCap and loggerCap
 * ```
 */
export function composeCapabilities<TMsg extends Message>(
  capabilities: readonly Capability<TMsg>[]
): Capability<TMsg> {
  return createCapability((message: TMsg) => {
    for (const cap of capabilities) {
      cap.send(message);
    }
  });
}

/**
 * Intercept messages sent to a capability.
 *
 * Creates a new capability that calls an interceptor function before forwarding messages.
 * The interceptor can inspect, log, or modify messages.
 *
 * @param capability - The target capability
 * @param interceptor - Function called before forwarding
 * @returns A new capability with interception
 *
 * @example
 * ```typescript
 * const cap: Capability<MyMsg> = ...;
 *
 * const logged = interceptCapability(cap, (msg) => {
 *   console.log('Sending:', msg);
 * });
 * ```
 */
export function interceptCapability<TMsg extends Message>(
  capability: Capability<TMsg>,
  interceptor: (message: TMsg) => void
): Capability<TMsg> {
  return createCapability((message: TMsg) => {
    interceptor(message);
    capability.send(message);
  });
}

/**
 * Create a null capability that discards all messages.
 *
 * Useful for testing or as a default value.
 *
 * @returns A capability that does nothing
 *
 * @example
 * ```typescript
 * const nullCap = nullCapability<MyMessage>();
 * nullCap.send({ type: 'test' }); // Does nothing
 * ```
 */
export function nullCapability<TMsg extends Message>(): Capability<TMsg> {
  return createCapability(() => {
    // Do nothing
  });
}

/**
 * Convert a capability to a readonly version.
 *
 * This is primarily for documentation - TypeScript's type system doesn't
 * prevent calling send(), but it makes intent clear.
 *
 * @param capability - The capability to make readonly
 * @returns The same capability with readonly type
 *
 * @example
 * ```typescript
 * const cap = createCapability<MyMsg>(...);
 * const readonlyCap = readonlyCapability(cap);
 * // Type system shows intent, though technically still callable
 * ```
 */
export function readonlyCapability<TMsg extends Message>(
  capability: Capability<TMsg>
): Readonly<Capability<TMsg>> {
  return capability;
}
