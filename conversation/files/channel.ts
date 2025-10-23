import type { Result } from './result.js';

/**
 * Base message type - all messages extend this
 */
export interface Message {
  readonly type: string;
}

/**
 * Channel for sending messages (one-way communication)
 */
export interface Channel<T extends Message> {
  send(message: T): void;
}

/**
 * Reply channel for request/response patterns
 */
export interface ReplyChannel<T, E = Error> {
  reply(result: Result<T, E>): void;
}

/**
 * Create a simple channel from a send function
 */
export const createChannel = <T extends Message>(
  sendFn: (message: T) => void
): Channel<T> => {
  return { send: sendFn };
};

/**
 * Create a reply channel from a reply function
 */
export const createReplyChannel = <T, E = Error>(
  replyFn: (result: Result<T, E>) => void
): ReplyChannel<T, E> => {
  return { reply: replyFn };
};

/**
 * Create a promise-based reply channel for easier async/await usage
 */
export const createPromiseReplyChannel = <T, E = Error>(): {
  channel: ReplyChannel<T, E>;
  promise: Promise<Result<T, E>>;
} => {
  let replyFn: (result: Result<T, E>) => void;
  
  const promise = new Promise<Result<T, E>>((resolve) => {
    replyFn = resolve;
  });
  
  const channel = createReplyChannel<T, E>((result) => {
    replyFn(result);
  });
  
  return { channel, promise };
};
