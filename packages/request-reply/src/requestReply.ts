/**
 * @servicejs/request-reply - Request/Reply Pattern
 *
 * Type-safe request-response messaging pattern.
 * Enables RPC-style communication between components.
 */

import type { Message, Capability } from '@servicejs/core';
import { some, none, isSome, type Option } from '@servicejs/option';
import { ok, err, type Result } from '@servicejs/result';

/**
 * A request message with correlation ID and reply-to capability.
 *
 * @typeParam TRequest - The request payload type
 * @typeParam TResponse - The expected response type
 */
export interface RequestMessage<TRequest, TResponse extends Message> {
  readonly correlationId: string;
  readonly replyTo: Capability<TResponse>;
  readonly request: TRequest;
}

/**
 * A response message with correlation ID.
 *
 * @typeParam TResponse - The response payload type
 */
export interface ResponseMessage<TResponse> {
  readonly correlationId: string;
  readonly response: TResponse;
}

/**
 * Error types for request/reply operations.
 */
export type RequestReplyError =
  | { readonly type: 'TIMEOUT'; readonly correlationId: string; readonly timeoutMs: number }
  | { readonly type: 'CANCELLED'; readonly correlationId: string };

/**
 * A pending request awaiting a response.
 *
 * @typeParam TResponse - The expected response type
 */
export interface PendingRequest<TResponse> {
  /**
   * The correlation ID for this request.
   */
  readonly correlationId: string;

  /**
   * Check if a response has been received.
   */
  hasResponse(): boolean;

  /**
   * Get the response if available.
   *
   * @returns Some(response) if received, None if still pending
   */
  getResponse(): Option<TResponse>;

  /**
   * Cancel the pending request.
   */
  cancel(): void;

  /**
   * Check if the request was cancelled.
   */
  isCancelled(): boolean;
}

/**
 * Create a request/reply pair.
 *
 * @typeParam TRequest - The request payload type
 * @typeParam TResponse - The response payload type
 * @typeParam TResponseMsg - The response message type
 *
 * @param request - The request payload
 * @param responseCapability - Capability to receive the response
 * @returns Request message to send and pending request tracker
 *
 * @example
 * ```typescript
 * type GetUserRequest = { userId: string };
 * type GetUserResponse = MessageOf<'user', { name: string; email: string }>;
 *
 * const { component, capability: responseCap } = createComponent(
 *   createURN('client', 'response-handler'),
 *   { responses: new Map() },
 *   responseReducer
 * );
 *
 * const { requestMessage, pendingRequest } = createRequestReply(
 *   { userId: '123' },
 *   responseCap
 * );
 *
 * // Send request
 * serverCapability.send(requestMessage);
 *
 * // Wait for response
 * const response = pendingRequest.getResponse();
 * ```
 */
export function createRequestReply<TRequest, TResponse, TResponseMsg extends Message>(
  request: TRequest,
  responseCapability: Capability<TResponseMsg>
): {
  requestMessage: RequestMessage<TRequest, TResponseMsg>;
  pendingRequest: PendingRequest<TResponse>;
} {
  const correlationId = generateCorrelationId();
  let response: Option<TResponse> = none();
  let cancelled = false;

  const pendingRequest: PendingRequest<TResponse> = {
    correlationId,

    hasResponse(): boolean {
      return isSome(response);
    },

    getResponse(): Option<TResponse> {
      return response;
    },

    cancel(): void {
      cancelled = true;
    },

    isCancelled(): boolean {
      return cancelled;
    },
  };

  // Internal function to be called by response handler
  const setResponse = (resp: TResponse): void => {
    if (!cancelled) {
      response = some(resp);
    }
  };

  const requestMessage: RequestMessage<TRequest, TResponseMsg> = {
    correlationId,
    replyTo: responseCapability,
    request,
  };

  // Store the setter so response handler can call it
  // (This is a simplified version; in practice you'd use a registry)
  (requestMessage as any)._setResponse = setResponse;

  return { requestMessage, pendingRequest };
}

/**
 * Create a reply to a request.
 *
 * @typeParam TResponse - The response payload type
 * @typeParam TResponseMsg - The response message type
 *
 * @param requestMessage - The original request message
 * @param response - The response payload
 * @returns Response message to send back
 *
 * @example
 * ```typescript
 * const serverReducer: Reducer<ServerState, ServerMsg> = (state, msg) => {
 *   if (msg.type === 'get-user') {
 *     const user = state.users.get(msg.request.userId);
 *     const reply = createReply(msg, user);
 *     return stay(state, serverReducer, [emitTo(msg.replyTo, reply)]);
 *   }
 *   return stay(state, serverReducer);
 * };
 * ```
 */
export function createReply<TResponse, TResponseMsg extends Message>(
  requestMessage: RequestMessage<unknown, TResponseMsg>,
  response: TResponse
): ResponseMessage<TResponse> & TResponseMsg {
  return {
    correlationId: requestMessage.correlationId,
    response,
  } as ResponseMessage<TResponse> & TResponseMsg;
}

/**
 * Wait for a response with timeout.
 *
 * @typeParam TResponse - The expected response type
 *
 * @param pendingRequest - The pending request
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with response or rejects with timeout
 *
 * @example
 * ```typescript
 * const { requestMessage, pendingRequest } = createRequestReply(
 *   { userId: '123' },
 *   responseCap
 * );
 *
 * serverCap.send(requestMessage);
 *
 * try {
 *   const response = await waitForResponse(pendingRequest, 5000);
 *   console.log('Got response:', response);
 * } catch (error) {
 *   console.error('Request timed out');
 * }
 * ```
 */
export async function waitForResponse<TResponse>(
  pendingRequest: PendingRequest<TResponse>,
  timeoutMs: number
): Promise<Result<TResponse, RequestReplyError>> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const check = () => {
      if (pendingRequest.isCancelled()) {
        resolve(err({
          type: 'CANCELLED',
          correlationId: pendingRequest.correlationId,
        }));
        return;
      }

      const response = pendingRequest.getResponse();
      if (isSome(response)) {
        resolve(ok(response.value));
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(err({
          type: 'TIMEOUT',
          correlationId: pendingRequest.correlationId,
          timeoutMs,
        }));
        return;
      }

      setTimeout(check, 10);
    };

    check();
  });
}

/**
 * Generate a unique correlation ID.
 *
 * @returns A unique correlation ID
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
