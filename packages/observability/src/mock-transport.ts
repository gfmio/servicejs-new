/**
 * Mock transport for testing
 *
 * Provides a mock transport that captures messages for testing and allows
 * injection of messages to simulate receiving.
 */

// ============================================================================
// Mock Transport
// ============================================================================

/**
 * Captured message with metadata
 */
export interface CapturedMessage<T = unknown> {
  /** The message that was sent */
  message: T;

  /** Target identifier (if available) */
  target?: string;

  /** Timestamp when message was captured */
  timestamp: number;

  /** Sequence number (order in which it was sent) */
  sequence: number;
}

/**
 * Message predicate function
 */
export type MessagePredicate<T = unknown> = (message: T) => boolean;

/**
 * Mock transport for testing
 */
export interface MockTransport<T = unknown> {
  /** Send a message through the transport */
  send(message: T, target?: string): void;

  /** Get all captured messages */
  getSentMessages(): CapturedMessage<T>[];

  /** Get messages sent to a specific target */
  getMessagesSentTo(target: string): CapturedMessage<T>[];

  /** Get messages matching a predicate */
  getMessagesMatching(predicate: MessagePredicate<T>): CapturedMessage<T>[];

  /** Clear captured messages */
  clear(): void;

  /** Inject a received message (simulates receiving) */
  injectReceived(message: T): void;

  /** Get injected (received) messages */
  getReceivedMessages(): CapturedMessage<T>[];

  /** Set a callback to be called when a message is received */
  onReceive(callback: (message: T) => void): void;

  /** Assert that a message was sent */
  assertSent(predicate: MessagePredicate<T>, description?: string): CapturedMessage<T>;

  /** Assert that a message was sent to a specific target */
  assertSentTo(target: string, predicate?: MessagePredicate<T>, description?: string): CapturedMessage<T>;

  /** Assert that a message was received */
  assertReceived(predicate: MessagePredicate<T>, description?: string): CapturedMessage<T>;

  /** Assert that no messages matching predicate were sent */
  assertNotSent(predicate: MessagePredicate<T>, description?: string): void;

  /** Get count of sent messages */
  getSentCount(): number;

  /** Get count of received messages */
  getReceivedCount(): number;
}

/**
 * Assertion error for transport tests
 */
export class TransportAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransportAssertionError';
  }
}

/**
 * Create a mock transport for testing
 *
 * @example
 * ```typescript
 * const transport = createMockTransport<MyMessage>();
 *
 * // Use in your code
 * transport.send({ type: 'ping' });
 *
 * // Assert in tests
 * transport.assertSent((msg) => msg.type === 'ping');
 * ```
 */
export const createMockTransport = <T = unknown>(): MockTransport<T> => {
  const sentMessages: CapturedMessage<T>[] = [];
  const receivedMessages: CapturedMessage<T>[] = [];
  let sequence = 0;
  let receiveCallback: ((message: T) => void) | null = null;

  const send = (message: T, target?: string): void => {
    const captured: CapturedMessage<T> = {
      message,
      timestamp: Date.now(),
      sequence: sequence++,
    };

    if (target !== undefined) {
      captured.target = target;
    }

    sentMessages.push(captured);
  };

  const getSentMessages = (): CapturedMessage<T>[] => {
    return [...sentMessages];
  };

  const getMessagesSentTo = (target: string): CapturedMessage<T>[] => {
    return sentMessages.filter((m) => m.target === target);
  };

  const getMessagesMatching = (
    predicate: MessagePredicate<T>
  ): CapturedMessage<T>[] => {
    return sentMessages.filter((m) => predicate(m.message));
  };

  const clear = (): void => {
    sentMessages.length = 0;
    receivedMessages.length = 0;
    sequence = 0;
  };

  const injectReceived = (message: T): void => {
    const captured: CapturedMessage<T> = {
      message,
      timestamp: Date.now(),
      sequence: sequence++,
    };
    receivedMessages.push(captured);

    if (receiveCallback) {
      receiveCallback(message);
    }
  };

  const getReceivedMessages = (): CapturedMessage<T>[] => {
    return [...receivedMessages];
  };

  const onReceive = (callback: (message: T) => void): void => {
    receiveCallback = callback;
  };

  const assertSent = (
    predicate: MessagePredicate<T>,
    description?: string
  ): CapturedMessage<T> => {
    const matching = getMessagesMatching(predicate);

    if (matching.length === 0) {
      throw new TransportAssertionError(
        `Expected a message${description ? ` (${description})` : ''} to be sent, but none was found. Total messages sent: ${sentMessages.length}`
      );
    }

    return matching[0]!;
  };

  const assertSentTo = (
    target: string,
    predicate?: MessagePredicate<T>,
    description?: string
  ): CapturedMessage<T> => {
    const sentToTarget = getMessagesSentTo(target);

    if (sentToTarget.length === 0) {
      throw new TransportAssertionError(
        `Expected a message to be sent to "${target}", but none was found. Total messages sent: ${sentMessages.length}`
      );
    }

    if (predicate) {
      const matching = sentToTarget.filter((m) => predicate(m.message));
      if (matching.length === 0) {
        throw new TransportAssertionError(
          `Expected a message${description ? ` (${description})` : ''} to be sent to "${target}", but none matched. Messages sent to target: ${sentToTarget.length}`
        );
      }
      return matching[0]!;
    }

    return sentToTarget[0]!;
  };

  const assertReceived = (
    predicate: MessagePredicate<T>,
    description?: string
  ): CapturedMessage<T> => {
    const matching = receivedMessages.filter((m) => predicate(m.message));

    if (matching.length === 0) {
      throw new TransportAssertionError(
        `Expected a message${description ? ` (${description})` : ''} to be received, but none was found. Total messages received: ${receivedMessages.length}`
      );
    }

    return matching[0]!;
  };

  const assertNotSent = (
    predicate: MessagePredicate<T>,
    description?: string
  ): void => {
    const matching = getMessagesMatching(predicate);

    if (matching.length > 0) {
      throw new TransportAssertionError(
        `Expected no messages${description ? ` (${description})` : ''} to be sent, but found ${matching.length}`
      );
    }
  };

  const getSentCount = (): number => sentMessages.length;
  const getReceivedCount = (): number => receivedMessages.length;

  return {
    send,
    getSentMessages,
    getMessagesSentTo,
    getMessagesMatching,
    clear,
    injectReceived,
    getReceivedMessages,
    onReceive,
    assertSent,
    assertSentTo,
    assertReceived,
    assertNotSent,
    getSentCount,
    getReceivedCount,
  };
};
