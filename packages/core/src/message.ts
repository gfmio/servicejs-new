/**
 * @servicejs/core - Message
 *
 * Messages are the fundamental units of communication in ServiceJS.
 * All component interaction happens through message passing.
 *
 * Messages are:
 * - Immutable (readonly)
 * - Type-discriminated (via 'type' field)
 * - Serializable (for distributed messaging)
 */

/**
 * Base message interface.
 *
 * All messages must have a 'type' field for discrimination.
 * Additional fields can be added for message data.
 *
 * @example
 * ```typescript
 * interface IncrementMessage extends Message {
 *   readonly type: 'increment';
 *   readonly amount: number;
 * }
 *
 * interface DecrementMessage extends Message {
 *   readonly type: 'decrement';
 *   readonly amount: number;
 * }
 *
 * type CounterMessage = IncrementMessage | DecrementMessage;
 * ```
 */
export interface Message {
  /**
   * The message type discriminator.
   * Used for pattern matching and message routing.
   */
  readonly type: string;

  /**
   * Additional message data.
   * Use index signature to allow arbitrary fields.
   */
  readonly [key: string]: unknown;
}

/**
 * Extract the type literal from a message.
 *
 * @example
 * ```typescript
 * interface MyMessage extends Message {
 *   readonly type: 'my-message';
 *   readonly data: string;
 * }
 *
 * type MessageType = MessageType<MyMessage>; // 'my-message'
 * ```
 */
export type MessageType<M extends Message> = M['type'];

/**
 * Helper to create a message type with specific type literal.
 *
 * @example
 * ```typescript
 * type IncrementMessage = MessageOf<'increment', { amount: number }>;
 * // Equivalent to:
 * // interface IncrementMessage extends Message {
 * //   readonly type: 'increment';
 * //   readonly amount: number;
 * // }
 * ```
 */
export type MessageOf<T extends string, Data extends Record<string, unknown> = {}> = {
  readonly type: T;
} & {
  readonly [K in keyof Data]: Data[K];
};

/**
 * Extract all message types from a union of messages.
 *
 * @example
 * ```typescript
 * type CounterMessage =
 *   | { readonly type: 'increment'; readonly amount: number }
 *   | { readonly type: 'decrement'; readonly amount: number }
 *   | { readonly type: 'reset' };
 *
 * type Types = MessageTypes<CounterMessage>; // 'increment' | 'decrement' | 'reset'
 * ```
 */
export type MessageTypes<M extends Message> = M['type'];

/**
 * Filter messages by type.
 *
 * @example
 * ```typescript
 * type CounterMessage =
 *   | { readonly type: 'increment'; readonly amount: number }
 *   | { readonly type: 'decrement'; readonly amount: number };
 *
 * type IncrementMsg = FilterMessage<CounterMessage, 'increment'>;
 * // { readonly type: 'increment'; readonly amount: number }
 * ```
 */
export type FilterMessage<M extends Message, T extends MessageTypes<M>> = Extract<
  M,
  { type: T }
>;

/**
 * Check if a message is of a specific type (type guard).
 *
 * @param message - The message to check
 * @param type - The expected message type
 * @returns True if the message is of the specified type
 *
 * @example
 * ```typescript
 * type CounterMessage =
 *   | { readonly type: 'increment'; readonly amount: number }
 *   | { readonly type: 'decrement'; readonly amount: number };
 *
 * function handleMessage(msg: CounterMessage) {
 *   if (isMessageType(msg, 'increment')) {
 *     // msg is { readonly type: 'increment'; readonly amount: number }
 *     console.log('Increment by', msg.amount);
 *   }
 * }
 * ```
 */
export function isMessageType<M extends Message, T extends MessageTypes<M>>(
  message: M,
  type: T
): message is FilterMessage<M, T> {
  return message.type === type;
}

/**
 * Create a message.
 *
 * This is a simple helper that ensures the message has the correct type.
 *
 * @param type - The message type
 * @param data - The message data
 * @returns A properly typed message
 *
 * @example
 * ```typescript
 * const msg = createMessage('increment', { amount: 5 });
 * // { type: 'increment', amount: 5 }
 * ```
 */
export function createMessage<T extends string, D extends Record<string, unknown>>(
  type: T,
  data?: D
): MessageOf<T, D extends undefined ? {} : D> {
  return { type, ...(data || {}) } as MessageOf<T, D extends undefined ? {} : D>;
}

/**
 * Match a message against handlers.
 *
 * This is a helper for exhaustive pattern matching on messages.
 *
 * @param message - The message to match
 * @param handlers - Object with handlers for each message type
 * @returns The result of the matched handler
 *
 * @example
 * ```typescript
 * type CounterMessage =
 *   | { readonly type: 'increment'; readonly amount: number }
 *   | { readonly type: 'decrement'; readonly amount: number }
 *   | { readonly type: 'reset' };
 *
 * const result = matchMessage(message, {
 *   increment: (msg) => console.log('Increment by', msg.amount),
 *   decrement: (msg) => console.log('Decrement by', msg.amount),
 *   reset: () => console.log('Reset'),
 * });
 * ```
 */
export function matchMessage<
  M extends Message,
  R,
  Handlers extends { [K in MessageTypes<M>]: (msg: FilterMessage<M, K>) => R }
>(message: M, handlers: Handlers): R {
  const handler = handlers[message.type as MessageTypes<M>];
  if (!handler) {
    throw new Error(`No handler for message type: ${message.type}`);
  }
  return handler(message as any);
}
