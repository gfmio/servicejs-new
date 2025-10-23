import type { Message, ReplyChannel, Capability } from '@actor-framework/core';
import { createPromiseReplyChannel, Ok, Err } from '@actor-framework/core';
import type { Result } from '@actor-framework/core';

/**
 * Request message with reply channel
 */
export interface RequestMessage<TRequest, TResponse, TError = Error> extends Message {
  readonly type: 'request';
  readonly request: TRequest;
  readonly replyTo: ReplyChannel<TResponse, TError>;
}

/**
 * Create a request message
 */
export const createRequest = <TRequest, TResponse, TError = Error>(
  request: TRequest,
  replyTo: ReplyChannel<TResponse, TError>
): RequestMessage<TRequest, TResponse, TError> => ({
  type: 'request',
  request,
  replyTo,
});

/**
 * Send a request and wait for reply using async/await
 */
export const sendRequest = async <TRequest, TResponse, TError = Error>(
  capability: Capability<RequestMessage<TRequest, TResponse, TError>>,
  request: TRequest
): Promise<Result<TResponse, TError>> => {
  const { channel, promise } = createPromiseReplyChannel<TResponse, TError>();
  
  capability.send(createRequest(request, channel));
  
  return promise;
};

/**
 * Helper to create a request/reply handler
 */
export const handleRequest = <TRequest, TResponse, TError = Error>(
  message: RequestMessage<TRequest, TResponse, TError>,
  handler: (request: TRequest) => Result<TResponse, TError>
): void => {
  const result = handler(message.request);
  message.replyTo.reply(result);
};

/**
 * Helper to create an async request/reply handler
 */
export const handleRequestAsync = async <TRequest, TResponse, TError = Error>(
  message: RequestMessage<TRequest, TResponse, TError>,
  handler: (request: TRequest) => Promise<Result<TResponse, TError>>
): Promise<void> => {
  try {
    const result = await handler(message.request);
    message.replyTo.reply(result);
  } catch (error) {
    message.replyTo.reply(Err(error as TError));
  }
};

/**
 * Typed request/reply capability for better ergonomics
 */
export interface RequestReplyCapability<TRequest, TResponse, TError = Error> {
  send(request: TRequest): Promise<Result<TResponse, TError>>;
}

/**
 * Wrap a capability to provide request/reply interface
 */
export const createRequestReplyCapability = <TRequest, TResponse, TError = Error>(
  capability: Capability<RequestMessage<TRequest, TResponse, TError>>
): RequestReplyCapability<TRequest, TResponse, TError> => {
  return {
    send: (request: TRequest) => sendRequest(capability, request),
  };
};
